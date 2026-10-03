"""Detect and segment potholes in phone photos with a Hugging Face YOLOv8 model.

This script only runs inference. It does not train or modify model weights.
Optional Depth Anything V2 Metric Outdoor output is combined with the YOLO
instance mask to produce an experimental apparent-depth estimate in meters.
Validate estimates against measured potholes before using severity operationally.
"""

from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path
from typing import Any

import cv2
import numpy as np
from huggingface_hub import hf_hub_download, list_repo_files
from PIL import Image
from ultralytics import YOLO


# Hugging Face model repository. The segmentation dataset has a pothole class.
MODEL_REPO = "keremberke/yolov8n-pothole-segmentation"
CLASS_NAMES = {0: "pothole"}
POTHOLE_CLASS_ID = 0

# Inference settings.
IMAGE_SIZE = 768
CONFIDENCE = 0.25

# Editable starting thresholds only. Verify them against ASTM D6433 or local
# IRC/road-agency guidance and field measurements before operational use.
LOW_WIDTH_MAX_CM = 20.0
MEDIUM_WIDTH_MAX_CM = 50.0
DEPTH_MEDIUM_THRESHOLD_M = 0.025
DEPTH_HIGH_THRESHOLD_M = 0.050

DEPTH_REPO = "depth-anything/Depth-Anything-V2-Metric-Outdoor-Base-hf"
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tif", ".tiff"}
CSV_FIELDS = [
    "image",
    "pothole_index",
    "confidence",
    "x1",
    "y1",
    "x2",
    "y2",
    "width_px",
    "height_px",
    "box_area_percent",
    "mask_area_pixels",
    "mask_area_percent",
    "mask_area_cm2",
    "width_cm",
    "height_cm",
    "estimated_depth_m",
    "severity",
    "annotated_image",
]


def classify_severity(width_cm: float | None, estimated_depth_m: float | None = None) -> str:
    """Combine provisional width and mask-derived apparent-depth bands."""
    severity_rank = 0

    if width_cm is not None:
        if width_cm > MEDIUM_WIDTH_MAX_CM:
            severity_rank = 2
        elif width_cm > LOW_WIDTH_MAX_CM:
            severity_rank = 1

    if estimated_depth_m is not None:
        if estimated_depth_m >= DEPTH_HIGH_THRESHOLD_M:
            severity_rank = max(severity_rank, 2)
        elif estimated_depth_m >= DEPTH_MEDIUM_THRESHOLD_M:
            severity_rank = max(severity_rank, 1)

    if width_cm is None and estimated_depth_m is None:
        return "medium"

    return ("low", "medium", "high")[severity_rank]


def choose_model_weights(repo_id: str) -> str:
    """List repo files and download best.pt (or the first available .pt file)."""
    try:
        repo_files = list_repo_files(repo_id=repo_id)
    except Exception as exc:
        raise RuntimeError(
            f"Could not list files in Hugging Face repo '{repo_id}'. "
            "Check the repo ID, network access, and whether authentication is required."
        ) from exc

    pt_files = sorted(name for name in repo_files if name.lower().endswith(".pt"))
    if not pt_files:
        raise RuntimeError(f"No .pt model file was found in Hugging Face repo '{repo_id}'.")

    filename = next((name for name in pt_files if Path(name).name.lower() == "best.pt"), pt_files[0])
    try:
        return hf_hub_download(repo_id=repo_id, filename=filename)
    except Exception as exc:
        raise RuntimeError(f"Could not download '{filename}' from '{repo_id}'.") from exc


