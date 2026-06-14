from __future__ import annotations

import io
from typing import Iterable

import cv2
import numpy as np
from PIL import Image

from pothole.model import get_model
from pothole.types import Detection


def _pil_to_bgr(pil_img: Image.Image) -> np.ndarray:
    rgb = np.array(pil_img.convert("RGB"))
    return cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)


def _bgr_to_png_bytes(bgr: np.ndarray) -> bytes:
    ok, buf = cv2.imencode(".png", bgr)
    if not ok:
        raise RuntimeError("Failed to encode image as PNG.")
    return buf.tobytes()


def predict_potholes_from_pil(pil_img: Image.Image) -> list[Detection]:
    return predict_from_pil(pil_img)


def predict_from_pil(
    pil_img: Image.Image,
    *,
    conf: float | None = None,
    iou: float | None = None,
    device: str | None = None,
    target_class_name: str | None = None,
) -> list[Detection]:
    model, settings, names = get_model()
    frame = _pil_to_bgr(pil_img)

    results = model.predict(
        source=frame,
        conf=settings.conf if conf is None else conf,
        iou=settings.iou if iou is None else iou,
        device=settings.device if device is None else device,
        verbose=False,
    )

    detections: list[Detection] = []
    if not results:
        return detections

    r0 = results[0]
    boxes = getattr(r0, "boxes", None)
    if boxes is None:
        return detections

    xyxy = getattr(boxes, "xyxy", None)
    cls = getattr(boxes, "cls", None)
    conf = getattr(boxes, "conf", None)
    if xyxy is None or cls is None or conf is None:
        return detections

    xyxy_np = xyxy.detach().cpu().numpy()
    cls_np = cls.detach().cpu().numpy().astype(int)
    conf_np = conf.detach().cpu().numpy()

    img_w, img_h = pil_img.size
    img_area = img_w * img_h

    for (x1, y1, x2, y2), class_id, confidence in zip(xyxy_np, cls_np, conf_np, strict=False):
        det_class_name = names.get(int(class_id), str(int(class_id)))
        expected = settings.class_name if target_class_name is None else target_class_name
        if (not settings.allow_any_class) and det_class_name.lower() != expected.lower():
            continue

        # Determine severity based on relative area
        box_area = (x2 - x1) * (y2 - y1)
        area_ratio = box_area / img_area

        if area_ratio > 0.05:
            severity = "Severe"
        elif area_ratio > 0.01:
            severity = "Neutral"
        else:
            severity = "Not Severe"

        detections.append(
            Detection(
                class_id=int(class_id),
                class_name=det_class_name,
                confidence=float(confidence),
                severity=severity,
                x1=float(x1),
                y1=float(y1),
                x2=float(x2),
                y2=float(y2),
            )
        )

    return detections


def draw_detections(pil_img: Image.Image, detections: Iterable[Detection]) -> bytes:
    frame = _pil_to_bgr(pil_img)

    for det in detections:
        x1, y1, x2, y2 = int(det.x1), int(det.y1), int(det.x2), int(det.y2)

        # Color based on severity
        color = (0, 220, 0) # Green for Not Severe
        if det.severity.lower() == "severe":
            color = (0, 0, 220) # Red
        elif det.severity.lower() == "neutral":
            color = (0, 165, 255) # Orange

        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
        label = f"{det.severity} {det.class_name} {det.confidence:.2f}"
        cv2.putText(
            frame,
            label,
            (x1, max(20, y1 - 6)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            color,
            2,
            cv2.LINE_AA,
        )

    return _bgr_to_png_bytes(frame)


def load_image_bytes(image_bytes: bytes) -> Image.Image:
    return Image.open(io.BytesIO(image_bytes))
