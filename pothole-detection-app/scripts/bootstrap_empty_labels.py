from __future__ import annotations

import argparse
from pathlib import Path


def _iter_images(dir_path: Path) -> list[Path]:
    exts = {".jpg", ".jpeg", ".png"}
    return [p for p in dir_path.rglob("*") if p.is_file() and p.suffix.lower() in exts]


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Create empty YOLO label .txt files for every image (useful for negative/normal images)."
    )
    parser.add_argument("--root", default="datasets/kaggle_potholes", help="Dataset root.")
    args = parser.parse_args()

    root = Path(args.root)
    created = 0
    for split in ("train", "val"):
        img_root = root / "images" / split
        lbl_root = root / "labels" / split
        if not img_root.exists():
            continue
        for img in _iter_images(img_root):
            rel = img.relative_to(img_root).with_suffix(".txt")
            out = lbl_root / rel
            out.parent.mkdir(parents=True, exist_ok=True)
            if not out.exists():
                out.write_text("", encoding="utf-8")
                created += 1

    print(f"Created {created} empty label files.")
    print("Now open images in a labeling tool and add pothole boxes to the appropriate .txt files.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

