"""Dataset validation module for integrity, folder structure, corruption, and duplicates checking."""

import hashlib
import logging
from pathlib import Path
from typing import Dict, List, Tuple
from PIL import Image

logger = logging.getLogger(__name__)


class DatasetValidator:
    """Validator class to inspect raw image dataset directories."""

    def __init__(self, source_dir: str | Path):
        self.source_dir = Path(source_dir)

    def verify_existence(self) -> bool:
        """Verify the root dataset directory exists."""
        if not self.source_dir.exists():
            logger.error(f"Dataset root directory does not exist: {self.source_dir}")
            return False
        return True

    def validate_folder_structure(self) -> bool:
        """Verify the expected subfolders are present."""
        expected_paths = [
            self.source_dir / "images" / "train" / "potholes",
            self.source_dir / "images" / "train" / "normal",
            self.source_dir / "images" / "val" / "potholes",
        ]
        
        valid = True
        for path in expected_paths:
            if not path.exists():
                logger.error(f"Expected dataset subdirectory not found: {path}")
                valid = False
        return valid

    def check_images(self, image_folders: List[Tuple[str, Path]]) -> Tuple[List[Path], List[Path]]:
        """Identify corrupt and valid images in the given subdirectories.

        Args:
            image_folders: List of tuples containing (class_label, folder_path).

        Returns:
            Tuple of (valid_image_paths, corrupt_image_paths).
        """
        valid_paths = []
        corrupt_paths = []

        for label, folder in image_folders:
            if not folder.exists():
                continue
            
            for file_path in sorted(folder.glob("*")):
                if file_path.suffix.lower() not in {".jpg", ".jpeg", ".png"}:
                    continue
                
                try:
                    # Test image reading integrity
                    with Image.open(file_path) as img:
                        img.verify()
                    valid_paths.append(file_path)
                except Exception as e:
                    logger.error(f"Corrupt image detected: {file_path} - Error: {e}")
                    corrupt_paths.append(file_path)

        return valid_paths, corrupt_paths

    def find_duplicates(self, image_paths: List[Path]) -> Tuple[List[Path], List[Path]]:
        """Identify duplicate images using MD5 hashing of content.

        Args:
            image_paths: List of candidate image paths to inspect.

        Returns:
            Tuple of (unique_image_paths, duplicate_image_paths).
        """
        seen_hashes: Dict[str, Path] = {}
        unique_paths = []
        duplicate_paths = []

        for file_path in sorted(image_paths):
            try:
                hasher = hashlib.md5()
                with open(file_path, "rb") as f:
                    for chunk in iter(lambda: f.read(4096), b""):
                        hasher.update(chunk)
                
                file_hash = hasher.hexdigest()
                
                if file_hash in seen_hashes:
                    logger.info(f"Duplicate content found: {file_path} is identical to {seen_hashes[file_hash]}")
                    duplicate_paths.append(file_path)
                else:
                    seen_hashes[file_hash] = file_path
                    unique_paths.append(file_path)
            except Exception as e:
                logger.error(f"Failed to hash file {file_path}: {e}")
                # Keep it in unique list for further steps if hashing fails, or log it
                unique_paths.append(file_path)

        return unique_paths, duplicate_paths

    def generate_distribution_report(self, image_paths: List[Path]) -> Dict[str, int]:
        """Report count and percentage per class in the dataset.

        Args:
            image_paths: List of image paths.

        Returns:
            Dict containing class count stats.
        """
        counts = {"pothole": 0, "normal": 0}
        for path in image_paths:
            is_pothole = "potholes" in path.parent.name.lower() or "pothole" in path.parent.name.lower()
            cls_name = "pothole" if is_pothole else "normal"
            counts[cls_name] = counts.get(cls_name, 0) + 1

        total = sum(counts.values())
        logger.info(f"Class Distribution: Total={total}")
        for cls_name, cnt in counts.items():
            pct = (cnt / total * 100) if total > 0 else 0
            logger.info(f"  Class '{cls_name}': Count={cnt} ({pct:.1f}%)")
            
        return counts
