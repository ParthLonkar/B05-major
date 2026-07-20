"""Test-set evaluator for the CNN pothole classification model.

Provides a self-contained ``TestEvaluator`` class that:

1. Loads the best checkpoint (``best_model.pth``) from a given experiment
   run directory.
2. Builds or accepts a test ``DataLoader``.
3. Runs a single forward pass over the entire test set in ``torch.no_grad()``
   evaluation mode, collecting predictions and computing test loss.
4. Delegates metric computation to ``src.evaluation.metrics``.
5. Persists a structured ``evaluation_summary.json`` inside the experiment
   run directory (under an ``evaluation/`` subdirectory).

Design notes
------------
* The evaluator is **independent** of the training pipeline.  It does not
  import anything from ``src.training.*``; checkpoint loading is performed
  inline using ``torch.load`` + ``model.load_state_dict``.
* All file paths use ``pathlib.Path``.
* All public methods carry full type hints and Google-style docstrings.
"""

from __future__ import annotations

import json
import logging
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import torch
import torch.nn as nn
from torch.utils.data import DataLoader

from src.evaluation.metrics import compute_test_metrics

logger = logging.getLogger(__name__)


class TestEvaluator:
    """Evaluates a trained CNN model on the held-out test split.

    Attributes:
        model: The PyTorch model to evaluate.
        device: The device used for inference.
        criterion: Loss function (CrossEntropyLoss).
        test_loader: DataLoader for the test split.
        checkpoint_path: Path to the loaded checkpoint file.
        results: Dictionary of evaluation results (populated after ``run``).
    """

    def __init__(
        self,
        model: nn.Module,
        test_loader: DataLoader,
        device: torch.device | str = "cpu",
    ) -> None:
        """Initialise the evaluator.

        Args:
            model: An instantiated ``PotholeClassifier`` (or any ``nn.Module``
                with the same forward signature).
            test_loader: ``DataLoader`` for the held-out test split.
            device: Torch device string or object (``"cpu"`` / ``"cuda"``).
        """
        self.device: torch.device = torch.device(device)
        self.model: nn.Module = model.to(self.device)
        self.test_loader: DataLoader = test_loader
        self.criterion: nn.Module = nn.CrossEntropyLoss()
        self.checkpoint_path: Optional[Path] = None
        self.results: Dict[str, Any] = {}

        logger.info(
            "TestEvaluator initialised  |  device=%s  |  test_samples=%d",
            self.device,
            len(test_loader.dataset),
        )

    # ------------------------------------------------------------------
    # Checkpoint loading
    # ------------------------------------------------------------------
    def load_checkpoint(self, checkpoint_path: str | Path) -> Dict[str, Any]:
        """Load model weights from a checkpoint file.

        Only the ``model_state_dict`` is restored — optimizer and scheduler
        states are intentionally ignored since they are irrelevant during
        inference.

        Args:
            checkpoint_path: Absolute or relative path to a ``.pth`` file.

        Returns:
            The raw checkpoint dictionary (caller may inspect metadata).

        Raises:
            FileNotFoundError: If *checkpoint_path* does not exist.
        """
        checkpoint_path = Path(checkpoint_path)
        if not checkpoint_path.exists():
            raise FileNotFoundError(
                f"Checkpoint not found: {checkpoint_path}"
            )

        checkpoint: Dict[str, Any] = torch.load(
            checkpoint_path, map_location=self.device, weights_only=False,
        )

        self.model.load_state_dict(checkpoint["model_state_dict"])
        self.checkpoint_path = checkpoint_path

        logger.info(
            "Loaded checkpoint  |  path=%s  |  trained_epoch=%d  |  "
            "val_loss=%.4f  |  val_acc=%.2f%%",
            checkpoint_path.name,
            checkpoint.get("epoch", 0),
            checkpoint.get("val_loss", float("nan")),
            checkpoint.get("val_accuracy", float("nan")),
        )

        return checkpoint

    # ------------------------------------------------------------------
    # Core evaluation loop
    # ------------------------------------------------------------------
    def run(self) -> Dict[str, Any]:
        """Execute a complete evaluation pass over the test set.

        The model is placed in ``eval()`` mode and all computation happens
        inside a ``torch.no_grad()`` context to disable gradient tracking.

        Returns:
            A dictionary containing:
                - ``test_loss`` (float): Average CrossEntropy loss.
                - ``accuracy`` (float): % accuracy.
                - ``precision`` (float): % precision.
                - ``recall`` (float): % recall.
                - ``f1`` (float): % F1 score.
                - ``num_samples`` (int): Number of test images evaluated.
                - ``inference_time_seconds`` (float): Wall-clock time for
                  the complete forward pass.
                - ``checkpoint`` (str): Name of the loaded checkpoint file.
                - ``timestamp`` (str): ISO-8601 UTC timestamp.
        """
        self.model.eval()
        logger.info("Starting test evaluation (%d batches)…", len(self.test_loader))

        all_labels: List[int] = []
        all_preds: List[int] = []
        running_loss: float = 0.0
        num_batches: int = 0

        start_time = time.perf_counter()

        with torch.no_grad():
            for images, labels in self.test_loader:
                images = images.to(self.device)
                labels = labels.to(self.device)

                logits = self.model(images)
                loss = self.criterion(logits, labels)

                running_loss += loss.item()
                num_batches += 1

                preds = torch.argmax(logits, dim=1)
                all_labels.extend(labels.cpu().tolist())
                all_preds.extend(preds.cpu().tolist())

        elapsed = time.perf_counter() - start_time

        avg_test_loss = running_loss / max(num_batches, 1)

        # Delegate metric computation to the evaluation metrics module
        metrics = compute_test_metrics(all_labels, all_preds)

        self.results = {
            "test_loss": round(avg_test_loss, 6),
            "accuracy": metrics["accuracy"],
            "precision": metrics["precision"],
            "recall": metrics["recall"],
            "f1": metrics["f1"],
            "num_samples": len(all_labels),
            "inference_time_seconds": round(elapsed, 4),
            "checkpoint": self.checkpoint_path.name if self.checkpoint_path else "N/A",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        logger.info(
            "Test evaluation complete  |  loss=%.4f  |  accuracy=%.2f%%  |  "
            "precision=%.2f%%  |  recall=%.2f%%  |  f1=%.2f%%  |  "
            "samples=%d  |  time=%.2fs",
            self.results["test_loss"],
            self.results["accuracy"],
            self.results["precision"],
            self.results["recall"],
            self.results["f1"],
            self.results["num_samples"],
            self.results["inference_time_seconds"],
        )

        return self.results

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------
    def save_results(self, output_dir: str | Path) -> Path:
        """Persist evaluation results to ``evaluation_summary.json``.

        Args:
            output_dir: Directory where the JSON file is written.  The
                directory (and parents) are created if absent.

        Returns:
            Absolute path to the saved JSON file.

        Raises:
            RuntimeError: If ``run()`` has not been called yet.
        """
        if not self.results:
            raise RuntimeError(
                "No evaluation results available. Call run() before save_results()."
            )

        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        json_path = output_dir / "evaluation_summary.json"
        with open(json_path, "w", encoding="utf-8") as fh:
            json.dump(self.results, fh, indent=2)

        logger.info("Saved evaluation summary to: %s", json_path)
        return json_path
