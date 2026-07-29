"""CLI entry-point for training the CNN on a small Kaggle-only mini dataset.

Creates a temporary classification dataset by randomly sampling images from
the Kaggle YOLO dataset, then launches the existing training pipeline using
the exact same Trainer, Model, Optimizer, Loss, Scheduler, Transforms, and
Augmentations as the full training run.

This enables a fair comparison of CNN (MobileNetV2) vs YOLOv8 vs YOLOv11
using images drawn from the identical source dataset.

Usage (from the cnn-baseline/ directory):
    python -m scripts.train_mini                          # defaults: 20/20 train, 5/5 val, 10/10 test
    python -m scripts.train_mini --epochs 10              # override epoch count
    python -m scripts.train_mini --seed 123               # different random seed
    python -m scripts.train_mini --train-normal 30        # custom sample sizes
    python -m scripts.train_mini --batch-size 8           # smaller batch for tiny dataset
"""

from __future__ import annotations

import argparse
import logging
import random
import shutil
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Tuple

# ---------------------------------------------------------------------------
# Ensure the project root (cnn-baseline/) is on sys.path so that
# ``from src.…`` imports resolve correctly regardless of cwd.
# ---------------------------------------------------------------------------
_PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from src.config import get_config  # noqa: E402  (only needs PyYAML, no torch)

# NOTE: torch-dependent imports (build_data_loaders, ModelFactory, Trainer)
# are deferred to launch_training() so that dataset generation steps
# (discover → sample → build → summary) work without PyTorch installed.

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Path constants
# ---------------------------------------------------------------------------
_KAGGLE_ROOT = (
    _PROJECT_ROOT.parent / "datasets" / "kaggle_potholes"
)
_MINI_PROCESSED_DIR = _PROJECT_ROOT / "data" / "processed_mini"

# Supported image extensions
_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp"}

# Map Kaggle subfolder names → CNN class names
_CLASS_NAME_MAP = {"normal": "normal", "potholes": "pothole"}


# ===================================================================
# 1. Discover Kaggle images
# ===================================================================

def discover_kaggle_images(
    kaggle_root: Path = _KAGGLE_ROOT,
) -> Dict[str, List[Path]]:
    """Scan the Kaggle dataset and return image paths grouped by class.

    The Kaggle dataset stores images under ``images/<split>/<class>/``.
    This function flattens all splits into per-class pools because:
      • ``val/normal/`` does not exist in the Kaggle dataset.
      • We need to draw normal validation and test images from ``train/normal/``.

    The subfolder name ``potholes/`` is mapped to the CNN class ``pothole``.

    Args:
        kaggle_root: Root directory of the Kaggle YOLO dataset.

    Returns:
        Dictionary mapping CNN class name → sorted list of image paths.
        Example: ``{"normal": [...], "pothole": [...]}``.

    Raises:
        FileNotFoundError: If the Kaggle images directory does not exist.
    """
    images_root = kaggle_root / "images"
    if not images_root.is_dir():
        raise FileNotFoundError(
            f"Kaggle images directory not found: {images_root}"
        )

    class_pools: Dict[str, List[Path]] = {"normal": [], "pothole": []}

    # Walk through every split (train/, val/) and every class subfolder
    for split_dir in sorted(images_root.iterdir()):
        if not split_dir.is_dir():
            continue
        for class_dir in sorted(split_dir.iterdir()):
            if not class_dir.is_dir():
                continue
            # Map Kaggle folder name → CNN class name
            cnn_class = _CLASS_NAME_MAP.get(class_dir.name)
            if cnn_class is None:
                logger.warning(
                    "Skipping unknown class folder: %s", class_dir
                )
                continue
            for img_path in sorted(class_dir.iterdir()):
                if img_path.suffix.lower() in _IMAGE_EXTENSIONS:
                    class_pools[cnn_class].append(img_path)

    for cls, paths in class_pools.items():
        logger.info(
            "Discovered %d '%s' images across all Kaggle splits.", len(paths), cls
        )

    return class_pools


# ===================================================================
# 2. Sample dataset
# ===================================================================

