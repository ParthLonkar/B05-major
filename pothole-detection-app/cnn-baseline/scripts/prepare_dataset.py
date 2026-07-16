"""CLI script to prepare and split the road surface dataset."""

import argparse
import json
import logging
import random
import sys
from pathlib import Path
import numpy as np
import torch

# Ensure cnn-baseline/src is in PYTHONPATH
sys.path.append(str(Path(__file__).resolve().parents[1]))

from src.config import get_config
from src.data.prepare import (
    find_and_remove_duplicates,
    perform_stratified_split,
    copy_and_rename_splits,
    save_manifest
)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


def set_seed(seed: int) -> None:
    """Set random seed for reproducibility across all libraries."""
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)
    logger.info(f"Random seed set to: {seed}")


def locate_source_dataset(configured_path: str, project_root: Path) -> Path:
    """Robustly locate the source dataset directory.

    Attempts to locate the dataset path either via absolute resolution, relative
    to the configured path, or in fallback locations.
    """
    path_candidates = [
        project_root / configured_path,  # Path relative to project root
        project_root.parent / "datasets" / "kaggle_potholes",  # Sibling directory datasets folder
        project_root.parent / "pothole-detection-app" / "datasets" / "kaggle_potholes",
        project_root.parents[1] / "datasets" / "kaggle_potholes",
        Path(configured_path).resolve()  # Absolute resolution
    ]

    for candidate in path_candidates:
        if candidate.exists() and (candidate / "images").exists():
            logger.info(f"Located source dataset directory at: {candidate}")
            return candidate.resolve()

    raise FileNotFoundError(
        f"Could not locate source dataset containing 'images/' folder. "
        f"Checked paths: {[str(p) for p in path_candidates]}"
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Prepare and split the road surface dataset.")
    parser.add_argument("--config", default=None, help="Path to config.yaml file.")
    args = parser.parse_args()

    project_root = Path(__file__).resolve().parents[1]

    try:
        config = get_config(args.config)
    except Exception as e:
        logger.error(f"Failed to load config: {e}")
        return 1

    # Initialize environment logging to file in addition to console
    log_dir = project_root / config.outputs["log_dir"]
    log_dir.mkdir(parents=True, exist_ok=True)
    file_handler = logging.FileHandler(log_dir / "cnn_baseline.log", encoding="utf-8")
    file_handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(name)s - %(message)s"))
    logging.getLogger().addHandler(file_handler)

    # Set seed
    seed = config.project["seed"]
    set_seed(seed)

    # Locate source dataset
    try:
        source_dir = locate_source_dataset(config.dataset["source_dir"], project_root)
    except Exception as e:
        logger.error(e)
        return 1

    # Source folders for classification classes: potholes vs normal
    # We consolidate train and val folders from YOLO to get all available images
    image_folders = [
        ("pothole", source_dir / "images" / "train" / "potholes"),
        ("normal", source_dir / "images" / "train" / "normal"),
        ("pothole", source_dir / "images" / "val" / "potholes"),
    ]

    logger.info("Scanning and loading raw dataset...")
    # Find and deduplicate
    try:
        unique_image_paths = find_and_remove_duplicates(image_folders)
    except Exception as e:
        logger.error(f"Error during deduplication: {e}")
        return 1

    if not unique_image_paths:
        logger.error("No image files found in the source dataset folders.")
        return 1

    # Split dataset
    try:
        train_paths, val_paths, test_paths = perform_stratified_split(
            image_paths=unique_image_paths,
            split_ratios=config.dataset["split_ratios"],
            seed=seed
        )
    except Exception as e:
        logger.error(f"Error during stratified splitting: {e}")
        return 1

    # Copy files and rename them
    processed_dir = project_root / config.dataset["processed_dir"]
    splits = {
        "train": train_paths,
        "val": val_paths,
        "test": test_paths
    }

    logger.info("Consolidating, renaming, and copying images into splits...")
    try:
        manifest_paths = copy_and_rename_splits(
            splits=splits,
            output_dir=processed_dir,
            class_names=config.dataset["class_names"]
        )
    except Exception as e:
        logger.error(f"Error during image consolidation: {e}")
        return 1

    # Save manifest file
    manifest_data = {
        "seed": seed,
        "split_ratios": config.dataset["split_ratios"],
        "splits": manifest_paths
    }
    manifest_file_path = project_root / config.dataset["split_manifest"]
    try:
        save_manifest(manifest_data, manifest_file_path)
    except Exception as e:
        logger.error(f"Failed to save manifest file: {e}")
        return 1

    # Print and log dataset statistics
    logger.info("=== DATASET PREPARATION COMPLETED SUCCESSFULLY ===")
    stats_data = {}
    for split_name in ["train", "val", "test"]:
        split_files = manifest_paths[split_name]
        potholes = sum(1 for f in split_files if "/pothole/" in f)
        normal = len(split_files) - potholes
        stats_data[split_name] = {
            "total": len(split_files),
            "pothole": potholes,
            "normal": normal,
            "pothole_percentage": round((potholes / len(split_files)) * 100, 1) if split_files else 0.0
        }
        logger.info(
            f"Split [{split_name}]: Total={len(split_files)} images, "
            f"Pothole={potholes} ({stats_data[split_name]['pothole_percentage']}%), "
            f"Normal={normal}"
        )

    # Save dataset stats report
    stats_file = project_root / config.outputs["report_dir"] / "dataset_statistics.json"
    stats_file.parent.mkdir(parents=True, exist_ok=True)
    with open(stats_file, "w", encoding="utf-8") as f:
        json.dump(stats_data, f, indent=2)
    logger.info(f"Dataset statistics report saved to: {stats_file}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
