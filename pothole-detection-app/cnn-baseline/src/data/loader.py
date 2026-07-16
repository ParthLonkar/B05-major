"""PyTorch DataLoader utilities for pothole classification."""

import logging
from pathlib import Path
from typing import Tuple
import torch
from torch.utils.data import DataLoader
from src.data.dataset import PotholeDataset
from src.data.transforms import TransformsFactory

logger = logging.getLogger(__name__)


def build_data_loaders(
    processed_dir: str | Path,
    image_size: int = 224,
    batch_size: int = 32,
    num_workers: int = 0
) -> Tuple[DataLoader, DataLoader, DataLoader]:
    """Build PyTorch DataLoader objects for train, val, and test splits.

    Args:
        processed_dir: Path to the processed directory containing splits.
        image_size: Target dimension for resizing.
        batch_size: Batch size.
        num_workers: Number of DataLoader parallel worker threads.

    Returns:
        Tuple of (train_loader, val_loader, test_loader).
    """
    processed_dir = Path(processed_dir)

    train_dir = processed_dir / "train"
    val_dir = processed_dir / "val"
    test_dir = processed_dir / "test"

    # Instantiate transformation factories
    factory = TransformsFactory(image_size)
    train_transform = factory.get_train_transforms()
    val_test_transform = factory.get_val_test_transforms()

    # Create PyTorch datasets
    train_dataset = PotholeDataset(train_dir, transform=train_transform)
    val_dataset = PotholeDataset(val_dir, transform=val_test_transform)
    test_dataset = PotholeDataset(test_dir, transform=val_test_transform)

    # Determine optimization configs
    cuda_available = torch.cuda.is_available()
    pin_memory = cuda_available
    persistent_workers = num_workers > 0

    logger.info(f"DataLoader optimization: pin_memory={pin_memory}, "
                f"persistent_workers={persistent_workers}, num_workers={num_workers}")

    # Build data loaders
    train_loader = DataLoader(
        train_dataset,
        batch_size=batch_size,
        shuffle=True,
        num_workers=num_workers,
        pin_memory=pin_memory,
        persistent_workers=persistent_workers
    )

    val_loader = DataLoader(
        val_dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=pin_memory,
        persistent_workers=persistent_workers
    )

    test_loader = DataLoader(
        test_dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=pin_memory,
        persistent_workers=persistent_workers
    )

    return train_loader, val_loader, test_loader
