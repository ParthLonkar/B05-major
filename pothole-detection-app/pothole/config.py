from __future__ import annotations

import os
from dataclasses import dataclass


def _env_float(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    return float(raw)


def _env_str(name: str, default: str) -> str:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    return raw


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    return raw.strip().lower() in {"1", "true", "yes", "y", "on"}


@dataclass(frozen=True)
class Settings:
    model_path: str
    device: str
    conf: float
    iou: float
    class_name: str
    allow_any_class: bool


def get_settings() -> Settings:
    model_path = os.getenv("POTHOLE_MODEL_PATH", "").strip()
    if not model_path:
        raise RuntimeError(
            "POTHOLE_MODEL_PATH is not set. Point it to a YOLO weights file (e.g. runs\\detect\\train\\weights\\best.pt)."
        )

    return Settings(
        model_path=model_path,
        device=_env_str("POTHOLE_DEVICE", "cpu"),
        conf=_env_float("POTHOLE_CONF", 0.25),
        iou=_env_float("POTHOLE_IOU", 0.45),
        class_name=_env_str("POTHOLE_CLASS_NAME", "pothole"),
        allow_any_class=_env_bool("POTHOLE_ALLOW_ANY_CLASS", False),
    )
