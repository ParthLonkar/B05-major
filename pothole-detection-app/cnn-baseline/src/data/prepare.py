"""Dataset preparation module for deduplication, stratified splitting, and consolidation."""

import hashlib
import json
import logging
import shutil
from pathlib import Path
from typing import Dict, List, Tuple
from sklearn.model_selection import train_test_split

logger = logging.getLogger(__name__)


def compute_file_hash(file_path: Path) -> str:
    """Compute MD5 hash of a file to check for content duplicates."""
    hasher = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def find_and_remove_duplicates(image_folders: List[Tuple[str, Path]]) -> List[Path]:
    """Find within-class duplicate images and return a list of paths to keep.

    Args:
        image_folders: List of tuples containing (class_label, folder_path).

    Returns:
        List of unique image file Paths.
    """
    seen_hashes = {}
    unique_paths = []
    removed_count = 0

    for label, folder in image_folders:
        if not folder.exists():
            logger.warning(f"Folder {folder} does not exist. Skipping duplicate check.")
            continue

        # Sort files to ensure deterministic selection of duplicate to keep
        for file_path in sorted(folder.glob("*")):
            if file_path.suffix.lower() not in {".jpg", ".jpeg", ".png"}:
                continue

            file_hash = compute_file_hash(file_path)
            if file_hash in seen_hashes:
                # Duplicate found
                original_label, original_name = seen_hashes[file_hash]
                logger.info(
                    f"Duplicate found: {label}/{file_path.name} is identical to "
                    f"{original_label}/{original_name}. Skipping duplicate copy."
                )
                removed_count += 1
            else:
                seen_hashes[file_hash] = (label, file_path.name)
                unique_paths.append(file_path)

    logger.info(f"Deduplication complete. Identified and removed {removed_count} duplicate files.")
    return unique_paths


def perform_stratified_split(
    image_paths: List[Path],
    split_ratios: Dict[str, float],
    seed: int
) -> Tuple[List[Path], List[Path], List[Path]]:
    """Perform a stratified random split into train, validation, and test sets.

    Args:
        image_paths: List of unique image paths.
        split_ratios: Dict containing train, val, and test ratios.
        seed: Random seed for reproducibility.

    Returns:
        Tuple of (train_paths, val_paths, test_paths).
    """
    # Extract labels from path names
    labels = []
    for path in image_paths:
        # Determine class based on parent directory name
        if "potholes" in path.parent.name.lower() or "pothole" in path.parent.name.lower():
            labels.append("pothole")
        else:
            labels.append("normal")

    train_ratio = split_ratios["train"]
    val_ratio = split_ratios["val"]
    test_ratio = split_ratios["test"]

    # First split: train and temp (val + test)
    temp_ratio = val_ratio + test_ratio
    train_paths, temp_paths, train_labels, temp_labels = train_test_split(
        image_paths,
        labels,
        test_size=temp_ratio,
        random_state=seed,
        stratify=labels
    )

    # Second split: validation and test from temp
    val_relative_ratio = val_ratio / temp_ratio
    val_paths, test_paths, _, _ = train_test_split(
        temp_paths,
        temp_labels,
        test_size=1.0 - val_relative_ratio,
        random_state=seed,
        stratify=temp_labels
    )

    logger.info(
        f"Stratified split complete (Seed {seed}): "
        f"Train={len(train_paths)}, Val={len(val_paths)}, Test={len(test_paths)}"
    )
    return train_paths, val_paths, test_paths


def copy_and_rename_splits(
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
        # Counters for prefix naming collision avoidance
        counters = {cls_name: 1 for cls_name in class_names}

        for path in paths:
            # Determine normalized class name
            is_pothole = "potholes" in path.parent.name.lower() or "pothole" in path.parent.name.lower()
            cls_name = "pothole" if is_pothole else "normal"

            # Create destination folder structure: data/processed/<split>/<class>/
            dest_folder = output_dir / split_name / cls_name
            dest_folder.mkdir(parents=True, exist_ok=True)

            # Define new renamed filename: e.g., pothole_001.jpg
            new_filename = f"{cls_name}_{counters[cls_name]:03d}{path.suffix.lower()}"
            counters[cls_name] += 1

            dest_path = dest_folder / new_filename
            shutil.copy2(path, dest_path)

            # Record relative path for the manifest
            relative_manifest_path = f"{split_name}/{cls_name}/{new_filename}"
            manifest_paths[split_name].append(relative_manifest_path)

    return manifest_paths


def save_manifest(manifest_data: dict, manifest_path: Path) -> None:
    """Save the split manifest to a JSON file."""
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest_data, f, indent=2)
    logger.info(f"Dataset split manifest saved to: {manifest_path}")
