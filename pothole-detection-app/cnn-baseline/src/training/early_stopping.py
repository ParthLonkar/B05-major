"""Early stopping monitor for training loops.

Tracks a monitored metric (e.g. validation loss) across epochs and signals
when training should stop because the metric has not improved for a
configurable number of consecutive epochs (``patience``).
"""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


class EarlyStopping:
    """Stops training when a monitored metric stops improving.

    Attributes:
        patience: Number of epochs with no improvement before stopping.
        min_delta: Minimum absolute change to count as an improvement.
        monitor: Name of the metric being tracked (for logging only).
        best_score: Best metric value seen so far.
        counter: Number of consecutive epochs without improvement.
        should_stop: Flag that the caller checks after each epoch.
    """

    def __init__(
        self,
        patience: int = 5,
        min_delta: float = 0.0,
        monitor: str = "val_loss",
    ) -> None:
        """Initialise the early-stopping tracker.

        Args:
            patience: How many epochs without improvement to tolerate
                before requesting a stop.
            min_delta: Minimum absolute decrease in the monitored metric
                to qualify as an improvement.  A value of ``0.0`` means
                *any* decrease counts.
            monitor: Human-readable name of the metric (used in log
                messages only; the caller is responsible for passing the
                correct value to :meth:`step`).
        """
        if patience < 1:
            raise ValueError(f"patience must be >= 1, got {patience}")
        self.patience: int = patience
        self.min_delta: float = abs(min_delta)
        self.monitor: str = monitor

        self.best_score: float | None = None
        self.counter: int = 0
        self.should_stop: bool = False

        logger.info(
            "EarlyStopping initialised  |  patience=%d  |  min_delta=%.4f  |  "
            "monitor=%s",
            self.patience,
            self.min_delta,
            self.monitor,
        )

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def step(self, metric_value: float) -> bool:
        """Call once per epoch with the current metric value.

        Args:
            metric_value: The current value of the monitored metric
                (lower is better, e.g. validation loss).

        Returns:
            ``True`` if training should stop, ``False`` otherwise.
        """
        if self.best_score is None:
            # First epoch — initialise.
            self.best_score = metric_value
            logger.info(
                "EarlyStopping: initial %s=%.4f recorded.",
                self.monitor,
                metric_value,
            )
            return False

        improvement: float = self.best_score - metric_value
        if improvement > self.min_delta:
            # Genuine improvement.
            logger.info(
                "EarlyStopping: %s improved from %.4f to %.4f (Δ=%.4f). "
                "Counter reset.",
                self.monitor,
                self.best_score,
                metric_value,
                improvement,
            )
            self.best_score = metric_value
            self.counter = 0
        else:
            # No meaningful improvement.
            self.counter += 1
            logger.info(
                "EarlyStopping: %s did NOT improve (best=%.4f, current=%.4f). "
                "Patience counter: %d/%d",
                self.monitor,
                self.best_score,
                metric_value,
                self.counter,
                self.patience,
            )
            if self.counter >= self.patience:
                self.should_stop = True
                logger.info(
                    "EarlyStopping: patience exhausted (%d epochs). "
                    "Requesting training stop.",
                    self.patience,
                )

        return self.should_stop

    def reset(self) -> None:
        """Reset internal state (useful when re-starting training)."""
        self.best_score = None
        self.counter = 0
        self.should_stop = False
        logger.info("EarlyStopping: state reset.")
