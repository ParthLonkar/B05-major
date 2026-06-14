from __future__ import annotations

import argparse

from ultralytics import YOLO


def main() -> None:
    parser = argparse.ArgumentParser(description="Train a YOLO model for pothole detection.")
    parser.add_argument("--data", required=True, help="Path to YOLO data YAML (e.g. data/pothole.yaml).")
    parser.add_argument("--model", default="yolov8n.pt", help="Base model or weights to finetune.")
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--batch", type=int, default=16)
    parser.add_argument("--device", default="cpu", help="cpu, 0, 0,1 etc.")
    args = parser.parse_args()

    model = YOLO(args.model)
    model.train(
        data=args.data,
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        device=args.device,
    )


if __name__ == "__main__":
    main()

