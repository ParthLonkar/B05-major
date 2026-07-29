"""Custom PyTorch Dataset class for road surface pothole classification."""

import logging
from pathlib import Path
from typing import List, Tuple
from PIL import Image
import numpy as np
import torch
from torchvision.transforms.functional import to_pil_image
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

        # Try to load cached dataset files if they exist
        self.cached_tensors = None
        split_name = self.split_dir.name
        cache_path = self.split_dir.parent / f"{split_name}_cached.pt"
        if cache_path.exists():
            logger.info(f"Loading cached dataset from {cache_path}...")
            import torch
            try:
                cached_data = torch.load(cache_path, map_location="cpu")
                self.cached_tensors = cached_data["tensors"]
                self.labels = cached_data["labels"]
                self.image_paths = [Path(p) for p in cached_data["paths"]]
                logger.info(f"Initialized PotholeDataset for '{split_name}' split using cache: "
                            f"{len(self.cached_tensors)} images loaded.")
            except Exception as e:
                logger.warning(f"Failed to load dataset cache from {cache_path}: {e}. "
                               "Falling back to directory scanning.")
                self.cached_tensors = None
                self.image_paths = []
                self.labels = []
                self._load_dataset()
        else:
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
        label = self.labels[idx]

        try:
            img_path = self.image_paths[idx]
            npy_path = None
            try:
                abs_img_path = img_path.resolve()
                abs_processed_dir = self.split_dir.parent.resolve()
                rel_path = abs_img_path.relative_to(abs_processed_dir)
                npy_path = (abs_processed_dir.parent / "processed_npy_cache" / rel_path).with_suffix(".npy")
            except Exception:
                pass

            if npy_path is not None and npy_path.exists():
                arr = np.load(npy_path)
                tensor = torch.from_numpy(arr)
                img_rgb = to_pil_image(tensor)
            elif self.cached_tensors is not None:
                img_rgb = to_pil_image(self.cached_tensors[idx])
            else:
                with Image.open(img_path) as img:
                    img_rgb = img.convert("RGB")
                
            # Apply PyTorch transformation pipeline
            if self.transform is not None:
                img_tensor = self.transform(img_rgb)
            else:
                img_tensor = img_rgb
            
            return img_tensor, label
        except Exception as e:
            img_path = self.image_paths[idx] if self.cached_tensors is None else f"cached_index_{idx}"
            logger.error(f"Failed to load image at: {img_path}. Error: {e}")
            raise e

