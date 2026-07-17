"""Step 4.3 verification: accuracy, precision, recall, f1, CSV/JSON metrics logs.

Usage (from cnn-baseline/):
    python -m scripts.verify_step43
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
logger = logging.getLogger("verify_step43")

_METRICS_DIR = Path(_PROJECT_ROOT) / "outputs" / "metrics"
_CSV_PATH = _METRICS_DIR / "metrics.csv"
_JSON_PATH = _METRICS_DIR / "metrics.json"


def _clean_metrics() -> None:
    """Remove old metrics files so test starts fresh."""
    for p in (_CSV_PATH, _JSON_PATH):
        if p.exists():
            p.unlink()
            logger.info("Cleaned: %s", p)


def main() -> None:
    logger.info("=" * 60)
    logger.info("TEST: Run 2 epochs → Verify Metrics & Evaluation Logging")
    logger.info("=" * 60)

    _clean_metrics()

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
    history = trainer.fit(num_epochs=2)

    # ---- Verification ----
    logger.info("=" * 60)
    logger.info("VERIFICATION RESULTS")
    logger.info("=" * 60)

    all_ok = True

    # 1. Check history dictionary structure
    expected_keys = {
        "epoch",
        "train_loss",
        "val_loss",
        "val_accuracy",
        "val_precision",
        "val_recall",
        "val_f1",
        "learning_rate",
    }
    missing_keys = expected_keys - set(history.keys())
    if not missing_keys:
        logger.info("✓  All expected metric keys present in Trainer.history")
    else:
        logger.error("✗  Missing keys in Trainer.history: %s", missing_keys)
        all_ok = False

    # 2. Check generated files
    if _CSV_PATH.exists():
        logger.info("✓  metrics.csv successfully created (%d bytes)", _CSV_PATH.stat().st_size)
    else:
        logger.error("✗  metrics.csv NOT found at %s", _CSV_PATH)
        all_ok = False

    if _JSON_PATH.exists():
        logger.info("✓  metrics.json successfully created (%d bytes)", _JSON_PATH.stat().st_size)
    else:
        logger.error("✗  metrics.json NOT found at %s", _JSON_PATH)
        all_ok = False

    # 3. Print verified metrics values
    if all_ok:
        logger.info("Metrics values per epoch:")
        for idx in range(len(history["epoch"])):
            logger.info(
                "  Epoch %d  |  Accuracy=%.2f%%  |  Precision=%.2f%%  |  Recall=%.2f%%  |  F1=%.2f%%",
                history["epoch"][idx],
                history["val_accuracy"][idx],
                history["val_precision"][idx],
                history["val_recall"][idx],
                history["val_f1"][idx],
            )
        logger.info("✓  All Step 4.3 verifications PASSED.")
    else:
        logger.error("✗  Some Step 4.3 verifications FAILED.")
        sys.exit(1)


if __name__ == "__main__":
    main()
