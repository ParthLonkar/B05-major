"""Evaluation metrics computation for the test evaluation pipeline.

Provides functions that accept ground-truth and predicted label/probability
arrays and return structured dictionaries of classification metrics:

  - Accuracy, Precision, Recall, F1 Score (%)
  - ROC-AUC score (0–1 scale)
  - Confusion matrix breakdown (TP, TN, FP, FN)
  - scikit-learn classification report (text)

These utilities are intentionally **independent** of the training pipeline's
``src.training.metrics`` module.  While the underlying scikit-learn calls are
similar, decoupling the two keeps the evaluation package self-contained and
avoids accidental cross-pipeline imports.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, List

import numpy as np
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)

logger = logging.getLogger(__name__)


def compute_test_metrics(
    y_true: List[int] | np.ndarray,
    y_pred: List[int] | np.ndarray,
) -> Dict[str, float]:
    """Compute classification metrics on the held-out test set.

    All values are returned as **percentages** (0–100 scale) for consistency
    with the training-history convention established in Milestone 4.

    Args:
        y_true: Ground-truth binary labels (0 = normal, 1 = pothole).
        y_pred: Model-predicted binary labels.

    Returns:
        Dictionary with keys ``accuracy``, ``precision``, ``recall``, and
        ``f1``, each mapped to a ``float`` in the 0–100 range.
    """
    y_true_arr = np.asarray(y_true, dtype=np.int64)
    y_pred_arr = np.asarray(y_pred, dtype=np.int64)

    accuracy = float(accuracy_score(y_true_arr, y_pred_arr)) * 100.0
    precision = float(
        precision_score(y_true_arr, y_pred_arr, average="binary", zero_division=0)
    ) * 100.0
    recall = float(
        recall_score(y_true_arr, y_pred_arr, average="binary", zero_division=0)
    ) * 100.0
    f1 = float(
        f1_score(y_true_arr, y_pred_arr, average="binary", zero_division=0)
    ) * 100.0

    logger.info(
        "Test metrics  |  Accuracy=%.2f%%  |  Precision=%.2f%%  |  "
        "Recall=%.2f%%  |  F1=%.2f%%",
        accuracy,
        precision,
        recall,
        f1,
    )

    return {
        "accuracy": round(accuracy, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
    }


def compute_roc_auc(
    y_true: List[int] | np.ndarray,
    y_prob: List[float] | np.ndarray,
) -> float:
    """Compute the ROC-AUC score for binary classification.

    Args:
        y_true: Ground-truth binary labels (0 or 1).
        y_prob: Predicted probabilities for the **positive class** (class 1).

    Returns:
        ROC-AUC score on a 0–1 scale, rounded to 6 decimal places.
    """
    y_true_arr = np.asarray(y_true, dtype=np.int64)
    y_prob_arr = np.asarray(y_prob, dtype=np.float64)

    auc = float(roc_auc_score(y_true_arr, y_prob_arr))
    logger.info("ROC-AUC score: %.4f", auc)
    return round(auc, 6)


def compute_confusion_values(
    y_true: List[int] | np.ndarray,
    y_pred: List[int] | np.ndarray,
) -> Dict[str, int]:
    """Extract TP, TN, FP, FN counts from a binary confusion matrix.

    Args:
        y_true: Ground-truth binary labels.
        y_pred: Predicted binary labels.

    Returns:
        Dictionary with integer keys ``TP``, ``TN``, ``FP``, ``FN``.
    """
    y_true_arr = np.asarray(y_true, dtype=np.int64)
    y_pred_arr = np.asarray(y_pred, dtype=np.int64)

    cm = confusion_matrix(y_true_arr, y_pred_arr)
    # sklearn confusion_matrix layout for binary: [[TN, FP], [FN, TP]]
    tn, fp, fn, tp = cm.ravel()

    values = {
        "TP": int(tp),
        "TN": int(tn),
        "FP": int(fp),
        "FN": int(fn),
    }
    logger.info(
        "Confusion matrix  |  TP=%d  TN=%d  FP=%d  FN=%d",
        values["TP"],
        values["TN"],
        values["FP"],
        values["FN"],
    )
    return values


def generate_classification_report(
    y_true: List[int] | np.ndarray,
    y_pred: List[int] | np.ndarray,
    class_names: List[str],
    save_dir: str | Path,
    filename: str = "classification_report.txt",
) -> Path:
    """Generate and save a scikit-learn classification report as a text file.

    Args:
        y_true: Ground-truth labels.
        y_pred: Predicted labels.
        class_names: Human-readable class names (e.g. ``["Normal", "Pothole"]``).
        save_dir: Directory where the text file is written.
        filename: Output filename.

    Returns:
        Absolute path to the saved text file.
    """
    report = classification_report(
        y_true,
        y_pred,
        target_names=class_names,
        digits=4,
        zero_division=0,
    )

    save_dir = Path(save_dir)
    save_dir.mkdir(parents=True, exist_ok=True)
    save_path = save_dir / filename

    with open(save_path, "w", encoding="utf-8") as fh:
        fh.write("=" * 60 + "\n")
        fh.write("  Classification Report — Held-Out Test Set\n")
        fh.write("=" * 60 + "\n\n")
        fh.write(report)
        fh.write("\n")

    logger.info("Saved classification report to: %s", save_path)
    return save_path
