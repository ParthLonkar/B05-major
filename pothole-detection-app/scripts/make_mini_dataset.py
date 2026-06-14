from __future__ import annotations

import argparse
import shutil
from pathlib import Path


IMG_EXTS = {".jpg", ".jpeg", ".png"}


def _find_image_for_label(label_path: Path, images_root: Path) -> Path | None:
    rel = label_path.relative_to(label_path.parents[2])  # labels/<split>/...
    # rel: <split>/subdirs/file.txt
    rel_img = rel.with_suffix("")
    for ext in IMG_EXTS:
        candidate = images_root / rel_img.with_suffix(ext)
        if candidate.exists():
            return candidate
    return None


def _is_non_empty_label(label_path: Path) -> bool:
    try:
        return bool(label_path.read_text(encoding="utf-8").strip())
    except Exception:
        return False


def _copy_pair(
    *,
    img_path: Path,
    lbl_path: Path,
    src_images_root: Path,
    src_labels_root: Path,
    dst_images_root: Path,
    dst_labels_root: Path,
) -> None:
    rel_img = img_path.relative_to(src_images_root)
    rel_lbl = lbl_path.relative_to(src_labels_root)

    out_img = dst_images_root / rel_img
    out_lbl = dst_labels_root / rel_lbl
    out_img.parent.mkdir(parents=True, exist_ok=True)
    out_lbl.parent.mkdir(parents=True, exist_ok=True)

    shutil.copy2(img_path, out_img)
    shutil.copy2(lbl_path, out_lbl)


def _split_from_path(p: Path) -> str:
    s = p.as_posix().lower()
    if "/images/train/" in s or "/labels/train/" in s:
        return "train"
    if "/images/val/" in s or "/labels/val/" in s:
        return "val"
    return "train"


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Create a tiny YOLO dataset subset (e.g. 5 pothole + 5 normal) for quick demo training."
    )
    parser.add_argument("--root", default="datasets/kaggle_potholes", help="Source dataset root.")
    parser.add_argument("--out", default="datasets/kaggle_potholes_mini", help="Output mini dataset root.")
    parser.add_argument("--pothole", type=int, default=5, help="Number of labeled pothole images to include.")
    parser.add_argument("--normal", type=int, default=5, help="Number of normal (empty label) images to include.")
    args = parser.parse_args()

    src_root = Path(args.root)
    out_root = Path(args.out)

    # We'll source from train split (preferred), then fall back to val if needed.
    candidates: list[tuple[Path, Path, bool]] = []  # (img, label, is_pothole)
    for split in ("train", "val"):
        labels_root = src_root / "labels" / split
        images_root = src_root / "images" / split
        if not labels_root.exists():
            continue
        for lbl in sorted(labels_root.rglob("*.txt")):
            img = _find_image_for_label(lbl, images_root)
            if img is None:
                continue
            candidates.append((img, lbl, _is_non_empty_label(lbl)))

    potholes = [(i, l) for (i, l, is_p) in candidates if is_p]
    normals = [(i, l) for (i, l, is_p) in candidates if not is_p]

    if len(potholes) < args.pothole:
        print(f"Not enough labeled pothole images found: need {args.pothole}, found {len(potholes)}.")
        print("Open LabelImg and draw boxes on at least 5 pothole images first.")
        return 2
    if len(normals) < args.normal:
        print(f"Not enough normal images found: need {args.normal}, found {len(normals)}.")
        return 2

    selected = potholes[: args.pothole] + normals[: args.normal]

    # Build output structure
    dst_train_images = out_root / "images" / "train"
    dst_train_labels = out_root / "labels" / "train"
    dst_val_images = out_root / "images" / "val"
    dst_val_labels = out_root / "labels" / "val"
    for p in [dst_train_images, dst_train_labels, dst_val_images, dst_val_labels]:
        p.mkdir(parents=True, exist_ok=True)

    # Put 80% in train, 20% in val (min 1 each if possible)
    total = len(selected)
    val_count = max(2, total // 5) if total >= 10 else max(1, total // 5)
    val = selected[:val_count]
    train = selected[val_count:]

    def write_list(name: str, pairs: list[tuple[Path, Path]]) -> None:
        print(f"{name}: {len(pairs)}")
        for img, lbl in pairs:
            print(f"  - {img}")

    write_list("val", val)
    write_list("train", train)

    # Copy files preserving subfolders under each split root
    for img, lbl in train:
        img_split = _split_from_path(img)
        lbl_split = _split_from_path(lbl)
        src_images_root = src_root / "images" / img_split
        src_labels_root = src_root / "labels" / lbl_split
        _copy_pair(
            img_path=img,
            lbl_path=lbl,
            src_images_root=src_images_root,
            src_labels_root=src_labels_root,
            dst_images_root=dst_train_images,
            dst_labels_root=dst_train_labels,
        )
    for img, lbl in val:
        img_split = _split_from_path(img)
        lbl_split = _split_from_path(lbl)
        src_images_root = src_root / "images" / img_split
        src_labels_root = src_root / "labels" / lbl_split
        _copy_pair(
            img_path=img,
            lbl_path=lbl,
            src_images_root=src_images_root,
            src_labels_root=src_labels_root,
            dst_images_root=dst_val_images,
            dst_labels_root=dst_val_labels,
        )

    yaml_path = Path("data/kaggle_potholes_mini.yaml")
    yaml_path.parent.mkdir(parents=True, exist_ok=True)
    yaml_path.write_text(
        "\n".join(
            [
                f"path: {out_root.as_posix()}",
                "train: images/train",
                "val: images/val",
                "names:",
                "  0: pothole",
                "",
            ]
        ),
        encoding="utf-8",
    )

    print(f"\nWrote {yaml_path}")
    print("Now train with: python scripts/train_yolo.py --data data/kaggle_potholes_mini.yaml --epochs 10 --imgsz 640")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
