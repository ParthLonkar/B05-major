"""Custom PyTorch Dataset class for road surface pothole classification."""

import logging
from pathlib import Path
from typing import List, Tuple
from PIL import Image
from torch.utils.data import Dataset

logger = logging.getLogger(__name__)


class PotholeDataset(Dataset):
    """Custom dataset class loading road surface images for binary classification."""

    def __init__(self, split_dir: str | Path, transform=None):
        """Initialize the dataset loading image paths and binary labels.

        Args:
            split_dir: Path to the specific split folder (e.g. data/processed/train).
            transform: Transformations to apply to the images.
        """
        self.split_dir = Path(split_dir)
        self.transform = transform
        self.image_paths: List[Path] = []
        self.labels: List[int] = []

        if not self.split_dir.exists():
            raise FileNotFoundError(f"Split directory does not exist: {self.split_dir}")

        # Label encoding: 0 = normal (no pothole), 1 = pothole
        self.class_to_idx = {"normal": 0, "pothole": 1}
        self.idx_to_class = {0: "normal", 1: "pothole"}

        self._load_dataset()

    def _load_dataset(self) -> None:
        """Scan folder subdirectories and populate file paths and labels."""
        for class_name, idx in self.class_to_idx.items():
            class_folder = self.split_dir / class_name
            if not class_folder.exists():
                logger.warning(f"Class folder not found in split directory: {class_folder}")
                continue

            for file_path in sorted(class_folder.glob("*")):
                if file_path.suffix.lower() in {".jpg", ".jpeg", ".png"}:
                    self.image_paths.append(file_path)
                    self.labels.append(idx)

        logger.info(f"Initialized PotholeDataset for '{self.split_dir.name}' split: "
                    f"{len(self.image_paths)} images loaded.")

    def __len__(self) -> int:
        """Return total number of samples."""
        return len(self.image_paths)

    def __getitem__(self, idx: int) -> Tuple[object, int]:
        """Fetch, load, and preprocess an image.

        Args:
            idx: Index of the image.

        Returns:
            Tuple of (preprocessed_image_tensor, label_int).
        """
        img_path = self.image_paths[idx]
        label = self.labels[idx]

        try:
            # Read and convert PIL Image to RGB (ensures 3 channels)
            with Image.open(img_path) as img:
                img_rgb = img.convert("RGB")
                
                # Apply PyTorch transformation pipeline
                if self.transform is not None:
                    img_tensor = self.transform(img_rgb)
                else:
                    img_tensor = img_rgb
            
            return img_tensor, label
        except Exception as e:
            logger.error(f"Failed to load image at: {img_path}. Error: {e}")
            raise e
