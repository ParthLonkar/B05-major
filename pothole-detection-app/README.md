# Pothole Detection App (Training + Inference)

This is a pothole detection project:

- **Train** a YOLO model on your pothole dataset (YOLO format)
- **Serve** predictions via a **FastAPI** backend
- **Use** the native **Android app** in `pothole-android-app/` (no web UI)

## 1) Prerequisites

- Windows / macOS / Linux
- Python **3.10+** recommended

## 2) Install

```powershell
cd pothole-detection-app
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

## 3) Quickstart (demo inference)

This project runs with any YOLO weights file. For potholes, you should **train your own weights** (see section 5).

Note: Ultralytics may download base weights the first time you train (e.g. `yolov8n.pt`), which requires internet access.

Set a model path (example points to your trained weights):

```powershell
$env:POTHOLE_MODEL_PATH = "runs\detect\train\weights\best.pt"
```

## 4) Run the API backend (required for Android app)

```powershell
cd pothole-detection-app
.\.venv\Scripts\Activate.ps1
$env:POTHOLE_MODEL_PATH = "runs\detect\train\weights\best.pt"
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

Endpoints:

- `GET /health`
- `GET /` (mobile demo UI in browser, Pixel 5 style)
- `POST /predict/image` (JSON detections)
- `POST /predict/image/annotated` (returns an annotated PNG)

You can optionally send `conf` and `iou` as multipart form fields (the demo UI and Android app do this).

## 5) Train on your pothole dataset (YOLO format)

### 5.1 Prepare dataset

Expected dataset layout (YOLOv5/YOLOv8 style):

```
dataset/
  images/
    train/
    val/
  labels/
    train/
    val/
```

Each label is a `.txt` with lines:
`<class_id> <x_center> <y_center> <width> <height>` (all normalized 0..1).

### 5.2 Create a `data.yaml`

Copy `data/pothole.yaml` and edit paths:

```yaml
path: D:\path\to\dataset
train: images/train
val: images/val
names:
  0: pothole
```

### 5.3 Train

```powershell
cd pothole-detection-app
.\.venv\Scripts\Activate.ps1
python scripts\train_yolo.py --data data\pothole.yaml --epochs 50 --imgsz 640
```

Your weights will be saved under `runs/detect/train*/weights/best.pt`.

### Quick demo training (5 pothole + 5 normal)

1) Label at least 5 pothole images (draw boxes) and keep some normal images with empty labels.
2) Create a tiny subset dataset:

```powershell
python scripts\make_mini_dataset.py --root datasets\kaggle_potholes --out datasets\kaggle_potholes_mini --pothole 5 --normal 5
```

3) Train quickly:

```powershell
python scripts\train_yolo.py --data data\kaggle_potholes_mini.yaml --epochs 10 --imgsz 640 --batch 8 --device cpu
```

## 6) Configuration

Environment variables:

- `POTHOLE_MODEL_PATH` (required): path to `.pt` weights
- `POTHOLE_DEVICE` (optional): `cpu`, `0`, `0,1` (default: `cpu`)
- `POTHOLE_CONF` (optional): confidence threshold (default: `0.25`)
- `POTHOLE_IOU` (optional): IoU threshold (default: `0.45`)
- `POTHOLE_CLASS_NAME` (optional): label name to treat as pothole (default: `pothole`)
- `POTHOLE_ALLOW_ANY_CLASS` (optional): set to `1` to disable class filtering (shows all detections; useful for debugging)
- `ENABLE_TRAINING_API` (optional): set to `1` to enable `/train/*` endpoints for local training (default: disabled)

## 7) Project structure

```
pothole-detection-app/
  backend/        # FastAPI server
  pothole/        # Core inference utilities
  scripts/        # Training utilities
  data/           # Example dataset config
  requirements.txt
```

## 8) Android app (native)

There is also a native Android client app in `pothole-android-app/` that uses this backend for inference.