def sample_dataset(
    class_pools: Dict[str, List[Path]],
    train_normal: int = 20,
    train_pothole: int = 20,
    val_normal: int = 5,
    val_pothole: int = 5,
    test_normal: int = 10,
    test_pothole: int = 10,
    seed: int = 42,
) -> Dict[str, Dict[str, List[Path]]]:
    """Randomly sample non-overlapping train/val/test splits from class pools.

    Uses a seeded ``random.Random`` instance for full reproducibility.
    Images are drawn sequentially from a shuffled pool so no image
    can appear in more than one split.

    Args:
        class_pools: Per-class image path lists (output of ``discover_kaggle_images``).
        train_normal:  Number of normal images for training.
        train_pothole: Number of pothole images for training.
        val_normal:    Number of normal images for validation.
        val_pothole:   Number of pothole images for validation.
        test_normal:   Number of normal images for testing.
        test_pothole:  Number of pothole images for testing.
        seed:          Random seed for reproducibility.

    Returns:
        Nested dictionary: ``{split: {class_name: [paths]}}``.

    Raises:
        ValueError: If the requested sample size exceeds the available pool.
    """
    rng = random.Random(seed)

    # Requested counts per class: (train, val, test)
    requests = {
        "normal":  (train_normal, val_normal, test_normal),
        "pothole": (train_pothole, val_pothole, test_pothole),
    }

    selections: Dict[str, Dict[str, List[Path]]] = {
        "train": {"normal": [], "pothole": []},
        "val":   {"normal": [], "pothole": []},
        "test":  {"normal": [], "pothole": []},
    }

    for cls, (n_train, n_val, n_test) in requests.items():
        pool = list(class_pools[cls])  # shallow copy to avoid mutating input
        total_needed = n_train + n_val + n_test

        if total_needed > len(pool):
            raise ValueError(
                f"Requested {total_needed} '{cls}' images "
                f"(train={n_train} + val={n_val} + test={n_test}) "
                f"but only {len(pool)} are available in the Kaggle dataset."
            )

        # Shuffle the pool deterministically, then slice sequentially
        rng.shuffle(pool)
        offset = 0
        selections["train"][cls] = pool[offset : offset + n_train]
        offset += n_train
        selections["val"][cls] = pool[offset : offset + n_val]
        offset += n_val
        selections["test"][cls] = pool[offset : offset + n_test]

    return selections


# ===================================================================
# 3. Build the processed mini dataset on disk
# ===================================================================

def build_processed_dataset(
    selections: Dict[str, Dict[str, List[Path]]],
    output_dir: Path = _MINI_PROCESSED_DIR,
) -> Path:
    """Create the CNN classification folder structure and copy selected images.

    If ``output_dir`` already exists it is deleted first to guarantee a
    clean state.  Images are copied with ``shutil.copy2()`` to preserve
    original metadata and filenames.

    Args:
        selections: Nested dict ``{split: {class: [paths]}}`` from ``sample_dataset``.
        output_dir: Destination root (e.g. ``data/processed_mini/``).

    Returns:
        The resolved output directory path.
    """
    output_dir = output_dir.resolve()

    # Clean any previous mini dataset
    if output_dir.exists():
        logger.info("Removing previous mini dataset at: %s", output_dir)
        shutil.rmtree(output_dir)

    # Create the full directory tree for every split × class combination
    splits = ["train", "val", "test"]
    classes = ["normal", "pothole"]
    for split in splits:
        for cls in classes:
            (output_dir / split / cls).mkdir(parents=True, exist_ok=True)

    # Copy images
    copied_count = 0
    for split in splits:
        for cls in classes:
            dest_folder = output_dir / split / cls
            for img_path in selections.get(split, {}).get(cls, []):
                dest_path = dest_folder / img_path.name
                shutil.copy2(img_path, dest_path)
                copied_count += 1

    logger.info(
        "Mini dataset built at %s — %d images copied.", output_dir, copied_count
    )
    return output_dir


# ===================================================================
# 4. Print dataset summary
# ===================================================================

def print_dataset_summary(
    selections: Dict[str, Dict[str, List[Path]]],
    seed: int,
) -> None:
    """Print a human-readable summary of the sampled mini dataset.

    Args:
        selections: The nested selection dict from ``sample_dataset``.
        seed: The random seed used for sampling.
    """
    total = 0
    lines: List[str] = []

    lines.append("=" * 48)
    lines.append("          Mini Dataset Summary")
    lines.append("=" * 48)

    for split in ("train", "val", "test"):
        split_data = selections.get(split, {})
        n_normal  = len(split_data.get("normal", []))
        n_pothole = len(split_data.get("pothole", []))
        split_total = n_normal + n_pothole
        total += split_total

        lines.append("")
        lines.append(f"  {split.capitalize()}")
        lines.append(f"    Normal  : {n_normal}")
        lines.append(f"    Pothole : {n_pothole}")

    lines.append("")
    lines.append(f"  Total Images : {total}")
    lines.append(f"  Random Seed  : {seed}")
    lines.append("=" * 48)

    summary_text = "\n".join(lines)
    print(summary_text)
    logger.info("Dataset summary:\n%s", summary_text)


