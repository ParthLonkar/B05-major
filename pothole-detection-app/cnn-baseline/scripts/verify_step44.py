"""Step 4.4 verification: loss_curves.png, metric_curves.png, lr_curve.png.

Usage (from cnn-baseline/):
    python -m scripts.verify_step44
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
_PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from src.config import get_config  # noqa: E402
from src.data.loader import build_data_loaders  # noqa: E402
from src.models.cnn import ModelFactory  # noqa: E402
from src.training.trainer import Trainer  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  [%(levelname)s]  %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("verify_step44")

_PLOT_DIR = Path(_PROJECT_ROOT) / "outputs" / "plots"
_LOSS_PLOT = _PLOT_DIR / "loss_curves.png"
_METRIC_PLOT = _PLOT_DIR / "metric_curves.png"
_LR_PLOT = _PLOT_DIR / "lr_curve.png"


def _clean_plots() -> None:
    """Remove old plot files so test starts fresh."""
    for p in (_LOSS_PLOT, _METRIC_PLOT, _LR_PLOT):
        if p.exists():
            p.unlink()
            logger.info("Cleaned: %s", p)


def main() -> None:
    logger.info("=" * 60)
    logger.info("TEST: Run 2 epochs → Verify Training Visualization Plots")
    logger.info("=" * 60)

    _clean_plots()

    # ---- Config ----
    cfg = get_config()

    # ---- Data loaders ----
    processed_dir = Path(_PROJECT_ROOT) / cfg.dataset["processed_dir"]
    image_size = cfg.preprocessing.get("image_size", 224)
    batch_size = min(cfg.training.get("batch_size", 32), 16)  # keep small

    train_loader, val_loader, _ = build_data_loaders(
        processed_dir=processed_dir,
        image_size=image_size,
        batch_size=batch_size,
        num_workers=0,
    )

    # ---- Model ----
    model = ModelFactory.create_model(cfg.raw)

    # ---- Trainer ----
    trainer = Trainer(
        model=model,
        train_loader=train_loader,
        val_loader=val_loader,
        config=cfg.raw,
    )

    # ---- Fit for 2 epochs ----
    trainer.fit(num_epochs=2)

    # ---- Verification ----
    logger.info("=" * 60)
    logger.info("VERIFICATION RESULTS")
    logger.info("=" * 60)

    all_ok = True

    # 1. Check generated plots
    if _LOSS_PLOT.exists():
        logger.info("✓  loss_curves.png successfully generated (%d bytes)", _LOSS_PLOT.stat().st_size)
    else:
        logger.error("✗  loss_curves.png NOT found at %s", _LOSS_PLOT)
        all_ok = False

    if _METRIC_PLOT.exists():
        logger.info("✓  metric_curves.png successfully generated (%d bytes)", _METRIC_PLOT.stat().st_size)
    else:
        logger.error("✗  metric_curves.png NOT found at %s", _METRIC_PLOT)
        all_ok = False

    if _LR_PLOT.exists():
        logger.info("✓  lr_curve.png successfully generated (%d bytes)", _LR_PLOT.stat().st_size)
    else:
        logger.error("✗  lr_curve.png NOT found at %s", _LR_PLOT)
        all_ok = False

    if all_ok:
        logger.info("✓  All Step 4.4 plot verifications PASSED.")
    else:
        logger.error("✗  Some Step 4.4 plot verifications FAILED.")
        sys.exit(1)


if __name__ == "__main__":
    main()
