"""Evaluation visualization utilities using matplotlib.

Generates professional plots for the test evaluation pipeline:
  - Confusion matrix heatmap (``confusion_matrix.png``)
  - ROC curve with AUC annotation (``roc_curve.png``)

All functions are pure utilities — they accept pre-computed data arrays and
a save directory, and produce ``.png`` files.  No model or DataLoader
interaction happens here.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import List, Sequence

import matplotlib.pyplot as plt
import numpy as np

logger = logging.getLogger(__name__)


def plot_confusion_matrix(
    y_true: Sequence[int] | np.ndarray,
    y_pred: Sequence[int] | np.ndarray,
    class_names: List[str],
    save_dir: str | Path,
    filename: str = "confusion_matrix.png",
) -> Path:
    """Plot and save a confusion matrix heatmap.

    The matrix is rendered as a colour-coded grid with per-cell count
    annotations and axis labels derived from *class_names*.

    Args:
        y_true: Ground-truth labels.
        y_pred: Predicted labels.
        class_names: Human-readable class names (e.g. ``["Normal", "Pothole"]``).
        save_dir: Directory where the image file is written.
        filename: Output filename (default: ``confusion_matrix.png``).

    Returns:
        Absolute path to the saved plot.
    """
    from sklearn.metrics import confusion_matrix

    cm = confusion_matrix(y_true, y_pred)
    num_classes = len(class_names)

    fig, ax = plt.subplots(figsize=(6, 5))

    # Colour-coded heatmap using Blues colourmap
    cax = ax.imshow(cm, interpolation="nearest", cmap=plt.cm.Blues)
    fig.colorbar(cax, ax=ax, fraction=0.046, pad=0.04)

    # Axis ticks and labels
    tick_marks = np.arange(num_classes)
    ax.set_xticks(tick_marks)
    ax.set_xticklabels(class_names, fontsize=11)
    ax.set_yticks(tick_marks)
    ax.set_yticklabels(class_names, fontsize=11)

    # Per-cell count annotations
    thresh = cm.max() / 2.0
    for i in range(num_classes):
        for j in range(num_classes):
            colour = "white" if cm[i, j] > thresh else "black"
            ax.text(
                j,
                i,
                f"{cm[i, j]}",
                ha="center",
                va="center",
                fontsize=16,
                fontweight="bold",
                color=colour,
            )

    ax.set_xlabel("Predicted Label", fontsize=12, labelpad=10)
    ax.set_ylabel("True Label", fontsize=12, labelpad=10)
    ax.set_title("Confusion Matrix — Test Set", fontsize=14, fontweight="bold", pad=14)

    plt.tight_layout()

    save_dir = Path(save_dir)
    save_dir.mkdir(parents=True, exist_ok=True)
    save_path = save_dir / filename
    fig.savefig(save_path, dpi=150)
    plt.close(fig)

    logger.info("Saved confusion matrix plot to: %s", save_path)
    return save_path


def plot_roc_curve(
    y_true: Sequence[int] | np.ndarray,
    y_prob: Sequence[float] | np.ndarray,
    roc_auc: float,
    save_dir: str | Path,
    filename: str = "roc_curve.png",
) -> Path:
    """Plot and save the Receiver Operating Characteristic (ROC) curve.

    The plot includes a diagonal baseline (random classifier) and an
    annotation with the ROC-AUC score.

    Args:
        y_true: Ground-truth binary labels.
        y_prob: Predicted probabilities for the **positive class** (class 1).
        roc_auc: Pre-computed ROC-AUC score (0–1 scale).
        save_dir: Directory where the image file is written.
        filename: Output filename (default: ``roc_curve.png``).

    Returns:
        Absolute path to the saved plot.
    """
    from sklearn.metrics import roc_curve as sk_roc_curve

    fpr, tpr, _ = sk_roc_curve(y_true, y_prob)

    fig, ax = plt.subplots(figsize=(7, 6))

    # ROC curve
    ax.plot(
        fpr,
        tpr,
        color="#1f77b4",
        linewidth=2.5,
        label=f"ROC Curve (AUC = {roc_auc:.4f})",
    )

    # Random baseline
    ax.plot(
        [0, 1],
        [0, 1],
        color="grey",
        linewidth=1.2,
        linestyle="--",
        label="Random Classifier",
    )

    ax.set_xlim([-0.02, 1.02])
    ax.set_ylim([-0.02, 1.02])
    ax.set_xlabel("False Positive Rate", fontsize=12, labelpad=10)
    ax.set_ylabel("True Positive Rate", fontsize=12, labelpad=10)
    ax.set_title(
        "ROC Curve — Test Set",
        fontsize=14,
        fontweight="bold",
        pad=14,
    )
    ax.legend(fontsize=11, loc="lower right")
    ax.grid(True, linestyle="--", alpha=0.5)

    plt.tight_layout()

    save_dir = Path(save_dir)
    save_dir.mkdir(parents=True, exist_ok=True)
    save_path = save_dir / filename
    fig.savefig(save_path, dpi=150)
    plt.close(fig)

    logger.info("Saved ROC curve plot to: %s", save_path)
    return save_path
