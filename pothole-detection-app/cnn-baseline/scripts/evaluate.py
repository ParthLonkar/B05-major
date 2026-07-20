"""CLI entry-point for evaluating the trained CNN on the held-out test split.

Usage (from the cnn-baseline/ directory):
    python -m scripts.evaluate                                          # auto-detect latest run
    python -m scripts.evaluate --run experiments/run_2026-07-17_213534  # explicit run directory
    python -m scripts.evaluate --checkpoint path/to/best_model.pth      # explicit checkpoint
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
from src.evaluation.evaluator import TestEvaluator  # noqa: E402


def _setup_logging() -> None:
    """Configure root logger with a readable console format."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s  [%(levelname)s]  %(name)s — %(message)s",
        datefmt="%H:%M:%S",
    )


def _resolve_run_dir(explicit_run: str | None) -> Path:
    """Determine the experiment run directory.

    If *explicit_run* is given, use it directly.  Otherwise, auto-detect the
    most recently created ``run_*`` subdirectory under ``experiments/``.

    Args:
        explicit_run: Optional path string provided via ``--run``.

    Returns:
        Resolved ``Path`` to the experiment run directory.

    Raises:
        FileNotFoundError: If no run directory can be resolved.
    """
    if explicit_run is not None:
        run_dir = Path(explicit_run)
        if not run_dir.is_absolute():
            run_dir = _PROJECT_ROOT / run_dir
        if run_dir.is_dir():
            return run_dir.resolve()
        raise FileNotFoundError(f"Specified run directory not found: {run_dir}")

    experiments_dir = _PROJECT_ROOT / "experiments"
    if not experiments_dir.is_dir():
        raise FileNotFoundError(
            f"Experiments directory not found: {experiments_dir}"
        )

    run_dirs = sorted(
        [d for d in experiments_dir.iterdir() if d.is_dir() and d.name.startswith("run_")],
        key=lambda d: d.name,
        reverse=True,
    )
    if not run_dirs:
        raise FileNotFoundError(
            "No run_* directories found under experiments/. "
            "Have you trained a model yet?"
        )

    return run_dirs[0].resolve()


def _resolve_checkpoint(run_dir: Path, explicit_checkpoint: str | None) -> Path:
    """Determine the checkpoint file to load.

    Priority:
        1. ``--checkpoint`` CLI argument (if provided).
        2. ``best_model.pth`` inside *run_dir/models/*.

    Args:
        run_dir: The resolved experiment run directory.
        explicit_checkpoint: Optional checkpoint path from CLI.

    Returns:
        Absolute path to the ``.pth`` file.

    Raises:
        FileNotFoundError: If no usable checkpoint is found.
    """
    if explicit_checkpoint is not None:
        ckpt = Path(explicit_checkpoint)
        if not ckpt.is_absolute():
            ckpt = _PROJECT_ROOT / ckpt
        if ckpt.is_file():
            return ckpt.resolve()
        raise FileNotFoundError(f"Specified checkpoint not found: {ckpt}")

    best = run_dir / "models" / "best_model.pth"
    if best.is_file():
        return best.resolve()

    raise FileNotFoundError(
        f"best_model.pth not found in {run_dir / 'models'}. "
        "Provide an explicit --checkpoint path."
    )


def main() -> None:
    """Parse CLI args, build evaluation components, and run evaluation."""
    parser = argparse.ArgumentParser(
        description="Evaluate the trained CNN model on the held-out test set."
    )
    parser.add_argument(
        "--config",
        type=str,
        default=None,
        help="Path to config.yaml (default: configs/config.yaml).",
    )
    parser.add_argument(
        "--run",
        type=str,
        default=None,
        help=(
            "Path to a specific experiment run directory "
            "(default: latest run_* under experiments/)."
        ),
    )
    parser.add_argument(
        "--checkpoint",
        type=str,
        default=None,
        help="Path to a .pth checkpoint (default: <run>/models/best_model.pth).",
    )
    args = parser.parse_args()

    _setup_logging()
    logger = logging.getLogger(__name__)

    logger.info("=" * 60)
    logger.info("CNN POTHOLE CLASSIFIER — TEST SET EVALUATION")
    logger.info("=" * 60)

    # ---- Resolve run directory and checkpoint ----
    run_dir = _resolve_run_dir(args.run)
    checkpoint_path = _resolve_checkpoint(run_dir, args.checkpoint)
    logger.info("Experiment run : %s", run_dir)
    logger.info("Checkpoint     : %s", checkpoint_path)

    # ---- Configuration ----
    config_path = args.config or str(run_dir / "config.yaml")
    cfg = get_config(config_path)

    # ---- Device selection ----
    import torch

    cfg_device: str = cfg.project.get("device", "cpu")
    if cfg_device == "cuda" and not torch.cuda.is_available():
        logger.warning(
            "Config requests CUDA but no GPU detected — falling back to CPU."
        )
        cfg_device = "cpu"
    device = torch.device(cfg_device)
    logger.info("Evaluation device: %s", device)

    # ---- Build test DataLoader ----
    processed_dir = Path(_PROJECT_ROOT) / cfg.dataset["processed_dir"]
    image_size: int = cfg.preprocessing.get("image_size", 224)
    batch_size: int = cfg.training.get("batch_size", 32)

    _, _, test_loader = build_data_loaders(
        processed_dir=processed_dir,
        image_size=image_size,
        batch_size=batch_size,
        num_workers=0,
    )
    logger.info(
        "Test DataLoader  |  samples=%d  |  batches=%d",
        len(test_loader.dataset),
        len(test_loader),
    )

    # ---- Build model ----
    model = ModelFactory.create_model(cfg.raw)
    summary = get_model_summary(model)
    logger.info(
        "Model: %s  |  total_params=%s  |  ~%.1f MB",
        summary["architecture"],
        f'{summary["total_params"]:,}',
        summary["estimated_size_mb"],
    )

    # ---- Evaluator ----
    evaluator = TestEvaluator(
        model=model,
        test_loader=test_loader,
        device=device,
    )

    # ---- Load checkpoint ----
    evaluator.load_checkpoint(checkpoint_path)

    # ---- Run evaluation ----
    results = evaluator.run()

    # ---- Generate artifacts (plots + classification report) ----
    eval_output_dir = run_dir / "evaluation"
    artifacts = evaluator.generate_artifacts(eval_output_dir)

    # ---- Save results (evaluation_summary.json) ----
    json_path = evaluator.save_results(eval_output_dir)

    # ---- Final summary ----
    cm = results.get("confusion_matrix", {})
    logger.info("=" * 60)
    logger.info("EVALUATION COMPLETE")
    logger.info("  Test Loss     : %.4f", results["test_loss"])
    logger.info("  Accuracy      : %.2f%%", results["accuracy"])
    logger.info("  Precision     : %.2f%%", results["precision"])
    logger.info("  Recall        : %.2f%%", results["recall"])
    logger.info("  F1 Score      : %.2f%%", results["f1"])
    logger.info("  ROC-AUC       : %.4f", results.get("roc_auc", 0.0))
    logger.info(
        "  Confusion     : TP=%d  TN=%d  FP=%d  FN=%d",
        cm.get("TP", 0),
        cm.get("TN", 0),
        cm.get("FP", 0),
        cm.get("FN", 0),
    )
    logger.info("  Samples       : %d", results["num_samples"])
    logger.info("  Inference Time: %.2fs", results["inference_time_seconds"])
    logger.info("  Results saved : %s", json_path)
    logger.info("  Artifacts     :")
    for name, path in artifacts.items():
        logger.info("    %s → %s", name, path.name)
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
