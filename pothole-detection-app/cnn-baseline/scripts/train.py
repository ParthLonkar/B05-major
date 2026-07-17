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
    args = parser.parse_args()

    _setup_logging()
    logger = logging.getLogger(__name__)

    # ---- Load configuration ----
    cfg = get_config(args.config)
    logger.info("Loaded configuration from: %s", args.config or "configs/config.yaml")

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
