"""CLI entry-point for training the pothole classification CNN.

Usage (from the cnn-baseline/ directory):
    python -m scripts.train                                # uses default configs/config.yaml
    python -m scripts.train --config path/to.yaml          # custom config
    python -m scripts.train --epochs 5                     # override epoch count
    python -m scripts.train --resume outputs/models/last_checkpoint.pth  # resume
"""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Ensure the project root (cnn-baseline/) is on sys.path so that
# ``from src.…`` imports resolve correctly regardless of cwd.
# ---------------------------------------------------------------------------
_PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from src.config import get_config  # noqa: E402
from src.data.loader import build_data_loaders  # noqa: E402
from src.models.cnn import ModelFactory, get_model_summary  # noqa: E402
from src.training.trainer import Trainer  # noqa: E402


def _setup_logging() -> None:
    """Configure root logger with a readable console format."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s  [%(levelname)s]  %(name)s — %(message)s",
        datefmt="%H:%M:%S",
    )


def main() -> None:
    """Parse CLI args, build components from config, and launch training."""
    parser = argparse.ArgumentParser(
        description="Train the pothole classification CNN model."
    )
    parser.add_argument(
        "--config",
        type=str,
        default=None,
        help="Path to config.yaml (default: configs/config.yaml).",
    )
    parser.add_argument(
        "--epochs",
        type=int,
        default=None,
        help="Override the epoch count in config.yaml.",
    )
    parser.add_argument(
        "--resume",
        type=str,
        default=None,
        help="Path to a checkpoint (.pth) to resume training from.",
    )
    parser.add_argument(
        "--run_id",
        type=str,
        default=None,
        help="Explicitly name the experiment run directory.",
    )
    args = parser.parse_args()

    _setup_logging()
    logger = logging.getLogger(__name__)

    # ---- Setup Experiment Run ----
    from datetime import datetime
    import shutil

    config_path = args.config or "configs/config.yaml"
    cfg = get_config(config_path)

    if args.resume:
        resume_path = Path(args.resume).resolve()
        # Grandparent directory of the checkpoint is the experiment run folder
        run_dir = resume_path.parent.parent
        run_id = run_dir.name
        logger.info("Resuming training in existing experiment directory: %s", run_dir)
    else:
        import json
        suffix = ""
        dataset_info_str = ""
        stats_path = Path(_PROJECT_ROOT) / "outputs" / "metrics" / "integrated_dataset_statistics.json"
        if stats_path.is_file():
            suffix = "_dataset_merge_v1"
            try:
                with open(stats_path, "r", encoding="utf-8") as fh:
                    stats = json.load(fh)
                dataset_info_str = (
                    "Dataset Information\n"
                    "-------------------\n"
                    "Dataset Version: Dataset Merge V1\n"
                    f"Total Images: {stats['overall']['total_images']:,}\n"
                    f"Training Images: {stats['final_distribution']['train']['total']:,}\n"
                    f"Validation Images: {stats['final_distribution']['val']['total']:,}\n"
                    f"Test Images: {stats['final_distribution']['test']['total']:,}\n"
                    f"Positive Class: {stats['overall']['pothole_images']:,}\n"
                    f"Negative Class: {stats['overall']['normal_images']:,}\n"
                    "Source Datasets:\n"
                    "  - Kaggle Potholes\n"
                    "  - RDD2022"
                )
            except Exception as e:
                logger.warning("Failed to parse integrated dataset statistics: %s", e)
                
        if args.run_id:
            run_id = args.run_id
        else:
            run_id = f"run_{datetime.now().strftime('%Y-%m-%d_%H%M%S')}{suffix}"
        run_dir = Path(_PROJECT_ROOT) / "experiments" / run_id
        run_dir.mkdir(parents=True, exist_ok=True)
        
        # Copy configuration file for reproducibility
        shutil.copy2(config_path, run_dir / "config.yaml")
        logger.info("Created new experiment run directory: %s", run_dir)
        
        # Save and log dataset info if available
        if dataset_info_str:
            with open(run_dir / "dataset_info.txt", "w", encoding="utf-8") as fh:
                fh.write(dataset_info_str + "\n")
            logger.info("\n============================================================\n" + dataset_info_str + "\n============================================================\n")

    # Add dynamic file handler to redirect logs to training.log in the run folder
    file_handler = logging.FileHandler(run_dir / "training.log", encoding="utf-8")
    file_handler.setFormatter(
        logging.Formatter("%(asctime)s  [%(levelname)s]  %(name)s — %(message)s", datefmt="%H:%M:%S")
    )
    logging.getLogger().addHandler(file_handler)

    # Override directories at runtime to point inside the run directory
    cfg.raw["outputs"]["model_dir"] = str(run_dir / "models")
    cfg.raw["outputs"]["plot_dir"] = str(run_dir / "plots")
    cfg.raw["outputs"]["metrics_dir"] = str(run_dir / "metrics")

    # ---- Build data loaders ----
    processed_dir = Path(_PROJECT_ROOT) / cfg.dataset["processed_dir"]
    image_size: int = cfg.preprocessing.get("image_size", 224)
    batch_size: int = cfg.training.get("batch_size", 32)

    train_loader, val_loader, _test_loader = build_data_loaders(
        processed_dir=processed_dir,
        image_size=image_size,
        batch_size=batch_size,
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

    # ---- Resume from checkpoint (if requested) ----
    if args.resume:
        trainer.resume(args.resume)

    # ---- Train ----
    num_epochs = args.epochs  # None → Trainer uses config default
    history = trainer.fit(num_epochs=num_epochs)

    # ---- Final summary ----
    logger.info("=" * 60)
    logger.info("Training finished — final metrics:")
    logger.info("  Last train_loss : %.4f", history["train_loss"][-1])
    logger.info("  Last val_loss   : %.4f", history["val_loss"][-1])
    logger.info("  Last val_acc    : %.2f%%", history["val_accuracy"][-1])
    logger.info("  Last LR         : %.1e", history["learning_rate"][-1])
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
