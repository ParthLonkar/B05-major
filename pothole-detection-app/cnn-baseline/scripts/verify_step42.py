"""Step 4.2 verification: checkpoint, resume, scheduler, and early stopping.

This script runs four sequential tests:
  1. Train 3 epochs → verify best_model.pth and last_checkpoint.pth are created.
  2. Resume from last_checkpoint.pth → train 2 more epochs → verify
     epoch numbering continues correctly.
  3. Verify the scheduler is active and learning rate is tracked.
  4. Train with patience=2 to demonstrate early stopping triggers.

Usage (from cnn-baseline/):
    python -m scripts.verify_step42
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
logger = logging.getLogger("verify_step42")

_MODEL_DIR = Path(_PROJECT_ROOT) / "outputs" / "models"
_BEST = _MODEL_DIR / "best_model.pth"
_LAST = _MODEL_DIR / "last_checkpoint.pth"


def _build_components(config_overrides: dict | None = None):
    """Helper: load config, build loaders + model + trainer."""
    cfg = get_config()
    raw = cfg.raw

    # Apply overrides to a copy.
    if config_overrides:
        import copy
        raw = copy.deepcopy(raw)
        for section, values in config_overrides.items():
            if section in raw and isinstance(values, dict):
                raw[section].update(values)
            else:
                raw[section] = values

    processed_dir = Path(_PROJECT_ROOT) / raw["dataset"]["processed_dir"]
    image_size = raw["preprocessing"].get("image_size", 224)
    batch_size = min(raw["training"].get("batch_size", 32), 16)  # keep small

    train_loader, val_loader, _ = build_data_loaders(
        processed_dir=processed_dir,
        image_size=image_size,
        batch_size=batch_size,
        num_workers=0,
    )
    model = ModelFactory.create_model(raw)
    trainer = Trainer(
        model=model,
        train_loader=train_loader,
        val_loader=val_loader,
        config=raw,
    )
    return trainer


def _clean_checkpoints() -> None:
    """Remove old checkpoint files so tests start fresh."""
    for p in (_BEST, _LAST):
        if p.exists():
            p.unlink()
            logger.info("Cleaned: %s", p)


# ======================================================================
# TEST 1: Checkpoint creation
# ======================================================================
def test_checkpoint_creation() -> bool:
    logger.info("=" * 60)
    logger.info("TEST 1: Train 3 epochs → verify checkpoint files created")
    logger.info("=" * 60)

    _clean_checkpoints()
    trainer = _build_components()
    trainer.fit(num_epochs=3)

    ok = True
    if _BEST.exists():
        logger.info("✓  best_model.pth exists  (%d bytes)", _BEST.stat().st_size)
    else:
        logger.error("✗  best_model.pth NOT found")
        ok = False

    if _LAST.exists():
        logger.info("✓  last_checkpoint.pth exists  (%d bytes)", _LAST.stat().st_size)
    else:
        logger.error("✗  last_checkpoint.pth NOT found")
        ok = False

    return ok


# ======================================================================
# TEST 2: Resume training
# ======================================================================
def test_resume_training() -> bool:
    logger.info("=" * 60)
    logger.info("TEST 2: Resume from last_checkpoint.pth → train 2 more epochs")
    logger.info("=" * 60)

    if not _LAST.exists():
        logger.error("Cannot test resume — last_checkpoint.pth missing.")
        return False

    trainer = _build_components()
    trainer.resume(str(_LAST))

    expected_start = 4  # trained 3 epochs → resume at 4
    ok = True
    if trainer.start_epoch == expected_start:
        logger.info("✓  start_epoch=%d (expected %d)", trainer.start_epoch, expected_start)
    else:
        logger.error(
            "✗  start_epoch=%d but expected %d",
            trainer.start_epoch,
            expected_start,
        )
        ok = False

    history = trainer.fit(num_epochs=2)

    # History is restored and accumulated, so 3 initial + 2 resumed = 5 total entries.
    if len(history["train_loss"]) == 5:
        logger.info("✓  Trained for 2 resumed epochs correctly (total history size = 5)")
    else:
        logger.error(
            "✗  Expected 5 history entries, got %d", len(history["train_loss"])
        )
        ok = False

    return ok


# ======================================================================
# TEST 3: Scheduler verification
# ======================================================================
def test_scheduler() -> bool:
    logger.info("=" * 60)
    logger.info("TEST 3: Verify scheduler is active and LR is tracked")
    logger.info("=" * 60)

    trainer = _build_components()
    ok = True

    if trainer.scheduler is not None:
        logger.info("✓  Scheduler is active: %s", type(trainer.scheduler).__name__)
    else:
        logger.error("✗  Scheduler is None")
        ok = False

    history = trainer.fit(num_epochs=2)

    if "learning_rate" in history and len(history["learning_rate"]) == 2:
        logger.info(
            "✓  LR tracked: %s",
            [f"{lr:.1e}" for lr in history["learning_rate"]],
        )
    else:
        logger.error("✗  learning_rate not tracked properly in history")
        ok = False

    return ok


# ======================================================================
# TEST 4: Early stopping with patience=2
# ======================================================================
def test_early_stopping() -> bool:
    logger.info("=" * 60)
    logger.info("TEST 4: Early stopping with patience=2 (max 10 epochs)")
    logger.info("=" * 60)

    _clean_checkpoints()

    overrides = {
        "training": {
            "epochs": 10,
            "batch_size": 16,
            "optimizer": "adam",
            "learning_rate": 0.001,
            "early_stopping": {
                "patience": 2,
                "min_delta": 5.0,  # absurdly high → no improvement will ever count
                "monitor": "val_loss",
            },
            "scheduler": {"type": "none"},
        }
    }
    trainer = _build_components(config_overrides=overrides)
    history = trainer.fit(num_epochs=10)

    epochs_run = len(history["train_loss"])
    ok = True

    if epochs_run < 10:
        logger.info(
            "✓  Early stopping triggered — trained %d / 10 epochs", epochs_run
        )
    else:
        logger.warning(
            "⚠  Early stopping did NOT trigger within 10 epochs "
            "(trained %d). With min_delta=5.0 this is unexpected.",
            epochs_run,
        )
        ok = False

    if trainer.early_stopping is not None and trainer.early_stopping.should_stop:
        logger.info("✓  early_stopping.should_stop is True")
    else:
        logger.error("✗  early_stopping.should_stop is still False")
        ok = False

    return ok


# ======================================================================
# Main
# ======================================================================
def main() -> None:
    results = {
        "Checkpoint creation": test_checkpoint_creation(),
        "Resume training": test_resume_training(),
        "Scheduler": test_scheduler(),
        "Early stopping": test_early_stopping(),
    }

    logger.info("=" * 60)
    logger.info("STEP 4.2 VERIFICATION SUMMARY")
    logger.info("=" * 60)
    all_ok = True
    for name, passed in results.items():
        status = "✓ PASS" if passed else "✗ FAIL"
        logger.info("  %s  |  %s", status, name)
        if not passed:
            all_ok = False

    if all_ok:
        logger.info("All Step 4.2 verifications PASSED.")
    else:
        logger.error("Some Step 4.2 verifications FAILED.")
        sys.exit(1)


if __name__ == "__main__":
    main()
