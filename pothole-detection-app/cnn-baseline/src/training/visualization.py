"""Training visualization utilities using matplotlib.

Provides functions to generate and save training progress plots, including
loss curves, evaluation metrics, and learning rate progression.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, List

import matplotlib.pyplot as plt

logger = logging.getLogger(__name__)


def generate_training_plots(
    history: Dict[str, List[Any]], plot_dir: str | Path
) -> None:
    """Generate and save training progress plots.

    Saves three plots under the specified plot directory:
      1. loss_curves.png: Training vs. Validation Loss
      2. metric_curves.png: Accuracy, Precision, Recall, and F1 Score
      3. lr_curve.png: Learning Rate progression (if scheduler tracking exists)

    Args:
        history: Dictionary containing training history lists.
        plot_dir: Path to the directory where plots should be saved.
    """
    plot_dir = Path(plot_dir)
    plot_dir.mkdir(parents=True, exist_ok=True)

    # Use epoch numbers for x-axis if logged, otherwise fallback to 1-indexed count
    epochs = history.get("epoch")
    if not epochs or len(epochs) == 0:
        logger.warning("No epochs found in history. Skipping plot generation.")
        return
    
    num_epochs = len(epochs)
    x_ticks = epochs

    # 1. Loss Curves (Train Loss vs Val Loss)
    train_loss = history.get("train_loss", [])
    val_loss = history.get("val_loss", [])

    if train_loss and val_loss:
        plt.figure(figsize=(8, 5))
        plt.plot(x_ticks, train_loss, label="Training Loss", color="#1f77b4", marker="o", linewidth=2)
        plt.plot(x_ticks, val_loss, label="Validation Loss", color="#ff7f0e", marker="s", linewidth=2)
        
        plt.title("Training and Validation Loss", fontsize=14, fontweight="bold", pad=12)
        plt.xlabel("Epoch", fontsize=12)
        plt.ylabel("Loss", fontsize=12)
        plt.xticks(x_ticks)
        plt.grid(True, linestyle="--", alpha=0.6)
        plt.legend(fontsize=10, loc="upper right")
        plt.tight_layout()
        
        loss_path = plot_dir / "loss_curves.png"
        plt.savefig(loss_path, dpi=150)
        plt.close()
        logger.info("Saved loss curves plot to: %s", loss_path)

    # 2. Metric Curves (Accuracy, Precision, Recall, F1)
    val_accuracy = history.get("val_accuracy", [])
    val_precision = history.get("val_precision", [])
    val_recall = history.get("val_recall", [])
    val_f1 = history.get("val_f1", [])

    if val_accuracy:
        plt.figure(figsize=(9, 5.5))
        plt.plot(x_ticks, val_accuracy, label="Accuracy", color="#2ca02c", marker="o", linewidth=2)
        
        if val_precision:
            plt.plot(x_ticks, val_precision, label="Precision", color="#d62728", marker="s", linewidth=1.5, linestyle="--")
        if val_recall:
            plt.plot(x_ticks, val_recall, label="Recall", color="#9467bd", marker="^", linewidth=1.5, linestyle="--")
        if val_f1:
            plt.plot(x_ticks, val_f1, label="F1 Score", color="#8c564b", marker="v", linewidth=2)
            
        plt.title("Validation Metrics Progression", fontsize=14, fontweight="bold", pad=12)
        plt.xlabel("Epoch", fontsize=12)
        plt.ylabel("Score (%)", fontsize=12)
        plt.ylim(-5, 105)  # Percentage boundary
        plt.xticks(x_ticks)
        plt.grid(True, linestyle="--", alpha=0.6)
        plt.legend(fontsize=10, loc="lower left")
        plt.tight_layout()
        
        metrics_path = plot_dir / "metric_curves.png"
        plt.savefig(metrics_path, dpi=150)
        plt.close()
        logger.info("Saved metric curves plot to: %s", metrics_path)

    # 3. Learning Rate Curve
    lr = history.get("learning_rate", [])
    if lr:
        plt.figure(figsize=(8, 4))
        plt.plot(x_ticks, lr, label="Learning Rate", color="#e377c2", marker="o", linewidth=2)
        
        plt.title("Learning Rate Progression", fontsize=14, fontweight="bold", pad=12)
        plt.xlabel("Epoch", fontsize=12)
        plt.ylabel("LR", fontsize=12)
        plt.yscale("log")  # LR changes are usually order-of-magnitude steps
        plt.xticks(x_ticks)
        plt.grid(True, linestyle="--", alpha=0.6, which="both")
        plt.legend(fontsize=10, loc="lower left")
        plt.tight_layout()
        
        lr_path = plot_dir / "lr_curve.png"
        plt.savefig(lr_path, dpi=150)
        plt.close()
        logger.info("Saved learning rate progression plot to: %s", lr_path)
