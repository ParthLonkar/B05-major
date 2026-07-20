"""Dataset integration utility for CNN baseline.

Merges the existing Kaggle Potholes dataset split with the RDD2022 dataset split
while preserving splits, performing deduplication, ensuring traceability,
and writing a statistics report.
"""

from __future__ import annotations

import json
import logging
import hashlib
import shutil
import sys
from pathlib import Path
from collections import Counter, defaultdict

# Ensure cnn-baseline/src is on sys.path
_PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from src.config import get_config

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("integrate_datasets")


def compute_md5(file_path: Path) -> str:
    """Compute MD5 hash of a file's content."""
    hasher = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def load_rdd_labels(lbl_path: Path) -> set[int]:
    """Parse YOLO annotations from an RDD label file and return class IDs."""
    classes = set()
    if not lbl_path.is_file():
        return classes
    try:
        content = lbl_path.read_text(encoding="utf-8").strip()
        if not content:
            return classes
        for line in content.split("\n"):
            line = line.strip()
            if not line:
                continue
            parts = line.split()
            if len(parts) == 5:
                try:
                    classes.add(int(parts[0]))
                except ValueError:
                    pass
    except Exception as e:
        logger.warning(f"Failed to parse RDD label file {lbl_path}: {e}")
    return classes


def perform_backup(processed_dir: Path, manifest_path: Path) -> tuple[Path, Path]:
    """Create backups of the processed directory and the split manifest."""
    data_dir = processed_dir.parent
    
    backup_processed = data_dir / "processed_original"
    backup_manifest = data_dir / "split_manifest_original.json"
    
    # Backup processed dir
    if processed_dir.is_dir():
        if not backup_processed.exists():
            logger.info(f"Backing up processed dataset directory to: {backup_processed}")
            shutil.copytree(processed_dir, backup_processed)
        else:
            logger.info(f"Processed backup already exists at: {backup_processed}")
    else:
        logger.warning(f"No processed dataset directory found to backup at: {processed_dir}")
        
    # Backup manifest file
    if manifest_path.is_file():
        if not backup_manifest.exists():
            logger.info(f"Backing up split manifest to: {backup_manifest}")
            shutil.copy2(manifest_path, backup_manifest)
        else:
            logger.info(f"Split manifest backup already exists at: {backup_manifest}")
    else:
        logger.warning(f"No split manifest file found to backup at: {manifest_path}")

    return backup_processed, backup_manifest


def get_priority_score(source: str, split: str) -> int:
    """Calculate priority score for duplicate resolution.
    
    Kaggle (original) splits are preferred over RDD2022 splits.
    Train split is preferred over validation, which is preferred over test.
    """
    score = 0
    if source == "Kaggle":
        score += 10
    else:
        score += 0
        
    if split == "train":
        score += 3
    elif split == "val":
        score += 2
    elif split == "test":
        score += 1
    return score