def collect_images(input_path: Path, output_dir: Path) -> list[Path]:
    """Return an image file or recursively collect images from a directory."""
    if not input_path.exists():
        raise FileNotFoundError(f"Input path does not exist: {input_path}")
    if input_path.is_file():
        if input_path.suffix.lower() not in IMAGE_EXTENSIONS:
            raise ValueError(f"Unsupported image file extension: {input_path.suffix}")
        return [input_path]
    if not input_path.is_dir():
        raise ValueError(f"Input is not a file or directory: {input_path}")

    output_resolved = output_dir.resolve()
    images = [
        path
        for path in sorted(input_path.rglob("*"))
        if path.is_file()
        and path.suffix.lower() in IMAGE_EXTENSIONS
        and output_resolved not in path.resolve().parents
        and path.resolve() != output_resolved
    ]
    if not images:
        raise FileNotFoundError(f"No supported images found in folder: {input_path}")
    return images


def output_annotation_path(image_path: Path, input_path: Path, output_dir: Path) -> Path:
    """Preserve folder structure when processing a directory."""
    if input_path.is_dir():
        relative = image_path.relative_to(input_path)
        return output_dir / input_path.name / relative.parent / f"{relative.stem}_annotated.jpg"
    return output_dir / f"{image_path.stem}_annotated.jpg"


def to_numpy_depth(depth_result: dict[str, Any], image_size: tuple[int, int]) -> np.ndarray:
    """Extract and resize raw predicted_depth, not its colorized preview."""
    if "predicted_depth" in depth_result:
        predicted = depth_result["predicted_depth"]
        if hasattr(predicted, "detach"):
            predicted = predicted.detach().cpu().numpy()
        depth = np.asarray(predicted, dtype=np.float32).squeeze()
    elif "depth" in depth_result:
        # Compatibility fallback for pipeline versions that only return a PIL map.
        depth = np.asarray(depth_result["depth"].convert("L"), dtype=np.float32)
    else:
        raise RuntimeError("Depth pipeline returned neither 'predicted_depth' nor 'depth'.")

    if depth.ndim != 2:
        raise RuntimeError(f"Expected a 2D depth map; got shape {depth.shape}.")

    image_width, image_height = image_size
    if depth.shape != (image_height, image_width):
        depth = cv2.resize(depth, (image_width, image_height), interpolation=cv2.INTER_LINEAR)
    return depth


def mask_apparent_depth_m(
    depth_map: np.ndarray,
    instance_mask: np.ndarray,
) -> float | None:
    """Estimate pothole apparent depth as mask-vs-nearby-road median range.

    Positive values mean the masked region is farther from the camera. This
    single-image estimate is not a survey-grade physical pothole measurement.
    """
    if instance_mask.shape != depth_map.shape:
        instance_mask = cv2.resize(
            instance_mask.astype(np.uint8),
            (depth_map.shape[1], depth_map.shape[0]),
            interpolation=cv2.INTER_NEAREST,
        ).astype(bool)
    if not np.any(instance_mask):
        return None

    kernel_size = max(3, int(round(min(depth_map.shape) * 0.03)) | 1)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size))
    expanded = cv2.dilate(instance_mask.astype(np.uint8), kernel).astype(bool)
    ring = expanded & ~instance_mask
    inside = depth_map[instance_mask]
    surrounding = depth_map[ring]
    inside = inside[np.isfinite(inside) & (inside > 0)]
    surrounding = surrounding[np.isfinite(surrounding) & (surrounding > 0)]
    if inside.size == 0 or surrounding.size == 0:
        return None
    # Clamp negative offsets: only increased camera distance is counted as a depression.
    return float(max(0.0, np.median(inside) - np.median(surrounding)))


def prepare_depth_pipeline():
    """Load metric outdoor Depth Anything V2 on CUDA when available, else CPU."""
    try:
        import torch
        from transformers import pipeline
    except ImportError as exc:
        raise RuntimeError(
            "Depth mode requires PyTorch and Transformers. Install requirements.txt first."
        ) from exc

    device = 0 if torch.cuda.is_available() else -1
    return pipeline("depth-estimation", model=DEPTH_REPO, device=device)


