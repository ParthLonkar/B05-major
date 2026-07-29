"""Test-set evaluator for the CNN pothole classification model.

Provides a self-contained ``TestEvaluator`` class that:

1. Loads the best checkpoint (``best_model.pth``) from a given experiment
   run directory.
2. Builds or accepts a test ``DataLoader``.
3. Runs a single forward pass over the entire test set in ``torch.no_grad()``
   evaluation mode, collecting predictions **and softmax probabilities**, and
   computing test loss.
4. Delegates metric computation to ``src.evaluation.metrics``.
5. Generates evaluation artifacts (confusion matrix plot, ROC curve plot,
   classification report text).
6. Persists a structured ``evaluation_summary.json`` inside the experiment
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

from src.evaluation.metrics import (
    compute_confusion_values,
    compute_roc_auc,
    compute_test_metrics,
    generate_classification_report,
)
from src.evaluation.visualization import plot_confusion_matrix, plot_roc_curve

logger = logging.getLogger(__name__)

# Default class names matching label encoding: 0 = Normal, 1 = Pothole
_DEFAULT_CLASS_NAMES: List[str] = ["Normal", "Pothole"]


class TestEvaluator:
    """Evaluates a trained CNN model on the held-out test split.

    Attributes:
        model: The PyTorch model to evaluate.
        device: The device used for inference.
        criterion: Loss function (CrossEntropyLoss).
        test_loader: DataLoader for the test split.
        checkpoint_path: Path to the loaded checkpoint file.
        results: Dictionary of evaluation results (populated after ``run``).
        all_labels: Ground-truth labels collected during ``run()``.
        all_preds: Predicted labels collected during ``run()``.
        all_probs: Positive-class probabilities collected during ``run()``.
    """

    def __init__(
        self,
        model: nn.Module,
        test_loader: DataLoader,
        device: torch.device | str = "cpu",
        class_names: List[str] | None = None,
    ) -> None:
        """Initialise the evaluator.

        Args:
            model: An instantiated ``PotholeClassifier`` (or any ``nn.Module``
                with the same forward signature).
            test_loader: ``DataLoader`` for the held-out test split.
            device: Torch device string or object (``"cpu"`` / ``"cuda"``).
            class_names: Human-readable class names for reports and plots.
                Defaults to ``["Normal", "Pothole"]``.
        """
        self.device: torch.device = torch.device(device)
        self.model: nn.Module = model.to(self.device)
        self.test_loader: DataLoader = test_loader
        self.criterion: nn.Module = nn.CrossEntropyLoss()
        self.checkpoint_path: Optional[Path] = None
        self.class_names: List[str] = class_names or _DEFAULT_CLASS_NAMES
        self.results: Dict[str, Any] = {}

        # Raw prediction arrays — populated by run()
        self.all_labels: List[int] = []
        self.all_preds: List[int] = []
        self.all_probs: List[float] = []

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

        In addition to predicted labels, this method collects **softmax
        probabilities** for the positive class (index 1), which are needed
        for ROC-AUC computation and the ROC curve plot.

        Returns:
            A dictionary containing:
                - ``test_loss`` (float): Average CrossEntropy loss.
                - ``accuracy`` (float): % accuracy.
                - ``precision`` (float): % precision.
                - ``recall`` (float): % recall.
                - ``f1`` (float): % F1 score.
                - ``roc_auc`` (float): ROC-AUC score (0–1).
                - ``confusion_matrix`` (dict): TP, TN, FP, FN counts.
                - ``num_samples`` (int): Number of test images evaluated.
                - ``inference_time_seconds`` (float): Wall-clock time.
                - ``checkpoint`` (str): Name of the loaded checkpoint file.
                - ``timestamp`` (str): ISO-8601 UTC timestamp.
        """
        self.model.eval()
        logger.info("Starting test evaluation (%d batches)…", len(self.test_loader))

        self.all_labels = []
        self.all_preds = []
        self.all_probs = []
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

                # Predicted class labels
                preds = torch.argmax(logits, dim=1)
                self.all_labels.extend(labels.cpu().tolist())
                self.all_preds.extend(preds.cpu().tolist())

                # Softmax probabilities for the positive class (index 1)
                probs = torch.softmax(logits, dim=1)[:, 1]
                self.all_probs.extend(probs.cpu().tolist())

        elapsed = time.perf_counter() - start_time

        avg_test_loss = running_loss / max(num_batches, 1)

        # Delegate metric computation to the evaluation metrics module
        metrics = compute_test_metrics(self.all_labels, self.all_preds)
        roc_auc = compute_roc_auc(self.all_labels, self.all_probs)
        cm_values = compute_confusion_values(self.all_labels, self.all_preds)

        self.results = {
            "test_loss": round(avg_test_loss, 6),
            "accuracy": metrics["accuracy"],
            "precision": metrics["precision"],
            "recall": metrics["recall"],
            "f1": metrics["f1"],
            "roc_auc": roc_auc,
            "confusion_matrix": cm_values,
            "num_samples": len(self.all_labels),
            "inference_time_seconds": round(elapsed, 4),
            "checkpoint": self.checkpoint_path.name if self.checkpoint_path else "N/A",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        logger.info(
            "Test evaluation complete  |  loss=%.4f  |  accuracy=%.2f%%  |  "
            "precision=%.2f%%  |  recall=%.2f%%  |  f1=%.2f%%  |  "
            "roc_auc=%.4f  |  samples=%d  |  time=%.2fs",
            self.results["test_loss"],
            self.results["accuracy"],
            self.results["precision"],
            self.results["recall"],
            self.results["f1"],
            self.results["roc_auc"],
            self.results["num_samples"],
            self.results["inference_time_seconds"],
        )

        return self.results

    # ------------------------------------------------------------------
    # Artifact generation
    # ------------------------------------------------------------------
    def generate_artifacts(self, output_dir: str | Path) -> Dict[str, Path]:
        """Generate all evaluation artifacts (plots + classification report).

        Must be called **after** ``run()`` so that prediction arrays are
        populated.

        Produces:
            - ``confusion_matrix.png``
            - ``roc_curve.png``
            - ``classification_report.txt``

        Args:
            output_dir: Directory where artifacts are saved.

        Returns:
            Dictionary mapping artifact names to their saved file paths.

        Raises:
            RuntimeError: If ``run()`` has not been called yet.
        """
        if not self.all_labels:
            raise RuntimeError(
                "No prediction data available. Call run() before generate_artifacts()."
            )

        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        artifacts: Dict[str, Path] = {}

        # 1. Confusion matrix plot
        artifacts["confusion_matrix"] = plot_confusion_matrix(
            y_true=self.all_labels,
            y_pred=self.all_preds,
            class_names=self.class_names,
            save_dir=output_dir,
        )

        # 2. ROC curve plot
        roc_auc = self.results.get("roc_auc", 0.0)
        artifacts["roc_curve"] = plot_roc_curve(
            y_true=self.all_labels,
            y_prob=self.all_probs,
            roc_auc=roc_auc,
            save_dir=output_dir,
        )

        # 3. Classification report text file
        artifacts["classification_report"] = generate_classification_report(
            y_true=self.all_labels,
            y_pred=self.all_preds,
            class_names=self.class_names,
            save_dir=output_dir,
        )

        logger.info(
            "Generated %d evaluation artifacts in: %s",
            len(artifacts),
            output_dir,
        )
        return artifacts

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
