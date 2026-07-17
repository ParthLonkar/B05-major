"""Reusable Trainer class for CNN pothole classification training and validation.

This module encapsulates a full training–validation loop that reads all
hyperparameters from config.yaml, automatically selects CPU or CUDA, and
exposes clean ``train_one_epoch`` / ``validate_one_epoch`` / ``fit`` methods.

Step 4.1 deliverables:
  - CrossEntropyLoss
  - Adam optimizer
  - Per-epoch average loss + validation accuracy
  - Python logging (no raw prints)

Step 4.2 additions:
  - EarlyStopping integration (configurable patience / min_delta)
  - CheckpointManager (best_model.pth + last_checkpoint.pth)
  - Resume-from-checkpoint support
  - ReduceLROnPlateau scheduler (configurable)

Explicitly NOT implemented (deferred to later steps):
  - Precision / Recall / F1, confusion matrix, ROC
  - Plot generation, test evaluation, Flask integration
"""

from __future__ import annotations

import logging
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import torch
import torch.nn as nn
from torch.optim import Adam
from torch.optim.lr_scheduler import LRScheduler, ReduceLROnPlateau
from torch.utils.data import DataLoader

from src.training.checkpoint import CheckpointManager
from src.training.early_stopping import EarlyStopping
from src.training.metrics import compute_metrics, save_history

logger = logging.getLogger(__name__)


