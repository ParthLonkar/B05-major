from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path


def _key_for(path: Path, base: Path) -> str:
    rel = path.relative_to(base)
    # key without extension, include subfolders to avoid collisions
    return os.fspath(rel.with_suffix("")).replace("\\", "/")


def _collect_images(dir_path: Path) -> dict[str, Path]:
    exts = {".jpg", ".jpeg", ".png"}
    out: dict[str, Path] = {}
    if not dir_path.exists():
        return out
    for p in dir_path.rglob("*"):
        if p.is_file() and p.suffix.lower() in exts:
            out[_key_for(p, dir_path)] = p
    return out


def _collect_labels(dir_path: Path) -> dict[str, Path]:
    out: dict[str, Path] = {}
    if not dir_path.exists():
        return out
    for p in dir_path.rglob("*.txt"):
        if p.is_file():
            # LabelImg may write a `classes.txt` file listing class names.
            # It's not a YOLO label file and should be ignored.
            if p.name.lower() == "classes.txt":
                continue
            out[_key_for(p, dir_path)] = p
    return out


def _validate_label_file(path: Path) -> list[str]:
    errs: list[str] = []
    if path.name.lower() == "classes.txt":
        return []
    try:
        text = path.read_text(encoding="utf-8").strip()
    except Exception as e:
        return [f"cannot read: {e}"]

    if not text:
        # empty label is allowed (no objects)
        return []

    for i, line in enumerate(text.splitlines(), start=1):
        parts = line.strip().split()
        if len(parts) != 5:
            errs.append(f"line {i}: expected 5 fields, got {len(parts)}")
            continue
        try:
            class_id = int(float(parts[0]))
            xc, yc, w, h = (float(x) for x in parts[1:])
        except Exception:
            errs.append(f"line {i}: not numeric")
            continue
        if class_id < 0:
            errs.append(f"line {i}: class_id < 0")
        for name, v in [("x_center", xc), ("y_center", yc), ("width", w), ("height", h)]:
            if not (0.0 <= v <= 1.0):
                errs.append(f"line {i}: {name} out of range 0..1 ({v})")
    return errs


def _count_instances(path: Path) -> int:
    try:
        text = path.read_text(encoding="utf-8").strip()
    except Exception:
        return 0
    if not text:
        return 0
    return sum(1 for line in text.splitlines() if line.strip())


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate a YOLO dataset folder structure.")
    parser.add_argument(
        "--root",
        default=str(Path("datasets") / "kaggle_potholes"),
        help="Dataset root containing images/ and labels/ (default: datasets/kaggle_potholes).",
    )
    args = parser.parse_args()

    root = Path(args.root)
    splits = ["train", "val"]

    any_errors = False
    for split in splits:
        img_dir = root / "images" / split
        lbl_dir = root / "labels" / split

        images = _collect_images(img_dir)
        labels = _collect_labels(lbl_dir)

        non_empty_labels = 0
        instances = 0
        for p in labels.values():
            c = _count_instances(p)
            if c > 0:
                non_empty_labels += 1
                instances += c

        print(
            f"[{split}] images={len(images)} labels={len(labels)} labeled_images={non_empty_labels} instances={instances}"
        )
        if not images:
            print(f"  - Missing images in {img_dir}")
            any_errors = True
            continue

        missing_labels = sorted(set(images.keys()) - set(labels.keys()))
        extra_labels = sorted(set(labels.keys()) - set(images.keys()))

        if missing_labels:
            any_errors = True
            print(f"  - Missing label files for {len(missing_labels)} images (example: {missing_labels[0]}.txt)")
        if extra_labels:
            any_errors = True
            print(f"  - Label files without matching images: {len(extra_labels)} (example: {extra_labels[0]}.jpg/.png)")

        # Validate up to N label files
        bad = 0
        for stem, p in list(labels.items())[:200]:
            errs = _validate_label_file(p)
            if errs:
                bad += 1
                any_errors = True
                print(f"  - Bad label: {os.fspath(p)} -> {errs[0]}")
                if bad >= 10:
                    print("  - Too many bad labels, stopping early.")
                    break

    if any_errors:
        print("\nDataset is NOT ready for YOLO training.")
        print("You need YOLO .txt labels under labels/train and labels/val.")
        return 2

    print("\nDataset looks OK for YOLO training.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
