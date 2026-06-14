from __future__ import annotations

import math
from typing import Iterable

import cv2
import numpy as np
from PIL import Image

from pothole.types import Detection


def _pil_to_bgr(pil_img: Image.Image) -> np.ndarray:
    rgb = np.array(pil_img.convert("RGB"))
    return cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)


def _severity_from_area_ratio(area_ratio: float) -> str:
    if area_ratio > 0.05:
        return "Severe"
    if area_ratio > 0.01:
        return "Neutral"
    return "Not Severe"


def heuristic_detect_potholes(
    pil_img: Image.Image,
    *,
    max_detections: int = 10,
    min_area_ratio: float = 0.002,
    max_area_ratio: float = 0.35,
) -> list[Detection]:
    """
    Heuristic pothole-like region detector (no ML).

    This is a fallback when no trained weights are available.
    It detects dark/irregular blobs + edges and returns YOLO-like boxes.
    """
    frame = _pil_to_bgr(pil_img)
    h, w = frame.shape[:2]
    img_area = float(w * h)

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)

    # Dark region mask (invert to highlight pothole-like dark areas)
    inv = cv2.bitwise_not(blur)
    _, mask = cv2.threshold(inv, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # Clean up mask
    k = max(3, int(round(min(w, h) * 0.01)) | 1)  # odd kernel
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

    # Edges to bias confidence toward irregular shapes
    edges = cv2.Canny(blur, 60, 180)

    cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    candidates: list[tuple[float, tuple[int, int, int, int], float]] = []

    for c in cnts:
        area = float(cv2.contourArea(c))
        if area <= 0:
            continue
        area_ratio = area / img_area
        if area_ratio < min_area_ratio or area_ratio > max_area_ratio:
            continue

        x, y, bw, bh = cv2.boundingRect(c)
        if bw <= 2 or bh <= 2:
            continue
        aspect = bw / float(bh)
        if aspect < 0.15 or aspect > 6.0:
            continue

        # Edge density inside the box (irregular texture)
        x2 = min(w, x + bw)
        y2 = min(h, y + bh)
        roi_edges = edges[y:y2, x:x2]
        edge_density = float(np.mean(roi_edges > 0)) if roi_edges.size else 0.0

        # Confidence is a mix of area and edge density (bounded 0..1)
        area_score = min(1.0, math.sqrt(area_ratio / max(min_area_ratio, 1e-6)) / 4.0)
        conf = max(0.05, min(0.95, 0.55 * area_score + 0.45 * min(1.0, edge_density * 6.0)))

        candidates.append((conf, (x, y, x2, y2), area_ratio))

    # Keep top by confidence, then larger blobs
    candidates.sort(key=lambda t: (t[0], t[2]), reverse=True)
    candidates = candidates[:max_detections]

    detections: list[Detection] = []
    for conf, (x1, y1, x2, y2), area_ratio in candidates:
        detections.append(
            Detection(
                class_id=0,
                class_name="pothole",
                confidence=float(conf),
                x1=float(x1),
                y1=float(y1),
                x2=float(x2),
                y2=float(y2),
                severity=_severity_from_area_ratio(area_ratio),
            )
        )

    return detections

