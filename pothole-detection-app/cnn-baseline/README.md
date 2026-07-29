# CNN Baseline for Pothole Detection Comparison

This directory contains the **CNN-based binary image classifier** (Pothole / No Pothole) designed to act as a lightweight baseline for the primary YOLO11 object detection system in the B05 major project. 

The baseline model will be compared with YOLO11 on evaluation metrics, inference speed, and model footprint size to assess the trade-offs of object detection vs. binary classification.

---

## 1. Project Overview

- **Task:** Binary image classification (Class 1: Pothole, Class 0: No Pothole)
- **Framework:** PyTorch (with `torchvision` backbones)
- **Dataset:** ~681 image subsets, resized to 224x224, split 70% train / 15% val / 15% test
- **Backbone candidates:** MobileNetV2, EfficientNetB0, ResNet18 (using ImageNet transfer learning)
- **Evaluation metrics:** Accuracy, Precision, Recall, F1 Score, Confusion Matrix, ROC-AUC, Latency (CPU), and Model Size
- **Demonstration:** Minimal single-page Flask web application

---

## 2. Directory Structure

This project enforces strict modularity. The folder hierarchy is organized as follows:

```
cnn-baseline/
├── configs/
│   └── config.yaml          # Hyperparameters, directory paths, and training configuration
├── data/
│   ├── processed/           # Reorganized train/val/test splits (gitignored)
│   └── split_manifest.json  # Manifest record of stratified random splits
├── src/                     # Core business logic (importable modules)
│   ├── data/                # Dataset splitting, cleaning, loading, and transformations
│   ├── models/              # Transfer learning CNN models
│   ├── training/            # Custom training loop, validation, early stopping logic
│   ├── evaluation/          # Test set evaluation, metrics, and visualization utilities
│   ├── inference/           # Image loading, preprocessing, and prediction wrapper
│   └── config.py            # Configuration loader and setting validator
├── app/                     # Flask web demo (app.py, templates, static assets)
├── scripts/                 # CLI entry points (wrappers calling src/ functions)
├── outputs/                 # Artifacts produced during runtimes (models gitignored)
├── experiments/             # Experiment diaries and logs
└── tests/                   # Unit and integration test suites
```

---

## 3. Installation & Setup Steps

### 3.1 Prerequisite Check
Ensure Python 3.13+ is installed on your system.

### 3.2 Establish Virtual Environment
Create and activate a separate virtual environment inside this project:

```powershell
cd B05-major/cnn-baseline
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### 3.3 Install Dependencies
Upgrade pip and install pinned libraries:

```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

---

## 4. Planned Development Workflow

Development follows a 7-stage sequential plan:

1. **Milestone 1 (Scaffold):** Establish project dirs, configs, dependencies, and rules (Completed).
2. **Milestone 2 (Data Pipeline):** Hash deduplication, stratified splits, manifest creation, and PyTorch dataloaders with training augmentation.
3. **Milestone 3 (CNN Model):** Design transfer-learning class using torchvision model backbones.
4. **Milestone 4 (Training Loop):** Custom PyTorch training script with validation loss checks, state-dict checkpoints, and early stopping.
5. **Milestone 5 (Evaluation):** Compute all classification report metrics on the test split, plotting confusion matrices and ROC curves.
6. **Milestone 6 (Flask App):** Develop a web interface displaying previews, prediction statuses, confidence levels, and latencies.
7. **Milestone 7 (Documentation & Benchmark):** Create final performance matrices comparing the CNN with the YOLO11 model.

---

*Last Updated: 2026-07-16*
