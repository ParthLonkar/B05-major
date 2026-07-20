"""Evaluation metrics computation for the test evaluation pipeline.

Provides a single entry-point function that accepts ground-truth and predicted
label arrays and returns a flat dictionary of classification metrics:
  - Accuracy (%)
  - Precision (%)
  - Recall (%)
  - F1 Score (%)

These utilities are intentionally **independent** of the training pipeline's
``src.training.metrics`` module.  While the underlying scikit-learn calls are
similar, decoupling the two keeps the evaluation package self-contained and
avoids accidental cross-pipeline imports.
"""

from __future__ import annotations

import logging
from typing import Dict, List

import numpy as np
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score

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
