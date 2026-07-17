# Pothole Detection — Complete Repository Analysis & Next-Task Plan

## Executive Summary

This repository contains **two existing, working components** (a YOLO-based detection system and an Android client) plus a **newly drafted vision document** for a CNN binary-classification baseline. The CNN baseline has **zero implementation** so far — only the vision doc exists.

The dataset is present but **critically under-labeled**: of ~681 images, only **9** have actual bounding-box annotations. This is the single biggest blocker for any ML work.

---

## 1. Project Structure

```
Pothole/
├── docs/
│   └── 01-project-vision.md          ← CNN baseline vision (NEW, awaiting approval)
└── B05-major/
    ├── pothole-detection-app/         ← YOLO detection system (EXISTING)
    │   ├── backend/                   ← FastAPI server (main.py, schemas.py)
    │   ├── pothole/                   ← Core inference module
    │   ├── scripts/                   ← Training/dataset utilities
    │   ├── data/                      ← YOLO data YAML configs
    │   ├── datasets/kaggle_potholes/  ← Image dataset (partially labeled)
    │   └── requirements.txt
    └── pothole-android-app/           ← Android client (Kotlin/Compose)
        └── app/src/main/java/com/example/potholedetector/
```

**Architecture:** Client-server. The FastAPI backend serves YOLO inference; the Android app and a built-in browser demo act as clients. The CNN baseline project described in the vision document is an entirely **separate** system that does not yet exist in code.

---

## 2. Documentation Review