# ===================================================================
# 5. Launch training
# ===================================================================

def launch_training(
    processed_dir: Path,
    epochs: int | None = None,
    batch_size: int | None = None,
    run_id: str | None = None,
    config_path: str | None = None,
) -> Dict[str, Any]:
    """Load configuration, build components, and run the training pipeline.

    This function replicates the workflow of ``scripts/train.py`` but
    points the data loaders at ``processed_dir`` (the mini dataset)
    instead of the default ``data/processed/``.

    No existing source files are modified — the config ``processed_dir``
    is overridden **in memory only**.

    Args:
        processed_dir: Path to the mini processed dataset.
        epochs:        Override epoch count (``None`` → use config default).
        batch_size:    Override batch size (``None`` → use config default).
        run_id:        Explicit experiment run name (``None`` → auto-generate).
        config_path:   Path to config.yaml (``None`` → default).

    Returns:
        The training history dictionary from ``Trainer.fit()``.
    """
    # Lazy imports — these require PyTorch to be installed
    from src.data.loader import build_data_loaders
    from src.models.cnn import ModelFactory, get_model_summary
    from src.training.trainer import Trainer

    import json

    # ---- Load config ----
    cfg = get_config(config_path)

    # ---- Experiment run directory ----
    if run_id is None:
        run_id = f"run_{datetime.now().strftime('%Y-%m-%d_%H%M%S')}_kaggle_mini"
    run_dir = _PROJECT_ROOT / "experiments" / run_id
    run_dir.mkdir(parents=True, exist_ok=True)

    # Copy config file into the experiment directory for reproducibility
    src_config = Path(config_path) if config_path else (_PROJECT_ROOT / "configs" / "config.yaml")
    shutil.copy2(src_config, run_dir / "config.yaml")
    logger.info("Created experiment directory: %s", run_dir)

    # Save dataset info for traceability
    dataset_info = (
        "Dataset Information\n"
        "-------------------\n"
        "Dataset Version: Kaggle Mini Subset\n"
        f"Source: {_KAGGLE_ROOT}\n"
        f"Processed Dir: {processed_dir}\n"
        "Purpose: Fair comparison between CNN, YOLOv8, and YOLOv11\n"
    )
    (run_dir / "dataset_info.txt").write_text(dataset_info, encoding="utf-8")

    # Add file handler so logs are also written to the experiment directory
    file_handler = logging.FileHandler(
        run_dir / "training.log", encoding="utf-8"
    )
    file_handler.setFormatter(
        logging.Formatter(
            "%(asctime)s  [%(levelname)s]  %(name)s — %(message)s",
            datefmt="%H:%M:%S",
        )
    )
    logging.getLogger().addHandler(file_handler)

    # ---- Override output directories to point inside the run directory ----
    cfg.raw["outputs"]["model_dir"]   = str(run_dir / "models")
    cfg.raw["outputs"]["plot_dir"]    = str(run_dir / "plots")
    cfg.raw["outputs"]["metrics_dir"] = str(run_dir / "metrics")

    # ---- Build data loaders (pointing at mini dataset) ----
    image_size: int = cfg.preprocessing.get("image_size", 224)
    bs: int = batch_size if batch_size is not None else cfg.training.get("batch_size", 32)

    train_loader, val_loader, _test_loader = build_data_loaders(
        processed_dir=processed_dir,
        image_size=image_size,
        batch_size=bs,
        num_workers=0,
    )
    logger.info(
        "Data loaders ready  |  train=%d batches  |  val=%d batches",
        len(train_loader),
        len(val_loader),
    )

    # ---- Build model ----
    model = ModelFactory.create_model(cfg.raw)
    summary = get_model_summary(model)
    logger.info(
        "Model: %s  |  trainable=%s  |  total=%s  |  ~%.1f MB",
        summary["architecture"],
        f'{summary["trainable_params"]:,}',
        f'{summary["total_params"]:,}',
        summary["estimated_size_mb"],
    )

    # ---- Build Trainer ----
    trainer = Trainer(
        model=model,
        train_loader=train_loader,
        val_loader=val_loader,
        config=cfg.raw,
    )

    # ---- Train ----
    history = trainer.fit(num_epochs=epochs)

    # ---- Final summary ----
    logger.info("=" * 60)
    logger.info("Training finished — final metrics:")
    logger.info("  Last train_loss : %.4f", history["train_loss"][-1])
    logger.info("  Last val_loss   : %.4f", history["val_loss"][-1])
    logger.info("  Last val_acc    : %.2f%%", history["val_accuracy"][-1])
    logger.info("  Last LR         : %.1e", history["learning_rate"][-1])
    logger.info("  Experiment dir  : %s", run_dir)
    logger.info("=" * 60)

    return history


