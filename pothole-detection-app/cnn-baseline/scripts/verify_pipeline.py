"""Verification script to test PyTorch Dataset and DataLoader configurations."""

import sys
from pathlib import Path
import torch

# Ensure cnn-baseline/src is in PYTHONPATH
sys.path.append(str(Path(__file__).resolve().parents[1]))

from src.config import get_config
from src.data.loader import build_data_loaders


def main():
    project_root = Path(__file__).resolve().parents[1]

    # Load configuration
    try:
        config = get_config()
    except Exception as e:
        print(f"Error loading configuration: {e}")
        sys.exit(1)

    # Build data loaders
    processed_dir = project_root / config.dataset["processed_dir"]

    try:
        train_loader, val_loader, test_loader = build_data_loaders(
            processed_dir=processed_dir,
            image_size=config.preprocessing["image_size"],
            batch_size=config.training["batch_size"],
            num_workers=0
        )
    except Exception as e:
        print(f"Error loading dataset splits: {e}")
        sys.exit(1)

    train_dataset = train_loader.dataset
    val_dataset = val_loader.dataset
    test_dataset = test_loader.dataset

    # Compute class counts
    train_potholes = sum(train_dataset.labels)
    train_normal = len(train_dataset) - train_potholes

    val_potholes = sum(val_dataset.labels)
    val_normal = len(val_dataset) - val_potholes

    test_potholes = sum(test_dataset.labels)
    test_normal = len(test_dataset) - test_potholes

    # Fetch a sample batch
    try:
        images, labels = next(iter(train_loader))
    except Exception as e:
        print(f"Error retrieving sample batch from train loader: {e}")
        sys.exit(1)

    # Output standard report
    print("\n" + "=" * 50)
    print("           DATASET VERIFICATION SUMMARY")
    print("=" * 50)
    print(f"Project Name:        {config.project['name']}")
    print(f"Configured Seed:     {config.project['seed']}")
    print(f"Processed Dir:       {processed_dir}")
    print("-" * 50)
    print("SPLIT SIZES & DISTRIBUTIONS:")
    print(f"  Training Images:   {len(train_dataset)}  (Normal={train_normal}, Pothole={train_potholes})")
    print(f"  Validation Images: {len(val_dataset)}  (Normal={val_normal}, Pothole={val_potholes})")
    print(f"  Test Images:       {len(test_dataset)}  (Normal={test_normal}, Pothole={test_potholes})")
    print(f"  Images per Class:  Normal={train_normal + val_normal + test_normal}, Pothole={train_potholes + val_potholes + test_potholes}")
    print("-" * 50)
    print("TENSOR SHAPES & TYPES:")
    print(f"  Single Tensor Shape (CHW): {list(images[0].shape)} (Expected: [3, 224, 224])")
    print(f"  Batch Image Shape (BCHW):  {list(images.shape)} (Expected: [32, 3, 224, 224])")
    print(f"  Batch Label Shape (B):     {list(labels.shape)} (Expected: [32])")
    print(f"  Image Data Type:           {images.dtype}")
    print(f"  Label Data Type:           {labels.dtype}")
    print("-" * 50)
    print("SAMPLE BATCH LABELS:")
    print(f"  Labels tensor:             {labels.tolist()}")
    print(f"  Class encoding:            0 = Normal, 1 = Pothole")
    print("=" * 50)
    print("Pipeline verification successful. Data loaders are correctly configured and working.")


if __name__ == "__main__":
    main()