| Document | Status | Notes |
|----------|--------|-------|
| [01-project-vision.md](file:///c:/Users/Shreesh Pawar/OneDrive/Desktop/Pothole/docs/01-project-vision.md) | ✅ Present (v1.0) | CNN baseline vision. Well-structured. Marked "Awaiting Approval" |
| YOLO [README.md](file:///c:/Users/Shreesh Pawar/OneDrive/Desktop/Pothole/B05-major/pothole-detection-app/README.md) | ✅ Present | Thorough quickstart, training, and config docs |
| Android [README.md](file:///c:/Users/Shreesh Pawar/OneDrive/Desktop/Pothole/B05-major/pothole-android-app/README.md) | ✅ Present | Setup + emulator instructions |
| Dataset [README.md](file:///c:/Users/Shreesh Pawar/OneDrive/Desktop/Pothole/B05-major/pothole-detection-app/datasets/kaggle_potholes/README.md) | ✅ Present | LabelImg labeling workflow guide |
| PRD | ❌ Missing | Listed as next step in vision doc |
| Architecture Document | ❌ Missing | |
| AGENTS.md | ❌ Missing | Referenced in vision doc's "Next Steps" |
| Root README.md | ❌ Missing | No top-level project overview |
| config.yaml | ❌ Missing | Vision doc references it for reproducibility |
| License | ❌ Missing | |

---

## 3. Codebase Analysis

### 3.1 Backend — `pothole-detection-app/backend/`

| File | Purpose | Status | Observations |
|------|---------|--------|--------------|
| [main.py](file:///c:/Users/Shreesh Pawar/OneDrive/Desktop/Pothole/B05-major/pothole-detection-app/backend/main.py) | FastAPI app: endpoints + inline HTML demo | ✅ Complete | Duplicate `from __future__` import on L1-3. 583-line monolith with ~430 lines of inline HTML/JS — works but fragile |
| [schemas.py](file:///c:/Users/Shreesh Pawar/OneDrive/Desktop/Pothole/B05-major/pothole-detection-app/backend/schemas.py) | Pydantic models | ✅ Complete | Clean, well-typed |

**Endpoints implemented:**
- `GET /` — HTML demo UI (Pixel 5 style)
- `GET /health`
- `POST /predict/image` — JSON detections
- `POST /predict/image/annotated` — Annotated PNG
- `POST /train/start` — Async YOLO training (gated behind env var)
- `GET /train/status/{job_id}`

### 3.2 Core Module — `pothole-detection-app/pothole/`

| File | Purpose | Status | Observations |
|------|---------|--------|--------------|
| [config.py](file:///c:/Users/Shreesh Pawar/OneDrive/Desktop/Pothole/B05-major/pothole-detection-app/pothole/config.py) | Environment-based settings | ✅ Complete | Clean dataclass-based config |
| [model.py](file:///c:/Users/Shreesh Pawar/OneDrive/Desktop/Pothole/B05-major/pothole-detection-app/pothole/model.py) | YOLO model loading with LRU cache | ✅ Complete | |
| [inference.py](file:///c:/Users/Shreesh Pawar/OneDrive/Desktop/Pothole/B05-major/pothole-detection-app/pothole/inference.py) | YOLO prediction + drawing | ✅ Complete | Includes severity heuristic (area-based) |
| [types.py](file:///c:/Users/Shreesh Pawar/OneDrive/Desktop/Pothole/B05-major/pothole-detection-app/pothole/types.py) | Detection dataclass | ✅ Complete | |
| [heuristic.py](file:///c:/Users/Shreesh Pawar/OneDrive/Desktop/Pothole/B05-major/pothole-detection-app/pothole/heuristic.py) | CV-based fallback detector (no ML) | ✅ Complete | Dark-blob + edge detection fallback when weights missing |

### 3.3 Scripts — `pothole-detection-app/scripts/`

| Script | Purpose | Status |
|--------|---------|--------|
| [train_yolo.py](file:///c:/Users/Shreesh Pawar/OneDrive/Desktop/Pothole/B05-major/pothole-detection-app/scripts/train_yolo.py) | CLI YOLO training wrapper | ✅ Complete |
| [validate_yolo_dataset.py](file:///c:/Users/Shreesh Pawar/OneDrive/Desktop/Pothole/B05-major/pothole-detection-app/scripts/validate_yolo_dataset.py) | Dataset integrity checker | ✅ Complete |
| [make_mini_dataset.py](file:///c:/Users/Shreesh Pawar/OneDrive/Desktop/Pothole/B05-major/pothole-detection-app/scripts/make_mini_dataset.py) | Mini subset creator | ✅ Complete |
| [bootstrap_empty_labels.py](file:///c:/Users/Shreesh Pawar/OneDrive/Desktop/Pothole/B05-major/pothole-detection-app/scripts/bootstrap_empty_labels.py) | Create empty .txt label stubs | ✅ Complete |
| [fix_labelimg_windows.py](file:///c:/Users/Shreesh Pawar/OneDrive/Desktop/Pothole/B05-major/pothole-detection-app/scripts/fix_labelimg_windows.py) | Patch LabelImg Python/Qt bugs | ✅ Complete |
| [run_backend.ps1](file:///c:/Users/Shreesh Pawar/OneDrive/Desktop/Pothole/B05-major/pothole-detection-app/scripts/run_backend.ps1) | PowerShell launcher | ✅ Complete |

### 3.4 Android App — `pothole-android-app/`

| Component | Purpose | Status |
|-----------|---------|--------|
| `MainActivity.kt` | Compose UI — camera/gallery capture + results display | ✅ Complete |
| `MainViewModel.kt` | ViewModel orchestrating uploads + state | ✅ Complete |
| `CameraCaptureSheet.kt` | CameraX capture bottom sheet | ✅ Complete |
| `AppConfig.kt` | Backend base URL config | ✅ Complete |
| `Detection.kt` | Data model matching API schema | ✅ Complete |
| `PotholeApi.kt` | OkHttp + Moshi API client | ✅ Complete |
| `Bitmaps.kt` | Image utility helpers | ✅ Complete |

---

## 4. ML Pipeline Analysis (CNN Baseline — per Vision Doc)

| Component | Status | Notes |
|-----------|--------|-------|
| Dataset loader | ❌ Missing | No CNN/classification dataset loader exists |
| Dataset preprocessing | ❌ Missing | |
| Data augmentation | ❌ Missing | |
| Train/Val/Test split | 🟡 Partial | YOLO images have train/val folders, but no test split; classification split doesn't exist |
| CNN architecture | ❌ Missing | Vision doc suggests ResNet-18 / MobileNetV2 / custom |
| Transfer learning | ❌ Missing | |
| Training loop | ❌ Missing | Only YOLO training exists |
| Evaluation pipeline | ❌ Missing | No confusion matrix, metrics, or evaluation script |
| Model saving/checkpointing | ❌ Missing | |
| Prediction pipeline (CNN) | ❌ Missing | |
| Flask demo (CNN) | ❌ Missing | Vision doc calls for Flask; only FastAPI/YOLO exists |
| config.yaml | ❌ Missing | Vision doc requires it for reproducibility |
| Comparison framework | ❌ Missing | YOLO vs CNN benchmark document |

### ML Pipeline Analysis (YOLO — Existing System)

| Component | Status | Notes |
|-----------|--------|-------|
| Dataset loader | ✅ Complete | Via Ultralytics/YOLO data YAML |
| Dataset preprocessing | ✅ Complete | Handled by Ultralytics |
| Data augmentation | ✅ Complete | Ultralytics defaults |
| Train/Val split | ✅ Complete | Folder-based split |
| YOLO architecture | ✅ Complete | YOLOv8n via Ultralytics |
| Training script | ✅ Complete | CLI + API |
| Inference pipeline | ✅ Complete | With heuristic fallback |
| Model serving | ✅ Complete | FastAPI |

---

## 5. Dataset Analysis

> [!CAUTION]
> **The dataset is critically under-labeled. This is the #1 project blocker.**

| Split | Images (Pothole) | Images (Normal) | Labels with Boxes | Empty Labels |
|-------|------------------|-----------------|--------------------|--------------|
| Train | 192 | 352 | **0** | 544 |
| Val | 137 | 0 | **9** | 129 |
| **Total** | **329** | **352** | **9** | **673** |

**Key Issues:**
1. **Only 9 out of 681 images have actual bounding-box annotations** — the rest have empty `.txt` files (created by `bootstrap_empty_labels.py`)
2. **No val/normal images** — validation set only contains pothole class images
3. **No test split** at all — the vision doc requires a held-out test set
4. **Class imbalance in val**: all 137 val images are pothole, zero are normal
5. The folder structure (`potholes/`, `normal/`) already provides implicit classification labels, which is useful for the CNN baseline — but YOLO training needs bounding boxes, not just folder labels

**For the CNN baseline specifically:** The folder-based class labels (potholes vs. normal) are actually sufficient for binary classification — no bounding boxes needed. This is a critical insight: the CNN project can proceed using the existing image organization.

---

## 6. Environment Analysis

### [requirements.txt](file:///c:/Users/Shreesh Pawar/OneDrive/Desktop/Pothole/B05-major/pothole-detection-app/requirements.txt)

```
fastapi>=0.110,<1
uvicorn[standard]>=0.23,<1
python-multipart>=0.0.9,<1
pydantic>=2.5,<3
numpy>=1.23,<2
pillow>=10,<11
opencv-python>=4.8,<5
ultralytics>=8.1,<9
```

| Observation | Severity |
|-------------|----------|
| Versions are range-locked (good) | ✅ |
| No `torch` / `torchvision` — pulled transitively by `ultralytics` | ⚠️ Implicit |
| No `pyproject.toml` — uses requirements.txt only | 🟡 Minor |
| No dev dependencies (pytest, ruff, mypy) | 🟡 Missing |
| CNN baseline will need its own `requirements.txt` (PyTorch, torchvision, Flask, scikit-learn, matplotlib) | ❌ Missing |

---

## 7. Frontend Analysis

| Frontend | Status | Notes |
|----------|--------|-------|
| Web UI (YOLO) | ✅ Exists | Inline HTML in `main.py`. Mobile-style demo with predict + train tabs. Functional but monolithic |
| Android App | ✅ Exists | Kotlin/Compose. Full camera/gallery → API → results flow |
| Flask UI (CNN baseline) | ❌ Missing | Vision doc specifies a Flask single-page demo |

---

## 8. Backend Analysis

| Component | Status | Notes |
|-----------|--------|-------|
| FastAPI server | ✅ Running | YOLO inference + training |
| `/predict/image` | ✅ Complete | JSON response + heuristic fallback |
| `/predict/image/annotated` | ✅ Complete | PNG response |
| `/health` | ✅ Complete | |
| `/train/*` | ✅ Complete | Gated behind `ENABLE_TRAINING_API` env var |
| Error handling | ✅ Complete | HTTPExceptions with status codes |
| Model loading | ✅ Complete | LRU-cached singleton |
| CNN prediction endpoint | ❌ Missing | |

---

## 9. Testing Analysis

| Test Type | Status |
|-----------|--------|
| Unit tests | ❌ None |
| Integration tests | ❌ None |
| Model tests | ❌ None |
| Dataset validation | 🟡 Partial — `validate_yolo_dataset.py` exists but is a script, not an automated test |
| CI/CD | ❌ None |

---

## 10. GitHub Readiness

| Item | Status | Action Needed |
|------|--------|---------------|
| Root README.md | ❌ Missing | Create top-level project overview linking both sub-projects |
| License | ❌ Missing | Add MIT or appropriate license |
| Root .gitignore | ❌ Missing | Only `pothole-detection-app/` has one |
| Folder organization | 🟡 OK | `B05-major` naming is non-descriptive for portfolio |
| Code quality | ✅ Good | Clean, typed Python; proper dataclasses |
| Documentation | 🟡 Partial | Individual READMEs exist; no architectural overview |
| Reproducibility | ❌ Missing | No `config.yaml`, no seed-setting, no environment lock file |

---

## Progress Report

### ✅ Completed
- YOLO-based pothole detection backend (FastAPI)
- YOLO inference pipeline with heuristic fallback
- YOLO training script (CLI + API)
- Dataset utilities (validation, mini-dataset, label bootstrap, LabelImg fix)
- Mobile-style web demo UI
- Android client app (Kotlin/Compose/CameraX)
- Dataset YAML configs
- Individual module documentation (READMEs)
- Project vision document for CNN baseline

### 🟡 Partially Completed
- Dataset collection (images present, labels almost entirely empty)
- Val split (no normal images in validation)
- Documentation (no root README, no PRD, no architecture doc)

### ❌ Missing (CNN Baseline — Everything)
- PRD document
- CNN architecture design
- CNN training pipeline
- CNN evaluation pipeline
- CNN Flask demo
- CNN `requirements.txt` / `config.yaml`
- CNN prediction API
- Comparison framework (YOLO vs CNN)
- AGENTS.md
- Automated tests
- Root README and License

---

## Gap Analysis

### 🔴 High Priority

| Gap | Rationale |
|-----|-----------|
| **CNN project scaffold** (PRD → folder structure → config → requirements) | Nothing from the vision doc is implemented yet; this is the prerequisite for all CNN work |
| **Classification dataset preparation** | The existing images in `potholes/` and `normal/` folders can serve as classification labels, but need: proper train/val/test split, image verification, class balance analysis, and a data-loading pipeline |
| **CNN architecture + training pipeline** | The core ML deliverable — zero code exists |
| **Evaluation pipeline** | Required to measure success criteria from vision doc |

### 🟡 Medium Priority

| Gap | Rationale |
|-----|-----------|
| Flask inference demo | Vision doc scope item |
| Comparison framework document | Needed for YOLO vs CNN benchmarking |
| Root README.md + License | GitHub portfolio readiness |
| AGENTS.md | Developer onboarding |
| `config.yaml` for reproducibility | Vision doc principle |

### 🟢 Low Priority

| Gap | Rationale |
|-----|-----------|
| Automated tests | Important but not blocking ML work |
| YOLO label annotations | Needed for YOLO training but CNN doesn't require bounding boxes |
| CI/CD pipeline | Post-development concern |
| Refactor inline HTML from `main.py` | Cosmetic improvement |

---

## Task Planning

| # | Task | Files | Complexity | Dependencies | Expected Output |
|---|------|-------|------------|--------------|-----------------|
| 1 | **Create PRD** for CNN baseline | `docs/02-prd.md` | Low | Vision doc approved | Complete product requirements document |
| 2 | **Create CNN project folder structure** | `cnn-baseline/` tree | Low | PRD | Empty project scaffold with proper directories |
| 3 | **Create `config.yaml` + `requirements.txt`** for CNN | `cnn-baseline/config.yaml`, `cnn-baseline/requirements.txt` | Low | Folder structure | Locked environment + hyperparameters |
| 4 | **Build classification dataset pipeline** | `cnn-baseline/src/data/dataset.py`, `cnn-baseline/src/data/transforms.py` | Medium | Config, requirements | PyTorch Dataset/DataLoader reading from existing image folders, with augmentation, train/val/test split |
| 5 | **Design + implement CNN architecture** | `cnn-baseline/src/models/cnn.py` | Medium | Dataset pipeline | Model class (custom CNN + optional ResNet-18/MobileNetV2 transfer learning) |
| 6 | **Build training loop** | `cnn-baseline/src/train.py` | Medium | Model + Data | Training script with validation, early stopping, checkpointing, logging |
| 7 | **Build evaluation pipeline** | `cnn-baseline/src/evaluate.py` | Medium | Trained model | Confusion matrix, accuracy, precision, recall, F1, inference time, model size |
| 8 | **Build Flask demo** | `cnn-baseline/app.py`, templates | Medium | Trained model | Single-page web interface for classification visualization |
| 9 | **Create comparison framework** | `docs/comparison.md` | Low | Both models evaluated | YOLO vs CNN metrics comparison document |
| 10 | **Root README + AGENTS.md + License** | Root-level files | Low | All components | Professional GitHub portfolio documentation |

---

## Recommended Next Task

> **Task 1: Create the Product Requirements Document (PRD)**

### Why this task first?

1. **The vision doc explicitly gates all implementation on sequential document creation** — the PRD is listed as step #1 in the "Next Steps" section
2. **Zero CNN code exists** — jumping to code would skip the planning phase the vision doc mandates
3. **The PRD will formalize** the exact dataset strategy (reusing existing classification-ready image folders), CNN architecture choice, success metrics, and Flask demo scope — resolving ambiguities before any code is written
4. **Low complexity, high leverage** — a 1-hour document that de-risks weeks of implementation by catching design issues early
5. **Dependency chain** — every subsequent task (folder structure, config, dataset pipeline, model) depends on decisions made in the PRD

### Objective
Create `docs/02-prd.md` — a complete Product Requirements Document that translates the vision into actionable, implementable specifications.

### Files Involved
- **Input:** [01-project-vision.md](file:///c:/Users/Shreesh Pawar/OneDrive/Desktop/Pothole/docs/01-project-vision.md)
- **Output:** `docs/02-prd.md` (new file)

### Estimated Complexity
Low (~30 minutes)

### Expected Output
A PRD covering: functional requirements, dataset plan (reusing existing `potholes/` vs `normal/` folders for classification), CNN architecture specification, training configuration, evaluation criteria, Flask demo spec, and folder structure proposal.

---

> [!IMPORTANT]
> **Awaiting your approval to proceed with Task 1 (PRD creation).** No files will be modified or created until you confirm.

## Open Questions

1. **Vision doc approval status:** The vision doc is marked "Awaiting Approval" — should I treat it as approved and proceed with the PRD, or do you want to revise it first?
2. **CNN project location:** Should the CNN baseline live under `B05-major/` alongside the existing YOLO project, or as a new top-level directory like `cnn-baseline/`?
3. **Framework choice:** The vision doc specifies Flask for the CNN demo, while the existing YOLO system uses FastAPI. Should we keep Flask as stated, or unify on FastAPI for consistency?