def annotate_and_extract(
    image_path: Path,
    annotated_path: Path,
    model: YOLO,
    args: argparse.Namespace,
    depth_estimator: Any | None,
) -> list[dict[str, Any]]:
    image = cv2.imread(str(image_path), cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("OpenCV could not read this image.")
    image_height, image_width = image.shape[:2]
    annotated = image.copy()

    depth_map = None
    if depth_estimator is not None:
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        # Transformers' image pipeline expects a PIL image (or path/URL), not
        # the NumPy array returned by OpenCV.
        depth_result = depth_estimator(Image.fromarray(rgb_image))
        depth_map = to_numpy_depth(depth_result, (image_width, image_height))

    results = model.predict(
        source=str(image_path),
        imgsz=IMAGE_SIZE,
        conf=CONFIDENCE,
        augment=args.tta,
        retina_masks=True,
        verbose=False,
    )
    rows: list[dict[str, Any]] = []
    result = results[0]

    if result.boxes is not None:
        mask_data = result.masks.data if result.masks is not None else None
        for detection_index, detection in enumerate(result.boxes):
            class_id = int(detection.cls.item())
            if class_id != POTHOLE_CLASS_ID:
                continue

            confidence = float(detection.conf.item())
            raw_x1, raw_y1, raw_x2, raw_y2 = detection.xyxy[0].cpu().tolist()
            x1 = max(0, min(image_width, int(round(raw_x1))))
            y1 = max(0, min(image_height, int(round(raw_y1))))
            x2 = max(0, min(image_width, int(round(raw_x2))))
            y2 = max(0, min(image_height, int(round(raw_y2))))
            box_width, box_height = max(0, x2 - x1), max(0, y2 - y1)
            box_area_percent = (box_width * box_height / (image_width * image_height)) * 100.0

            mask_area_pixels = 0
            mask_area_percent = 0.0
            if mask_data is not None and detection_index < len(mask_data):
                instance_mask = mask_data[detection_index].detach().cpu().numpy()
                if instance_mask.shape != (image_height, image_width):
                    instance_mask = cv2.resize(
                        instance_mask.astype(np.float32),
                        (image_width, image_height),
                        interpolation=cv2.INTER_LINEAR,
                    )
                instance_mask = instance_mask > 0.5
                mask_area_pixels = int(np.count_nonzero(instance_mask))
                mask_area_percent = mask_area_pixels / (image_width * image_height) * 100.0

                # Tint the predicted instance mask and draw its contour.
                tint = np.array((40, 220, 40), dtype=np.float32)
                annotated[instance_mask] = (
                    annotated[instance_mask].astype(np.float32) * 0.55 + tint * 0.45
                ).astype(np.uint8)
                contours, _ = cv2.findContours(
                    instance_mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
                )
                cv2.drawContours(annotated, contours, -1, (40, 255, 40), 2)

            width_cm = None
            height_cm = None
            if args.ref_width_cm is not None:
                cm_per_pixel = args.ref_width_cm / args.ref_width_px
                width_cm = box_width * cm_per_pixel
                height_cm = box_height * cm_per_pixel

            mask_area_cm2 = (
                mask_area_pixels * (cm_per_pixel ** 2)
                if args.ref_width_cm is not None
                else None
            )

            estimated_depth_m = (
                mask_apparent_depth_m(depth_map, instance_mask)
                if depth_map is not None and mask_data is not None and detection_index < len(mask_data)
                else None
            )
            severity = classify_severity(width_cm, estimated_depth_m)

            color = (40, 220, 40)
            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
            label = f"pothole {confidence:.2f} {severity}"
            if estimated_depth_m is not None:
                label += f" ~{estimated_depth_m * 100:.1f}cm*"
            label_y = max(18, y1 - 7)
            cv2.putText(
                annotated,
                label,
                (x1, label_y),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                color,
                2,
                cv2.LINE_AA,
            )

            rows.append(
                {
                    "image": str(image_path),
                    "pothole_index": len(rows) + 1,
                    "confidence": f"{confidence:.6f}",
                    "x1": x1,
                    "y1": y1,
                    "x2": x2,
                    "y2": y2,
                    "width_px": box_width,
                    "height_px": box_height,
                    "box_area_percent": f"{box_area_percent:.6f}",
                    "mask_area_pixels": mask_area_pixels,
                    "mask_area_percent": f"{mask_area_percent:.6f}",
                    "mask_area_cm2": f"{mask_area_cm2:.3f}" if mask_area_cm2 is not None else "",
                    "width_cm": f"{width_cm:.3f}" if width_cm is not None else "",
                    "height_cm": f"{height_cm:.3f}" if height_cm is not None else "",
                    "estimated_depth_m": f"{estimated_depth_m:.6f}" if estimated_depth_m is not None else "",
                    "severity": severity,
                    "annotated_image": str(annotated_path),
                }
            )

    if not rows:
        cv2.putText(
            annotated,
            "No potholes detected",
            (16, 32),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (0, 200, 255),
            2,
            cv2.LINE_AA,
        )

    annotated_path.parent.mkdir(parents=True, exist_ok=True)
    if not cv2.imwrite(str(annotated_path), annotated):
        raise OSError(f"Could not save annotated image: {annotated_path}")
    return rows


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run pretrained YOLOv8 pothole segmentation on an image or image folder."
    )
    parser.add_argument("input", type=Path, help="Image file or directory of images.")
    parser.add_argument("--tta", action="store_true", help="Enable test-time augmentation.")
    parser.add_argument(
        "--depth",
        action="store_true",
        help="Estimate mask-vs-nearby-road apparent depth with metric outdoor Depth Anything V2.",
    )
    parser.add_argument(
        "--ref_width_cm",
        "--ref-width-cm",
        dest="ref_width_cm",
        type=float,
        help="Known width of a reference object in cm.",
    )
    parser.add_argument(
        "--ref_width_px",
        "--ref-width-px",
        dest="ref_width_px",
        type=float,
        help="Measured pixel width of the same reference object in the image.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("output"),
        help="Output folder (default: ./output).",
    )
    args = parser.parse_args()

    if (args.ref_width_cm is None) != (args.ref_width_px is None):
        parser.error("--ref_width_cm and --ref_width_px must be supplied together.")
    if args.ref_width_cm is not None and (args.ref_width_cm <= 0 or args.ref_width_px <= 0):
        parser.error("Reference width values must be greater than zero.")
    return args