def main() -> int:
    cfg = get_config()
    
    processed_dir = _PROJECT_ROOT / cfg.dataset["processed_dir"]
    manifest_path = _PROJECT_ROOT / cfg.dataset["split_manifest"]
    
    # 1. Perform Phase 1 Backups
    backup_processed, backup_manifest = perform_backup(processed_dir, manifest_path)
    
    if not backup_processed.is_dir():
        logger.error("Abort: Original processed dataset folder backup is missing or empty.")
        return 1

    # 2. Gather Dataset A (Kaggle classification splits from backup_processed)
    logger.info("Scanning Dataset A (Kaggle baseline splits from backup)...")
    kaggle_images = []
    
    image_extensions = {".jpg", ".jpeg", ".png", ".bmp"}
    splits = ["train", "val", "test"]
    
    for split in splits:
        split_dir = backup_processed / split
        for label_name in ["normal", "pothole"]:
            label_dir = split_dir / label_name
            if not label_dir.is_dir():
                continue
            for img_path in label_dir.iterdir():
                if img_path.suffix.lower() in image_extensions:
                    md5 = compute_md5(img_path)
                    kaggle_images.append({
                        "path": img_path,
                        "filename": img_path.name,
                        "original_name": img_path.name,
                        "source": "Kaggle",
                        "original_split": split,
                        "label": label_name,
                        "md5": md5
                    })
                    
    logger.info(f"Loaded {len(kaggle_images)} images from Kaggle dataset.")

    # 3. Gather Dataset B (RDD2022 from RDD_SPLIT)
    rdd_root = Path(r"c:\Users\Shreesh Pawar\OneDrive\Desktop\RDD_SPLIT")
    logger.info(f"Scanning Dataset B (RDD2022 from RDD_SPLIT at {rdd_root})...")
    rdd_images = []
    
    if not rdd_root.is_dir():
        logger.error(f"Abort: RDD2022 dataset directory not found at {rdd_root}")
        return 1
        
    for split in splits:
        rdd_split_img_dir = rdd_root / split / "images"
        rdd_split_lbl_dir = rdd_root / split / "labels"
        
        if not rdd_split_img_dir.is_dir() or not rdd_split_lbl_dir.is_dir():
            logger.warning(f"RDD split directory {split} is missing images/labels folder.")
            continue
            
        for img_path in rdd_split_img_dir.iterdir():
            if img_path.suffix.lower() in image_extensions:
                lbl_path = rdd_split_lbl_dir / (img_path.stem + ".txt")
                classes = load_rdd_labels(lbl_path)
                
                # YOLO D40 (class 3) represents Pothole
                label = "pothole" if 3 in classes else "normal"
                md5 = compute_md5(img_path)
                
                rdd_images.append({
                    "path": img_path,
                    "filename": img_path.name,
                    "original_name": img_path.name,
                    "source": "RDD2022",
                    "original_split": split,
                    "label": label,
                    "md5": md5
                })
                
    logger.info(f"Loaded {len(rdd_images)} images from RDD2022 dataset.")

    # Combine both lists of images
    all_raw_images = kaggle_images + rdd_images
    logger.info(f"Total raw merged images count: {len(all_raw_images)}")

    # 4. Phase 3 — Deduplication
    logger.info("Performing global duplicate detection using MD5 hashes...")
    hash_groups = defaultdict(list)
    for img_meta in all_raw_images:
        hash_groups[img_meta["md5"]].append(img_meta)
        
    unique_images = []
    duplicate_groups_report = []
    duplicates_removed_count = 0
    
    for md5, group in hash_groups.items():
        if len(group) == 1:
            # No duplicates, keep the single image
            unique_images.append(group[0])
        else:
            # Sort group instances based on priority score in descending order
            group_sorted = sorted(
                group,
                key=lambda x: get_priority_score(x["source"], x["original_split"]),
                reverse=True
            )
            
            # The highest priority is kept
            kept_item = group_sorted[0]
            removed_items = group_sorted[1:]
            
            unique_images.append(kept_item)
            duplicates_removed_count += len(removed_items)
            
            # Record duplicate group details
            duplicate_groups_report.append({
                "md5": md5,
                "kept": {
                    "filename": kept_item["filename"],
                    "source": kept_item["source"],
                    "split": kept_item["original_split"],
                    "label": kept_item["label"]
                },
                "removed": [
                    {
                        "filename": x["filename"],
                        "source": x["source"],
                        "split": x["original_split"],
                        "label": x["label"]
                    }
                    for x in removed_items
                ]
            })

    # Save duplicate report
    dup_report_path = _PROJECT_ROOT / "outputs" / "metrics" / "duplicate_report.json"
    dup_report_path.parent.mkdir(parents=True, exist_ok=True)
    
    dup_report_data = {
        "summary": {
            "total_duplicate_groups": len(duplicate_groups_report),
            "total_duplicates_removed": duplicates_removed_count
        },
        "duplicate_groups": duplicate_groups_report
    }
    
    with open(dup_report_path, "w", encoding="utf-8") as fh:
        json.dump(dup_report_data, fh, indent=2)
    logger.info(f"Duplicate report written to: {dup_report_path}")

    # 5. Clean processed directory and recreate structure
    if processed_dir.exists():
        logger.info(f"Cleaning existing processed directory: {processed_dir}")
        shutil.rmtree(processed_dir)
    processed_dir.mkdir(parents=True, exist_ok=True)

    # 6. Copy files while preserving split mapping
    logger.info("Consolidating, copying, and renaming images into splits...")
    new_splits_manifest = {"splits": {s: [] for s in splits}}
    
    # Destination name collision handler map
    dest_name_counts = defaultdict(int)
    
    for img_meta in unique_images:
        split = img_meta["original_split"]
        label = img_meta["label"]
        src_path = img_meta["path"]
        
        dest_folder = processed_dir / split / label
        dest_folder.mkdir(parents=True, exist_ok=True)
        
        orig_name = img_meta["original_name"]
        
        # Check name collisions in destination folder
        dest_name = orig_name
        dest_key = (split, label, orig_name.lower())
        if dest_name_counts[dest_key] > 0:
            stem = Path(orig_name).stem
            suffix = Path(orig_name).suffix
            dest_name = f"{stem}_dup{dest_name_counts[dest_key]}{suffix}"
        dest_name_counts[dest_key] += 1
        
        dest_path = dest_folder / dest_name
        shutil.copy2(src_path, dest_path)
        
        # Manifest record using relative path from processed/
        relative_path = f"{split}/{label}/{dest_name}"
        new_splits_manifest["splits"][split].append({
            "image": relative_path,
            "original_name": orig_name,
            "source": img_meta["source"],
            "original_split": split,
            "label": label,
            "md5": img_meta["md5"]
        })

    # Save splits manifest
    with open(manifest_path, "w", encoding="utf-8") as fh:
        json.dump(new_splits_manifest, fh, indent=2)
    logger.info(f"Traceable split manifest written to: {manifest_path}")

    # 7. Compute Split Statistics (Phase 6)
    stats = {
        "overall": {
            "total_images": len(unique_images),
            "pothole_images": sum(1 for x in unique_images if x["label"] == "pothole"),
            "normal_images": sum(1 for x in unique_images if x["label"] == "normal")
        },
        "per_dataset": {
            "Kaggle": {split: {"total": 0, "pothole": 0, "normal": 0} for split in splits},
            "RDD2022": {split: {"total": 0, "pothole": 0, "normal": 0} for split in splits}
        },
        "duplicate_statistics": {
            "duplicates_removed": duplicates_removed_count,
            "duplicate_groups": len(duplicate_groups_report)
        },
        "final_distribution": {
            split: {"total": 0, "pothole": 0, "normal": 0, "class_balance": {}} for split in splits
        }
    }
    
    # Calculate per dataset stats (pre-deduplication inputs mapped to unique counts for reporting)
    for img_meta in unique_images:
        ds = img_meta["source"]
        split = img_meta["original_split"]
        lbl = img_meta["label"]
        
        stats["per_dataset"][ds][split]["total"] += 1
        stats["per_dataset"][ds][split][lbl] += 1
        
        stats["final_distribution"][split]["total"] += 1
        stats["final_distribution"][split][lbl] += 1

    # Class balance percentages
    for split in splits:
        split_stats = stats["final_distribution"][split]
        total = split_stats["total"]
        if total > 0:
            p_pct = round((split_stats["pothole"] / total) * 100, 2)
            n_pct = round((split_stats["normal"] / total) * 100, 2)
        else:
            p_pct, n_pct = 0.0, 0.0
        split_stats["class_balance"] = {
            "pothole_percentage": p_pct,
            "normal_percentage": n_pct
        }

    # Write stats report
    stats_report_path = _PROJECT_ROOT / "outputs" / "metrics" / "integrated_dataset_statistics.json"
    stats_report_path.parent.mkdir(parents=True, exist_ok=True)
    with open(stats_report_path, "w", encoding="utf-8") as fh:
        json.dump(stats, fh, indent=2)
        
    logger.info(f"Integrated dataset statistics report written to: {stats_report_path}")
    logger.info("=== DATASET INTEGRATION COMPLETED SUCCESSFULLY ===")
    
    # Print statistics for user approval
    print("\n============================================================")
    print("           INTEGRATION REPORT & DATASET STATISTICS")
    print("============================================================")
    print(f"Overall Unified Dataset Size: {stats['overall']['total_images']} unique images")
    print(f"  Pothole Images: {stats['overall']['pothole_images']}")
    print(f"  Normal Images:  {stats['overall']['normal_images']}")
    print("-" * 60)
    print("DEDUPLICATION SUMMARY:")
    print(f"  Duplicate Groups Detected : {stats['duplicate_statistics']['duplicate_groups']}")
    print(f"  Duplicate Images Removed  : {stats['duplicate_statistics']['duplicates_removed']}")
    print("-" * 60)
    print("SPLIT-WISE STATISTICS:")
    for split in splits:
        sd = stats["final_distribution"][split]
        print(f"  Split [{split.upper()}]:")
        print(f"    Total images    : {sd['total']}")
        print(f"    Pothole images  : {sd['pothole']} ({sd['class_balance']['pothole_percentage']}%)")
        print(f"    Normal images   : {sd['normal']} ({sd['class_balance']['normal_percentage']}%)")
    print("============================================================\n")

    return 0


if __name__ == "__main__":
    sys.exit(main())