# ===================================================================
# CLI
# ===================================================================

def _build_parser() -> argparse.ArgumentParser:
    """Construct the argument parser with all supported options."""
    parser = argparse.ArgumentParser(
        description=(
            "Train the pothole classification CNN on a small Kaggle-only "
            "mini dataset for fair CNN vs YOLO comparison."
        ),
    )
    parser.add_argument(
        "--config", type=str, default=None,
        help="Path to config.yaml (default: configs/config.yaml).",
    )

    # ---- Sample size overrides ----
    grp = parser.add_argument_group("Sample sizes")
    grp.add_argument(
        "--train-normal", type=int, default=20,
        help="Number of normal images for training (default: 20).",
    )
    grp.add_argument(
        "--train-pothole", type=int, default=20,
        help="Number of pothole images for training (default: 20).",
    )
    grp.add_argument(
        "--val-normal", type=int, default=5,
        help="Number of normal images for validation (default: 5).",
    )
    grp.add_argument(
        "--val-pothole", type=int, default=5,
        help="Number of pothole images for validation (default: 5).",
    )
    grp.add_argument(
        "--test-normal", type=int, default=10,
        help="Number of normal images for testing (default: 10).",
    )
    grp.add_argument(
        "--test-pothole", type=int, default=10,
        help="Number of pothole images for testing (default: 10).",
    )

    # ---- Training overrides ----
    grp2 = parser.add_argument_group("Training overrides")
    grp2.add_argument(
        "--epochs", type=int, default=None,
        help="Override the epoch count from config.yaml.",
    )
    grp2.add_argument(
        "--batch-size", type=int, default=None,
        help="Override the batch size from config.yaml.",
    )
    grp2.add_argument(
        "--seed", type=int, default=42,
        help="Random seed for reproducible sampling (default: 42).",
    )
    grp2.add_argument(
        "--run-id", type=str, default=None,
        help="Explicit experiment run directory name.",
    )

    return parser


def main() -> None:
    """Orchestrate mini dataset creation and CNN training."""
    args = _build_parser().parse_args()

    # ---- Logging setup ----
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s  [%(levelname)s]  %(name)s — %(message)s",
        datefmt="%H:%M:%S",
    )

    logger.info("=" * 60)
    logger.info("CNN POTHOLE CLASSIFIER — KAGGLE MINI TRAINING")
    logger.info("=" * 60)

    # ---- Step 1: Discover available images ----
    logger.info("Step 1/4: Discovering Kaggle dataset images...")
    class_pools = discover_kaggle_images()

    # ---- Step 2: Sample the mini dataset ----
    logger.info("Step 2/4: Sampling mini dataset (seed=%d)...", args.seed)
    selections = sample_dataset(
        class_pools=class_pools,
        train_normal=args.train_normal,
        train_pothole=args.train_pothole,
        val_normal=args.val_normal,
        val_pothole=args.val_pothole,
        test_normal=args.test_normal,
        test_pothole=args.test_pothole,
        seed=args.seed,
    )

    # ---- Step 3: Build the on-disk dataset ----
    logger.info("Step 3/4: Building processed_mini/ dataset...")
    processed_dir = build_processed_dataset(selections)

    # ---- Step 4: Print summary and launch training ----
    print_dataset_summary(selections, seed=args.seed)

    logger.info("Step 4/4: Launching training pipeline...")
    launch_training(
        processed_dir=processed_dir,
        epochs=args.epochs,
        batch_size=args.batch_size,
        run_id=args.run_id,
        config_path=args.config,
    )


if __name__ == "__main__":
    main()