def main() -> int:
    args = parse_args()
    input_path = args.input.expanduser().resolve()
    output_dir = args.output.expanduser().resolve()

    try:
        image_paths = collect_images(input_path, output_dir)
        weights_path = choose_model_weights(MODEL_REPO)
        print(f"Loading YOLO model weights: {weights_path}")
        model = YOLO(weights_path)
        depth_estimator = prepare_depth_pipeline() if args.depth else None

        output_dir.mkdir(parents=True, exist_ok=True)
        csv_path = output_dir / "pothole_detections.csv"
        total_potholes = 0
        with csv_path.open("w", newline="", encoding="utf-8-sig") as csv_file:
            writer = csv.DictWriter(csv_file, fieldnames=CSV_FIELDS)
            writer.writeheader()

            for image_path in image_paths:
                annotated_path = output_annotation_path(image_path, input_path, output_dir)
                try:
                    rows = annotate_and_extract(
                        image_path=image_path,
                        annotated_path=annotated_path,
                        model=model,
                        args=args,
                        depth_estimator=depth_estimator,
                    )
                except Exception as exc:
                    print(f"[ERROR] {image_path}: {exc}", file=sys.stderr)
                    continue

                writer.writerows(rows)
                total_potholes += len(rows)
                if rows:
                    print(f"{image_path}: {len(rows)} pothole(s) -> {annotated_path}")
                else:
                    print(f"{image_path}: no potholes detected -> {annotated_path}")

        print(f"Detected potholes: {total_potholes}")
        print(f"CSV: {csv_path}")
        if args.depth:
            print("Depth is an experimental monocular estimate; validate against field measurements before operational use.")
        return 0
    except Exception as exc:
        print(f"[ERROR] {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
