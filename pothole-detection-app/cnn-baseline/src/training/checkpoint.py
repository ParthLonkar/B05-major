"""Checkpoint manager for saving and loading training state.

Handles two checkpoint files:
  - ``best_model.pth``  — saved whenever validation loss improves.
  - ``last_checkpoint.pth`` — saved at the end of every epoch so
    training can be resumed from the most recent state.

Each checkpoint stores:
  - model ``state_dict``
  - optimizer ``state_dict``
  - scheduler ``state_dict`` (if a scheduler is in use)
  - current epoch number
  - validation loss
  - validation accuracy
  - config snapshot (full training configuration dict)
  - timestamp (ISO-8601 UTC)
  - git_commit (short SHA, or ``"unknown"`` outside a repo)
"""

from __future__ import annotations

import logging
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

import torch
import torch.nn as nn
from torch.optim import Optimizer
from torch.optim.lr_scheduler import LRScheduler

logger = logging.getLogger(__name__)


class CheckpointManager:
    """Saves and loads training checkpoints to disk.

    Attributes:
        save_dir: Directory where checkpoint files are written.
        best_name: Filename for the best-model checkpoint.
        last_name: Filename for the last (resumable) checkpoint.
        best_val_loss: Lowest validation loss observed so far.
    """

    def __init__(
        self,
        save_dir: str | Path,
        best_name: str = "best_model.pth",
        last_name: str = "last_checkpoint.pth",
    ) -> None:
        """Initialise the checkpoint manager.

        Args:
            save_dir: Directory for writing ``.pth`` files.
            best_name: Filename for the best-model checkpoint.
            last_name: Filename for the most-recent checkpoint.
        """
        self.save_dir: Path = Path(save_dir)
        self.save_dir.mkdir(parents=True, exist_ok=True)

        self.best_name: str = best_name
        self.last_name: str = last_name
        self.best_val_loss: float = float("inf")

        logger.info(
            "CheckpointManager initialised  |  dir=%s  |  best=%s  |  last=%s",
            self.save_dir,
            self.best_name,
            self.last_name,
        )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    @staticmethod
    def _get_git_commit() -> str:
        """Return the short git commit hash, or ``'unknown'`` if unavailable."""
        try:
            result = subprocess.run(
                ["git", "rev-parse", "--short", "HEAD"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            if result.returncode == 0:
                return result.stdout.strip()
        except Exception:
            pass
        return "unknown"

    def _build_state(
        self,
        model: nn.Module,
        optimizer: Optimizer,
        scheduler: Optional[LRScheduler],
        epoch: int,
        val_loss: float,
        val_accuracy: float,
        config: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Assemble a checkpoint dictionary.

        Args:
            model: The model whose weights to save.
            optimizer: The optimizer whose state to save.
            scheduler: LR scheduler (may be ``None``).
            epoch: Current epoch number (1-indexed).
            val_loss: Validation loss at this epoch.
            val_accuracy: Validation accuracy at this epoch.
            config: Optional full training configuration dict.  Stored
                as-is for reproducibility.  Skipped if ``None``.

        Returns:
            A dictionary ready for ``torch.save``.
        """
        state: Dict[str, Any] = {
            "epoch": epoch,
            "model_state_dict": model.state_dict(),
            "optimizer_state_dict": optimizer.state_dict(),
            "val_loss": val_loss,
            "val_accuracy": val_accuracy,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "git_commit": self._get_git_commit(),
        }
        if scheduler is not None:
            state["scheduler_state_dict"] = scheduler.state_dict()
        if config is not None:
            state["config"] = config
        return state

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def save_last(
        self,
        model: nn.Module,
        optimizer: Optimizer,
        scheduler: Optional[LRScheduler],
        epoch: int,
        val_loss: float,
        val_accuracy: float,
        config: Optional[Dict[str, Any]] = None,
    ) -> Path:
        """Save the latest checkpoint (called every epoch).

        Args:
            model: Model instance.
            optimizer: Optimizer instance.
            scheduler: LR scheduler (or ``None``).
            epoch: Current epoch (1-indexed).
            val_loss: Validation loss.
            val_accuracy: Validation accuracy (%).
            config: Optional training config dict for reproducibility.

        Returns:
            The path to the saved checkpoint file.
        """
        state = self._build_state(
            model, optimizer, scheduler, epoch, val_loss, val_accuracy,
            config=config,
        )
        path = self.save_dir / self.last_name
        torch.save(state, path)
        logger.info(
            "Saved last checkpoint  |  epoch=%d  |  path=%s", epoch, path
        )
        return path

    def save_best(
        self,
        model: nn.Module,
        optimizer: Optimizer,
        scheduler: Optional[LRScheduler],
        epoch: int,
        val_loss: float,
        val_accuracy: float,
        config: Optional[Dict[str, Any]] = None,
    ) -> Path | None:
        """Save the best-model checkpoint if ``val_loss`` improved.

        Args:
            model: Model instance.
            optimizer: Optimizer instance.
            scheduler: LR scheduler (or ``None``).
            epoch: Current epoch (1-indexed).
            val_loss: Validation loss.
            val_accuracy: Validation accuracy (%).
            config: Optional training config dict for reproducibility.

        Returns:
            The path to the saved best checkpoint, or ``None`` if this
            epoch was not an improvement.
        """
        if val_loss < self.best_val_loss:
            prev = self.best_val_loss
            self.best_val_loss = val_loss
            state = self._build_state(
                model, optimizer, scheduler, epoch, val_loss, val_accuracy,
                config=config,
            )
            path = self.save_dir / self.best_name
            torch.save(state, path)
            logger.info(
                "Saved BEST checkpoint  |  epoch=%d  |  val_loss improved "
                "%.4f → %.4f  |  path=%s",
                epoch,
                prev,
                val_loss,
                path,
            )
            return path

        logger.debug(
            "Best checkpoint NOT updated (best=%.4f, current=%.4f)",
            self.best_val_loss,
            val_loss,
        )
        return None

    # ------------------------------------------------------------------
    # Loading / resume
    # ------------------------------------------------------------------
    @staticmethod
    def load_checkpoint(
        checkpoint_path: str | Path,
        model: nn.Module,
        optimizer: Optional[Optimizer] = None,
        scheduler: Optional[LRScheduler] = None,
        device: torch.device | str = "cpu",
    ) -> Dict[str, Any]:
        """Restore model, optimizer, and scheduler state from a checkpoint.

        Args:
            checkpoint_path: Path to a ``.pth`` file.
            model: Model instance whose ``state_dict`` will be loaded.
            optimizer: If provided, its ``state_dict`` is also restored.
            scheduler: If provided and the checkpoint contains a
                ``scheduler_state_dict``, its state is also restored.
            device: Device to map tensors to when loading.

        Returns:
            The raw checkpoint dictionary (caller can read ``epoch``,
            ``val_loss``, ``val_accuracy``, etc.).

        Raises:
            FileNotFoundError: If *checkpoint_path* does not exist.
        """
        checkpoint_path = Path(checkpoint_path)
        if not checkpoint_path.exists():
            raise FileNotFoundError(
                f"Checkpoint not found: {checkpoint_path}"
            )

        checkpoint: Dict[str, Any] = torch.load(
            checkpoint_path, map_location=device, weights_only=False,
        )

        model.load_state_dict(checkpoint["model_state_dict"])
        logger.info("Model state_dict loaded from: %s", checkpoint_path)

        if optimizer is not None and "optimizer_state_dict" in checkpoint:
            optimizer.load_state_dict(checkpoint["optimizer_state_dict"])
            logger.info("Optimizer state_dict restored.")

        if (
            scheduler is not None
            and "scheduler_state_dict" in checkpoint
        ):
            scheduler.load_state_dict(checkpoint["scheduler_state_dict"])
            logger.info("Scheduler state_dict restored.")

        logger.info(
            "Resumed from epoch %d  |  val_loss=%.4f  |  val_acc=%.2f%%",
            checkpoint.get("epoch", 0),
            checkpoint.get("val_loss", float("nan")),
            checkpoint.get("val_accuracy", float("nan")),
        )

        return checkpoint
