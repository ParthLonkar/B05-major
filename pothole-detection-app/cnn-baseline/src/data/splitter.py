"""Stratified dataset splitter and file consolidation runner."""

import json
import logging
import shutil
from pathlib import Path
from typing import Dict, List, Tuple
from sklearn.model_selection import train_test_split

logger = logging.getLogger(__name__)


class DatasetSplitter:
    """Handles splitting and disk consolidation of classification images using stratified splits."""

    def __init__(self, train_ratio: float = 0.70, val_ratio: float = 0.15, test_ratio: float = 0.15, seed: int = 42):
        self.train_ratio = train_ratio
        self.val_ratio = val_ratio
        self.test_ratio = test_ratio
        self.seed = seed

        total_ratio = train_ratio + val_ratio + test_ratio
        if not (0.99 <= total_ratio <= 1.01):
            raise ValueError(f"Split ratios must sum to 1.0, got: {total_ratio}")

    def split(self, image_paths: List[Path]) -> Tuple[List[Path], List[Path], List[Path]]:
        """Split a list of unique image paths into train, validation, and test splits.

        Ratios are stratified by parent folder type ("potholes" vs "normal").

        Args:
            image_paths: List of unique image Paths.

        Returns:
            Tuple of (train_paths, val_paths, test_paths).
        """
        labels = []
        for path in image_paths:
            is_pothole = "potholes" in path.parent.name.lower() or "pothole" in path.parent.name.lower()
            labels.append("pothole" if is_pothole else "normal")

        # First stage: Split train and temp (val + test)
        temp_ratio = self.val_ratio + self.test_ratio
        train_paths, temp_paths, _, temp_labels = train_test_split(
            image_paths,
            labels,
            test_size=temp_ratio,
            random_state=self.seed,
            stratify=labels
        )

        # Second stage: Split validation and test from temp
        val_relative_ratio = self.val_ratio / temp_ratio
        val_paths, test_paths, _, _ = train_test_split(
            temp_paths,
            temp_labels,
            test_size=1.0 - val_relative_ratio,
            random_state=self.seed,
            stratify=temp_labels
        )

        logger.info(
            f"Dataset split complete: train={len(train_paths)}, "
            f"val={len(val_paths)}, test={len(test_paths)}"
        )
        return train_paths, val_paths, test_paths

    def copy_and_rename_splits(
        self,
        splits: Dict[str, List[Path]],
        output_dir: Path,
        class_names: List[str]
    ) -> Dict[str, List[str]]:
        """Consolidate, rename, and copy split files to the processed output directory.

        Args:
            splits: Dict mapping split name ("train", "val", "test") to lists of source Paths.
            output_dir: Directory path where processed files should be copied.
            class_names: Expected class labels.

        Returns:
            Dict mapping split name to list of new processed filenames.
        """
        manifest_paths = {split: [] for split in splits}

        # Ensure clean directories
        if output_dir.exists():
            logger.info(f"Cleaning existing processed directory: {output_dir}")
            shutil.rmtree(output_dir)

        for split_name, paths in splits.items():
            counters = {cls_name: 1 for cls_name in class_names}

            for path in paths:
                is_pothole = "potholes" in path.parent.name.lower() or "pothole" in path.parent.name.lower()
                cls_name = "pothole" if is_pothole else "normal"

                dest_folder = output_dir / split_name / cls_name
                dest_folder.mkdir(parents=True, exist_ok=True)

                new_filename = f"{cls_name}_{counters[cls_name]:03d}{path.suffix.lower()}"
                counters[cls_name] += 1

                dest_path = dest_folder / new_filename
                shutil.copy2(path, dest_path)

                relative_manifest_path = f"{split_name}/{cls_name}/{new_filename}"
                manifest_paths[split_name].append(relative_manifest_path)

        return manifest_paths

    def save_manifest(self, manifest_data: dict, manifest_path: Path) -> None:
        """Save the split manifest to a JSON file."""
        manifest_path.parent.mkdir(parents=True, exist_ok=True)
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest_data, f, indent=2)
        logger.info(f"Dataset split manifest saved to: {manifest_path}")
