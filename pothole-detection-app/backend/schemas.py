from __future__ import annotations

from pydantic import BaseModel, Field


class DetectionOut(BaseModel):
    class_id: int = Field(..., ge=0)
    class_name: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    severity: str = "Neutral"
    x1: float
    y1: float
    x2: float
    y2: float


class PredictResponse(BaseModel):
    detections: list[DetectionOut]


class TrainRequest(BaseModel):
    data: str = Field(..., description="Path to YOLO data YAML on the server (e.g. data/pothole.yaml).")
    model: str = Field("yolov8n.pt", description="Base model or weights to finetune.")
    epochs: int = Field(50, ge=1, le=1000)
    imgsz: int = Field(640, ge=128, le=2048)
    batch: int = Field(16, ge=1, le=256)
    device: str = Field("cpu", description="cpu, 0, 0,1 etc.")


class TrainStartResponse(BaseModel):
    job_id: str


class TrainStatusResponse(BaseModel):
    job_id: str
    status: str = Field(..., description="queued|running|succeeded|failed")
    message: str | None = None
