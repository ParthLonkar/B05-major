"""Reusable Trainer class for CNN pothole classification training and validation.

This module encapsulates a single training–validation loop that reads all
hyperparameters from config.yaml, automatically selects CPU or CUDA, and
exposes clean `train_one_epoch` / `validate_one_epoch` / `fit` methods.

Scope (Step 4.1):
  - CrossEntropyLoss
  - Adam optimizer
  - Per-epoch average loss + validation accuracy
  - Python logging (no raw prints)

Explicitly NOT implemented (deferred to later steps):
  - Early stopping, checkpoint saving, resume, scheduler
  - Precision / Recall / F1
  - Plot generation, test evaluation, Flask integration
"""

from __future__ import annotations

import logging
import time
from typing import Dict, List

import torch
import torch.nn as nn
from torch.optim import Adam
from torch.utils.data import DataLoader

logger = logging.getLogger(__name__)


class Trainer:
    """Encapsulates training and validation loops for a PyTorch classification model.

    Attributes:
        model: The PyTorch model to train.
        device: The torch.device used for computation.
        criterion: Loss function (CrossEntropyLoss).
        optimizer: Adam optimizer instance.
        history: Dictionary tracking per-epoch metrics.
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
        # Only optimise parameters that require gradients (frozen backbone excluded).
        trainable_params = filter(lambda p: p.requires_grad, self.model.parameters())
        self.optimizer: Adam = Adam(trainable_params, lr=self.learning_rate)
        logger.info("Optimizer: Adam  |  lr=%.6f", self.learning_rate)

        # ---- history tracking ----
        self.history: Dict[str, List[float]] = {
            "train_loss": [],
            "val_loss": [],
            "val_accuracy": [],
        }

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
            images: torch.Tensor = images.to(self.device)
            labels: torch.Tensor = labels.to(self.device)

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
    def validate_one_epoch(self, epoch: int) -> tuple[float, float]:
        """Execute one full validation epoch (no gradient computation).

        Args:
            epoch: Current epoch number (1-indexed, used for logging only).

        Returns:
            A tuple of (average_val_loss, val_accuracy_percentage).
        """
        self.model.eval()
        running_loss: float = 0.0
        correct: int = 0
        total_samples: int = 0

        for images, labels in self.val_loader:
            images: torch.Tensor = images.to(self.device)
            labels: torch.Tensor = labels.to(self.device)

            outputs: torch.Tensor = self.model(images)
            loss: torch.Tensor = self.criterion(outputs, labels)

            batch_size: int = images.size(0)
            running_loss += loss.item() * batch_size
            total_samples += batch_size

            # Accuracy: pick the class with the highest logit
            _, predicted = torch.max(outputs, dim=1)
            correct += (predicted == labels).sum().item()

        avg_loss: float = running_loss / max(total_samples, 1)
        accuracy: float = (correct / max(total_samples, 1)) * 100.0
        return avg_loss, accuracy

    # ------------------------------------------------------------------
    # Full training loop
    # ------------------------------------------------------------------
    def fit(self, num_epochs: int | None = None) -> Dict[str, List[float]]:
        """Run the full training loop for *num_epochs* epochs.

        Args:
            num_epochs: Number of epochs to train.  If ``None``, uses the
                value from ``config.yaml`` (``training.epochs``).

        Returns:
            The ``self.history`` dictionary with per-epoch metrics.
        """
        if num_epochs is None:
            num_epochs = self.epochs

        logger.info("=" * 60)
        logger.info(
            "Starting training  |  epochs=%d  |  device=%s",
            num_epochs,
            self.device,
        )
        logger.info(
            "Train batches=%d  |  Val batches=%d",
            len(self.train_loader),
            len(self.val_loader),
        )
        logger.info("=" * 60)

        for epoch in range(1, num_epochs + 1):
            epoch_start: float = time.time()

            # --- Train ---
            train_loss: float = self.train_one_epoch(epoch)

            # --- Validate ---
            val_loss, val_acc = self.validate_one_epoch(epoch)

            # --- Record ---
            self.history["train_loss"].append(train_loss)
            self.history["val_loss"].append(val_loss)
            self.history["val_accuracy"].append(val_acc)

            elapsed: float = time.time() - epoch_start

            logger.info("-" * 60)
            logger.info(
                "Epoch %d/%d  |  train_loss=%.4f  |  val_loss=%.4f  |  "
                "val_acc=%.2f%%  |  time=%.1fs",
                epoch,
                num_epochs,
                train_loss,
                val_loss,
                val_acc,
                elapsed,
            )
            logger.info("-" * 60)

        logger.info("Training complete.")
        return self.history
