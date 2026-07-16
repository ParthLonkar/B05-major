"""Verification script to test PyTorch Dataset and DataLoader configurations."""

import sys
from pathlib import Path
import torch

# Ensure cnn-baseline/src is in PYTHONPATH
sys.path.append(str(Path(__file__).resolve().parents[1]))

from src.config import get_config
from src.data.loader import get_data_loaders


def main():
    project_root = Path(__file__).resolve().parents[1]

    # Load configuration
    try:
        config = get_config()
    except Exception as e:
        print(f"Error loading configuration: {e}")
        sys.exit(1)

    print("=== CONFIGURATION SETUP ===")
    print(f"Image size: {config.preprocessing['image_size']}")
    print(f"Batch size: {config.training['batch_size']}")
    print(f"Normalization: {config.preprocessing['normalization']}")

    # Build data loaders
    processed_dir = project_root / config.dataset["processed_dir"]
    print(f"\nBuilding PyTorch DataLoaders from: {processed_dir}")

    try:
        train_loader, val_loader, test_loader = get_data_loaders(
            processed_dir=processed_dir,
            image_size=config.preprocessing["image_size"],
            batch_size=config.training["batch_size"],
            num_workers=0
        )
    except Exception as e:
        print(f"Error loading dataset splits: {e}")
        sys.exit(1)

    # Print split sizes
    print("\n=== DATA SPLIT VERIFICATION ===")
    train_dataset = train_loader.dataset
    val_dataset = val_loader.dataset
    test_dataset = test_loader.dataset

    print(f"Train split size: {len(train_dataset)} images ({len(train_loader)} batches)")
    print(f"Val split size:   {len(val_dataset)} images ({len(val_loader)} batches)")
    print(f"Test split size:  {len(test_dataset)} images ({len(test_loader)} batches)")

    # Print class counts
    for split_name, ds in [("Train", train_dataset), ("Val", val_dataset), ("Test", test_dataset)]:
        potholes = sum(ds.labels)
        normal = len(ds) - potholes
        pothole_pct = (potholes / len(ds)) * 100 if len(ds) else 0
        print(f"{split_name} Split Distribution: Normal={normal}, Pothole={potholes} ({pothole_pct:.1f}%)")

    # Fetch a sample batch and verify shapes
    print("\n=== BATCH TENSOR VERIFICATION ===")
    try:
        images, labels = next(iter(train_loader))
    except Exception as e:
        print(f"Error retrieving sample batch from train loader: {e}")
        sys.exit(1)

    print(f"Image tensor shape: {list(images.shape)}  (Expected: [batch_size, channels, height, width])")
    print(f"Label tensor shape: {list(labels.shape)}  (Expected: [batch_size])")
    print(f"Image tensor dtype: {images.dtype}")
    print(f"Label tensor dtype: {labels.dtype}")

    # Inspect image tensor values to check normalization
    min_val = float(images.min())
    max_val = float(images.max())
    mean_val = float(images.mean())
    std_val = float(images.std())
    print("\n=== IMAGE TENSOR VALUE STATS (Normalization Check) ===")
    print(f"Min value:  {min_val:.4f}")
    print(f"Max value:  {max_val:.4f}")
    print(f"Mean value: {mean_val:.4f} (Expected: close to 0 under ImageNet normalization)")
    print(f"Std value:  {std_val:.4f} (Expected: close to 1 under ImageNet normalization)")

    # Check batch label class counts
    batch_potholes = int((labels == 1).sum())
    batch_normal = len(labels) - batch_potholes
    print(f"\nBatch Class Distribution: Normal={batch_normal}, Pothole={batch_potholes}")

    print("\nPipeline verification successful. Data loaders are correctly configured and working.")


if __name__ == "__main__":
    main()
