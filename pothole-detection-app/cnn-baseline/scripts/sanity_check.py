"""Quick sanity-check: trains for 2 epochs and prints metrics.

Verifies that:
  1. The model trains without errors.
  2. Loss values are reported (decrease is expected but not guaranteed in 2 epochs).
  3. Validation accuracy is computed and displayed.

Usage (from cnn-baseline/):
    python -m scripts.sanity_check
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Ensure project root is on sys.path
# ---------------------------------------------------------------------------
_PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from src.config import get_config  # noqa: E402
from src.data.loader import build_data_loaders  # noqa: E402
from src.models.cnn import ModelFactory, get_model_summary  # noqa: E402
from src.training.trainer import Trainer  # noqa: E402


def main() -> None:
    """Run a 2-epoch sanity check."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s  [%(levelname)s]  %(name)s — %(message)s",
        datefmt="%H:%M:%S",
    )
    logger = logging.getLogger("sanity_check")

    logger.info("=" * 60)
    logger.info("SANITY CHECK — 2-epoch training smoke test")
    logger.info("=" * 60)

    # ---- Config ----
    cfg = get_config()

    # ---- Data loaders (small batch for speed) ----
    processed_dir = Path(_PROJECT_ROOT) / cfg.dataset["processed_dir"]
    image_size: int = cfg.preprocessing.get("image_size", 224)
    # Use a smaller batch size for the sanity check to keep it fast.
    batch_size: int = min(cfg.training.get("batch_size", 32), 16)

    train_loader, val_loader, _test_loader = build_data_loaders(
        processed_dir=processed_dir,
        image_size=image_size,
        batch_size=batch_size,
        num_workers=0,
    )

    logger.info(
        "Train samples=%d  |  Val samples=%d",
        len(train_loader.dataset),
        len(val_loader.dataset),
    )

    # ---- Model ----
    model = ModelFactory.create_model(cfg.raw)
    summary = get_model_summary(model)
    logger.info(
        "Model: %s  |  trainable_params=%s",
        summary["architecture"],
        f'{summary["trainable_params"]:,}',
    )

    # ---- Trainer ----
    trainer = Trainer(
        model=model,
        train_loader=train_loader,
        val_loader=val_loader,
        config=cfg.raw,
    )

    # ---- Train for 2 epochs ----
    history = trainer.fit(num_epochs=2)

    # ---- Verify results ----
    logger.info("=" * 60)
    logger.info("SANITY CHECK RESULTS")
    logger.info("=" * 60)

    train_losses = history["train_loss"]
    val_losses = history["val_loss"]
    val_accs = history["val_accuracy"]

    for i in range(len(train_losses)):
        logger.info(
            "  Epoch %d  |  train_loss=%.4f  |  val_loss=%.4f  |  val_acc=%.2f%%",
            i + 1,
            train_losses[i],
            val_losses[i],
            val_accs[i],
        )

    # Basic assertions
    all_ok = True
    if len(train_losses) != 2:
        logger.error("FAIL: Expected 2 training loss values, got %d", len(train_losses))
        all_ok = False
    if len(val_accs) != 2:
        logger.error("FAIL: Expected 2 val accuracy values, got %d", len(val_accs))
        all_ok = False
    if any(v < 0.0 or v > 100.0 for v in val_accs):
        logger.error("FAIL: Validation accuracy out of [0, 100] range")
        all_ok = False
    if any(l < 0.0 for l in train_losses):
        logger.error("FAIL: Negative training loss detected")
        all_ok = False

    if all_ok:
        logger.info("✓  All sanity checks PASSED.")
    else:
        logger.error("✗  Some sanity checks FAILED — see errors above.")
        sys.exit(1)


if __name__ == "__main__":
    main()
