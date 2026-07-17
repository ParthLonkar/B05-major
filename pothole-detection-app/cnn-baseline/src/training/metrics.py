"""Metrics calculation and training history persistence utilities.

This module provides tools for computing validation metrics (accuracy, precision,
recall, and F1 score) using scikit-learn, and saving the structured history
of these metrics to CSV and JSON formats on disk.
"""

from __future__ import annotations

import csv
import json
import logging
from pathlib import Path
from typing import Any, Dict, List

import numpy as np
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score

logger = logging.getLogger(__name__)


def compute_metrics(
    y_true: List[int] | np.ndarray, y_pred: List[int] | np.ndarray
) -> Dict[str, float]:
    """Calculate validation metrics for binary pothole classification.

    Args:
        y_true: True binary labels (0 = normal, 1 = pothole).
        y_pred: Predicted binary labels.

    Returns:
        Dict containing:
            - "accuracy": Validation accuracy (%)
            - "precision": Validation precision (%)
            - "recall": Validation recall (%)
            - "f1": Validation F1 score (%)
    """
    y_true_arr = np.asarray(y_true)
    y_pred_arr = np.asarray(y_pred)

    accuracy = float(accuracy_score(y_true_arr, y_pred_arr)) * 100.0
    # Use zero_division=0 to prevent warnings or errors when no positive class is predicted/present
    precision = float(precision_score(y_true_arr, y_pred_arr, average="binary", zero_division=0)) * 100.0
    recall = float(recall_score(y_true_arr, y_pred_arr, average="binary", zero_division=0)) * 100.0
    f1 = float(f1_score(y_true_arr, y_pred_arr, average="binary", zero_division=0)) * 100.0

    return {
        "accuracy": accuracy,
        "precision": precision,
        "recall": recall,
        "f1": f1,
    }


def save_history(
    history: Dict[str, List[Any]], save_dir: str | Path, base_filename: str = "metrics"
) -> None:
    """Save training history metrics to both CSV and JSON formats.

    Args:
        history: Dictionary containing training metrics lists.
        save_dir: Directory where the history files should be saved.
        base_filename: Base filename (without extension) for the files.
    """
    save_dir = Path(save_dir)
    save_dir.mkdir(parents=True, exist_ok=True)

    csv_path = save_dir / f"{base_filename}.csv"
    json_path = save_dir / f"{base_filename}.json"

    # Make sure we have some keys in the history
    keys = list(history.keys())
    if not keys:
        logger.warning("Attempted to save empty training history.")
        return

    # Determine number of epoch rows to write
    num_epochs = len(history[keys[0]])

    # 1. Save to CSV
    try:
        with open(csv_path, mode="w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(keys)
            for i in range(num_epochs):
                row = [history[key][i] for key in keys]
                writer.writerow(row)
        logger.info("Saved structured training history to CSV: %s", csv_path)
    except Exception as e:
        logger.error("Failed to save training history to CSV: %s", e)

    # 2. Save to JSON
    try:
        with open(json_path, mode="w", encoding="utf-8") as f:
            json.dump(history, f, indent=2)
        logger.info("Saved structured training history to JSON: %s", json_path)
    except Exception as e:
        logger.error("Failed to save training history to JSON: %s", e)
