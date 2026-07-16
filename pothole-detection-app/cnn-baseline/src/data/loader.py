"""PyTorch Dataset and DataLoader loader modules."""

import logging
from pathlib import Path
from typing import List, Tuple
from PIL import Image
from torch.utils.data import Dataset, DataLoader
from src.data.augmentation import get_train_transforms, get_val_test_transforms

logger = logging.getLogger(__name__)


class PotholeDataset(Dataset):
    """PyTorch Dataset for road surface pothole classification."""

    def __init__(self, split_dir: Path, transform=None):
        """
        Args:
            split_dir: Path to the split directory (e.g., data/processed/train).
            transform: Optional transforms to apply to the images.
        """
        self.split_dir = Path(split_dir)
        self.transform = transform
        self.image_paths: List[Path] = []
        self.labels: List[int] = []

        if not self.split_dir.exists():
            raise FileNotFoundError(f"Split directory not found: {self.split_dir}")

        # Scan class subfolders
        self.class_to_idx = {"normal": 0, "pothole": 1}
        for class_name, idx in self.class_to_idx.items():
            class_dir = self.split_dir / class_name
            if not class_dir.exists():
                logger.warning(f"Class folder not found in split: {class_dir}")
                continue

            for file_path in sorted(class_dir.glob("*")):
                if file_path.suffix.lower() in {".jpg", ".jpeg", ".png"}:
                    self.image_paths.append(file_path)
                    self.labels.append(idx)

        logger.info(f"Loaded {len(self.image_paths)} images from {self.split_dir}")

    def __len__(self) -> int:
        return len(self.image_paths)

    def __getitem__(self, idx: int) -> Tuple[object, int]:
        image_path = self.image_paths[idx]
        label = self.labels[idx]

        try:
            # Load and convert to RGB (handles RGBA, Grayscale, Palettized formats)
            with Image.open(image_path) as img:
                img_rgb = img.convert("RGB")
                
                # Apply transforms
                if self.transform is not None:
                    img_tensor = self.transform(img_rgb)
                else:
                    # Fallback to no transforms
                    img_tensor = img_rgb

            return img_tensor, label
        except Exception as e:
            logger.error(f"Error loading image {image_path}: {e}")
            # Raise exception so training pipeline fails loudly on data issue
            raise e


def get_data_loaders(
    processed_dir: str | Path,
    image_size: int = 224,
    batch_size: int = 32,
    num_workers: int = 0
) -> Tuple[DataLoader, DataLoader, DataLoader]:
    """Create PyTorch DataLoader instances for train, validation, and test splits.

    Args:
        processed_dir: Path to the processed datasets directory (e.g. data/processed).
        image_size: Target image resizing dimension.
        batch_size: Batch size for loaders.
        num_workers: Number of DataLoader parallel worker threads.

    Returns:
        Tuple of (train_loader, val_loader, test_loader).
    """
    processed_dir = Path(processed_dir)

    train_dir = processed_dir / "train"
    val_dir = processed_dir / "val"
    test_dir = processed_dir / "test"

    # Define transforms
    train_transform = get_train_transforms(image_size)
    val_test_transform = get_val_test_transforms(image_size)

    # Build datasets
    train_dataset = PotholeDataset(train_dir, transform=train_transform)
    val_dataset = PotholeDataset(val_dir, transform=val_test_transform)
    test_dataset = PotholeDataset(test_dir, transform=val_test_transform)

    # Build data loaders
    train_loader = DataLoader(
        train_dataset,
        batch_size=batch_size,
        shuffle=True,
        num_workers=num_workers,
        pin_memory=True
    )

    val_loader = DataLoader(
        val_dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=True
    )

    test_loader = DataLoader(
        test_dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=True
    )

    return train_loader, val_loader, test_loader
