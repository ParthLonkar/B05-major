from __future__ import annotations

from functools import lru_cache
from typing import Any

from ultralytics import YOLO

from pothole.config import Settings, get_settings


@lru_cache(maxsize=1)
def get_model() -> tuple[YOLO, Settings, dict[int, str]]:
    settings = get_settings()
    model = YOLO(settings.model_path)

    names: dict[int, str] = {}
    try:
        model_names: Any = getattr(model.model, "names", None)
        if isinstance(model_names, dict):
            names = {int(k): str(v) for k, v in model_names.items()}
        elif isinstance(model_names, list):
            names = {i: str(v) for i, v in enumerate(model_names)}
    except Exception:
        names = {}

    return model, settings, names