class Trainer:
    """Encapsulates training and validation loops for a PyTorch classification model.

    Attributes:
        model: The PyTorch model to train.
        device: The torch.device used for computation.
        criterion: Loss function (CrossEntropyLoss).
        optimizer: Adam optimizer instance.
        scheduler: Optional LR scheduler (ReduceLROnPlateau).
        early_stopping: Optional EarlyStopping monitor.
        checkpoint_mgr: CheckpointManager for saving/loading state.
        history: Dictionary tracking per-epoch metrics.
        start_epoch: Epoch to start from (1 if fresh, N+1 if resumed).
    """

    def __init__(
        self,
        model: nn.Module,
        train_loader: DataLoader,
        val_loader: DataLoader,
        config: dict,
    ) -> None:
        """Initialise the Trainer from a loaded configuration dictionary.

        Args:
            model: An instantiated PotholeClassifier (or any nn.Module).
            train_loader: DataLoader for the training split.
            val_loader: DataLoader for the validation split.
            config: The full configuration dictionary (``ConfigLoader.raw``).
        """
        self._config: dict = config

        # ---- device selection (auto-detect CUDA → CPU) ----
        cfg_device: str = config.get("project", {}).get("device", "cpu")
        if cfg_device == "cuda" and not torch.cuda.is_available():
            logger.warning(
                "Config requests CUDA but no GPU detected — falling back to CPU."
            )
            cfg_device = "cpu"
        elif cfg_device == "cpu" and torch.cuda.is_available():
            logger.info(
                "CUDA is available but config explicitly requests CPU. Using CPU."
            )
        self.device: torch.device = torch.device(cfg_device)
        logger.info("Training device: %s", self.device)

        # ---- model ----
        self.model: nn.Module = model.to(self.device)

        # ---- data loaders ----
        self.train_loader: DataLoader = train_loader
        self.val_loader: DataLoader = val_loader

        # ---- training hyper-parameters ----
        training_cfg: dict = config.get("training", {})
        self.epochs: int = int(training_cfg.get("epochs", 30))
        self.learning_rate: float = float(training_cfg.get("learning_rate", 1e-3))

        # ---- loss ----
        self.criterion: nn.Module = nn.CrossEntropyLoss()
        logger.info("Loss function: CrossEntropyLoss")

        # ---- optimizer (Adam) ----
        trainable_params = [p for p in self.model.parameters() if p.requires_grad]
        self.optimizer: Adam = Adam(trainable_params, lr=self.learning_rate)
        logger.info("Optimizer: Adam  |  lr=%.6f", self.learning_rate)

        # ---- LR scheduler (ReduceLROnPlateau) ----
        self.scheduler: Optional[ReduceLROnPlateau] = self._build_scheduler(
            training_cfg
        )

        # ---- early stopping ----
        self.early_stopping: Optional[EarlyStopping] = self._build_early_stopping(
            training_cfg
        )

        # ---- checkpoint manager ----
        outputs_cfg: dict = config.get("outputs", {})
        model_dir: str = outputs_cfg.get("model_dir", "outputs/models")
        best_name: str = outputs_cfg.get("best_model_name", "best_model.pth")
        last_name: str = outputs_cfg.get(
            "last_checkpoint_name", "last_checkpoint.pth"
        )
        self.checkpoint_mgr: CheckpointManager = CheckpointManager(
            save_dir=model_dir,
            best_name=best_name,
            last_name=last_name,
        )

        # ---- history tracking ----
        self.history: Dict[str, List[Any]] = {
            "epoch": [],
            "train_loss": [],
            "val_loss": [],
            "val_accuracy": [],
            "val_precision": [],
            "val_recall": [],
            "val_f1": [],
            "learning_rate": [],
        }

        # ---- resume state ----
        self.start_epoch: int = 1

    # ------------------------------------------------------------------
    # Builder helpers
    # ------------------------------------------------------------------
    def _build_scheduler(
        self, training_cfg: dict
    ) -> Optional[ReduceLROnPlateau]:
        """Create a learning-rate scheduler from config (if configured).

        Args:
            training_cfg: The ``training`` section of the config dict.

        Returns:
            A ``ReduceLROnPlateau`` instance, or ``None`` if scheduling
            is disabled.
        """
        sched_cfg: dict = training_cfg.get("scheduler", {})
        sched_type: str = sched_cfg.get("type", "none").lower()

        if sched_type in ("none", ""):
            logger.info("LR scheduler: disabled")
            return None

        if sched_type == "reducelronplateau":
            factor: float = float(sched_cfg.get("factor", 0.1))
            patience: int = int(sched_cfg.get("patience", 3))
            min_lr: float = float(sched_cfg.get("min_lr", 1e-6))

            scheduler = ReduceLROnPlateau(
                self.optimizer,
                mode="min",
                factor=factor,
                patience=patience,
                min_lr=min_lr,
            )
            logger.info(
                "LR scheduler: ReduceLROnPlateau  |  factor=%.2f  |  "
                "patience=%d  |  min_lr=%.1e",
                factor,
                patience,
                min_lr,
            )
            return scheduler

        logger.warning(
            "Unknown scheduler type '%s' — scheduler disabled.", sched_type
        )
        return None

    def _build_early_stopping(
        self, training_cfg: dict
    ) -> Optional[EarlyStopping]:
        """Create an EarlyStopping instance from config (if configured).

        Args:
            training_cfg: The ``training`` section of the config dict.

        Returns:
            An ``EarlyStopping`` instance, or ``None`` if early stopping
            is not configured.
        """
        es_cfg: dict | None = training_cfg.get("early_stopping")
        if es_cfg is None:
            logger.info("Early stopping: disabled")
            return None

        patience: int = int(es_cfg.get("patience", 5))
        min_delta: float = float(es_cfg.get("min_delta", 0.0))
        monitor: str = es_cfg.get("monitor", "val_loss")

        return EarlyStopping(
            patience=patience,
            min_delta=min_delta,
            monitor=monitor,
        )

    # ------------------------------------------------------------------
    # Resume from checkpoint
    # ------------------------------------------------------------------
    def resume(self, checkpoint_path: str | Path) -> None:
        """Restore training state from a previously saved checkpoint.

        Loads model weights, optimizer state, scheduler state (if
        applicable), and sets ``self.start_epoch`` so that ``fit()``
        continues from where training left off.

        Args:
            checkpoint_path: Path to a ``.pth`` checkpoint file.
        """
        ckpt: Dict[str, Any] = CheckpointManager.load_checkpoint(
            checkpoint_path=checkpoint_path,
            model=self.model,
            optimizer=self.optimizer,
            scheduler=self.scheduler,
            device=self.device,
        )
        self.start_epoch = int(ckpt.get("epoch", 0)) + 1

        # Seed the checkpoint manager's best score so it doesn't
        # overwrite a better checkpoint from the previous run.
        prev_val_loss: float = float(ckpt.get("val_loss", float("inf")))
        self.checkpoint_mgr.best_val_loss = prev_val_loss

        # Restore history if available
        if "history" in ckpt:
            self.history = ckpt["history"]
            logger.info("Training history restored from checkpoint.")

        logger.info(
            "Training will resume from epoch %d  (previous val_loss=%.4f)",
            self.start_epoch,
            prev_val_loss,
        )

    # ------------------------------------------------------------------
    # Training epoch
    # ------------------------------------------------------------------
    def train_one_epoch(self, epoch: int) -> float:
        """Execute one full training epoch.

        Args:
            epoch: Current epoch number (1-indexed, used for logging only).

        Returns:
            The average training loss across all batches.
        """
        self.model.train()
        running_loss: float = 0.0
        total_samples: int = 0
        num_batches: int = len(self.train_loader)

        for batch_idx, (images, labels) in enumerate(self.train_loader, start=1):
            images = images.to(self.device)
            labels = labels.to(self.device)

            # Forward
            outputs: torch.Tensor = self.model(images)
            loss: torch.Tensor = self.criterion(outputs, labels)

            # Backward + step
            self.optimizer.zero_grad()
            loss.backward()
            self.optimizer.step()

            batch_size: int = images.size(0)
            running_loss += loss.item() * batch_size
            total_samples += batch_size

            # Log progress every 25 % of batches (and always the last batch)
            if batch_idx % max(1, num_batches // 4) == 0 or batch_idx == num_batches:
                logger.info(
                    "  Epoch %d  |  Batch %d/%d  |  batch_loss=%.4f",
                    epoch,
                    batch_idx,
                    num_batches,
                    loss.item(),
                )

        avg_loss: float = running_loss / max(total_samples, 1)
        return avg_loss

    # ------------------------------------------------------------------
    # Validation epoch
    # ------------------------------------------------------------------
    @torch.no_grad()
    def validate_one_epoch(self, epoch: int) -> Dict[str, float]:
        """Execute one full validation epoch (no gradient computation).

        Args:
            epoch: Current epoch number (1-indexed, used for logging only).

        Returns:
            Dict containing average validation loss, accuracy, precision,
            recall, and f1 score.
        """
        self.model.eval()
        running_loss: float = 0.0
        total_samples: int = 0

        all_labels = []
        all_predictions = []

        for images, labels in self.val_loader:
            images = images.to(self.device)
            labels = labels.to(self.device)

            outputs: torch.Tensor = self.model(images)
            loss: torch.Tensor = self.criterion(outputs, labels)

            batch_size: int = images.size(0)
            running_loss += loss.item() * batch_size
            total_samples += batch_size

            _, predicted = torch.max(outputs, dim=1)
            all_labels.extend(labels.cpu().numpy())
            all_predictions.extend(predicted.cpu().numpy())

        avg_loss: float = running_loss / max(total_samples, 1)
        metrics = compute_metrics(all_labels, all_predictions)
        metrics["loss"] = avg_loss
        return metrics

    # ------------------------------------------------------------------
    # Full training loop
    # ------------------------------------------------------------------
    def fit(self, num_epochs: int | None = None) -> Dict[str, List[float]]:
        """Run the full training loop for *num_epochs* epochs.

        Integrates early stopping, checkpoint saving, and LR scheduling.

        Args:
            num_epochs: Number of epochs to train.  If ``None``, uses the
                value from ``config.yaml`` (``training.epochs``).

        Returns:
            The ``self.history`` dictionary with per-epoch metrics.
        """
        if num_epochs is None:
            num_epochs = self.epochs

        end_epoch: int = self.start_epoch + num_epochs - 1

        logger.info("=" * 60)
        logger.info(
            "Starting training  |  epochs %d→%d  |  device=%s",
            self.start_epoch,
            end_epoch,
            self.device,
        )
        logger.info(
            "Train batches=%d  |  Val batches=%d",
            len(self.train_loader),
            len(self.val_loader),
        )
        logger.info("=" * 60)

        for epoch in range(self.start_epoch, end_epoch + 1):
            epoch_start: float = time.time()

            # --- current LR ---
            current_lr: float = self.optimizer.param_groups[0]["lr"]

            # --- Train ---
            train_loss: float = self.train_one_epoch(epoch)

            # --- Validate ---
            val_metrics = self.validate_one_epoch(epoch)
            val_loss = val_metrics["loss"]
            val_acc = val_metrics["accuracy"]
            val_precision = val_metrics["precision"]
            val_recall = val_metrics["recall"]
            val_f1 = val_metrics["f1"]

            # --- Record ---
            self.history["epoch"].append(epoch)
            self.history["train_loss"].append(train_loss)
            self.history["val_loss"].append(val_loss)
            self.history["val_accuracy"].append(val_acc)
            self.history["val_precision"].append(val_precision)
            self.history["val_recall"].append(val_recall)
            self.history["val_f1"].append(val_f1)
            self.history["learning_rate"].append(current_lr)

            elapsed: float = time.time() - epoch_start

            logger.info("-" * 60)
            logger.info(
                "Epoch %d/%d  |  train_loss=%.4f  |  val_loss=%.4f  |  "
                "val_acc=%.2f%%  |  val_prec=%.2f%%  |  val_rec=%.2f%%  |  "
                "val_f1=%.2f%%  |  lr=%.1e  |  time=%.1fs",
                epoch,
                end_epoch,
                train_loss,
                val_loss,
                val_acc,
                val_precision,
                val_recall,
                val_f1,
                current_lr,
                elapsed,
            )
            logger.info("-" * 60)

            # --- LR scheduler step ---
            if self.scheduler is not None:
                old_lr = self.optimizer.param_groups[0]["lr"]
                self.scheduler.step(val_loss)
                new_lr = self.optimizer.param_groups[0]["lr"]
                if new_lr != old_lr:
                    logger.info(
                        "Scheduler reduced LR: %.1e → %.1e", old_lr, new_lr
                    )

            # --- Save Metrics History ---
            metrics_dir = self._config.get("outputs", {}).get("metrics_dir", "outputs/metrics")
            metadata = {
                "train_samples": len(self.train_loader.dataset),
                "val_samples": len(self.val_loader.dataset),
            }
            save_history(self.history, metrics_dir, metadata=metadata)

            # --- Checkpoint: always save last ---
            self.checkpoint_mgr.save_last(
                model=self.model,
                optimizer=self.optimizer,
                scheduler=self.scheduler,
                epoch=epoch,
                val_loss=val_loss,
                val_accuracy=val_acc,
                config=self._config,
                history=self.history,
            )

            # --- Checkpoint: save best if improved ---
            self.checkpoint_mgr.save_best(
                model=self.model,
                optimizer=self.optimizer,
                scheduler=self.scheduler,
                epoch=epoch,
                val_loss=val_loss,
                val_accuracy=val_acc,
                config=self._config,
                history=self.history,
            )

            # --- Early stopping ---
            if self.early_stopping is not None:
                if self.early_stopping.step(val_loss):
                    logger.info(
                        "Early stopping triggered at epoch %d. "
                        "Training halted.",
                        epoch,
                    )
                    break

        logger.info("Training complete.")
        return self.history
