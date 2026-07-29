# AGENTS.md — Agent Roles and Contribution Guidelines

This document defines the roles, responsibilities, and guidelines for AI and human agents working on the **CNN Baseline project**. All modifications to code or documentation must adhere to these standards.

---

## 1. Agent Roles & Responsibilities

### 1.1 Project Manager (PM)
* **Responsibility:** Planning, roadmap scheduling, roadmap execution checks, and compliance tracking.
* **Scope:**
  * Defines implementation milestones and checklist validation.
  * Coordinates deliverables across all engineering domains.
  * Ensures compliance with [02-prd.md](../docs/02-prd.md) and [04-environment-architecture.md](../docs/04-environment-architecture.md).
  * Gates progress between milestones.

### 1.2 Data Engineer (DE)
* **Responsibility:** Data preprocessing pipeline, stratified splitting, deduplication, transformations, and augmentation setup.
* **Scope:**
  * Implements `src/data/prepare.py` for dataset validation, hash deduplication, and stratified 70/15/15 splits.
  * Manages `src/data/loader.py` and `src/data/augmentation.py` using PyTorch `Dataset` and `DataLoader` structures.
  * Ensures data leakage is fully eliminated.

### 1.3 Machine Learning Engineer (MLE)
* **Responsibility:** CNN model architecture, training loops, optimizations, checkpointing, and early stopping configurations.
* **Scope:**
  * Defines transfer learning backbones (`src/models/cnn.py`) based on PyTorch architecture candidates.
  * Implements `src/training/train.py` featuring the training loop, loss metrics tracking, early stopping, and state-dict checkpoint saving.
  * Externalizes all hyperparameters into `configs/config.yaml`.

### 1.4 Evaluation Engineer (EE)
* **Responsibility:** Model testing, inference timing, performance metrics generation, and benchmarking against YOLO11.
* **Scope:**
  * Implements `src/evaluation/evaluate.py` to evaluate the saved model on the held-out test split.
  * Computes Accuracy, Precision, Recall, F1 Score, Confusion Matrix, and ROC-AUC metrics.
  * Measures average inference latency on CPU.
  * Coordinates cross-model metrics benchmarking with the YOLO11 model.

### 1.5 Frontend Engineer (FE)
* **Responsibility:** Web prediction dashboard, template styling, UI interactivity, and prediction response formatting.
* **Scope:**
  * Develops the single-page Flask app (`app/app.py`, `app/templates/index.html`).
  * Integrates image upload controls, prediction indicators, confidence visualizations, and response displays.
  * Customizes CSS styling to match the dark-theme aesthetic of the YOLO client.

### 1.6 Documentation Engineer (DocE)
* **Responsibility:** System document creation, code formatting compliance, experiment log maintaining, and codebase walkthrough generation.
* **Scope:**
  * Maintains the top-level README, API docstrings, and experiment diaries.
  * Reviews Google-style docstrings and file organization formats.
  * Compiles final evaluation comparisons and handoff reports.

---

## 2. Interaction Protocols

1. **Scaffold Integration:** No agent may write loose scripts in the root directory. All business logic must live under `src/` as importable modules, with thin wrappers under `scripts/`.
2. **Explicit Verification:** After every feature implementation, the corresponding unit/integration tests or CLI verification checks must be run and documented.
3. **No Hardcoded Configurations:** All directories, sizes, thresholds, learning rates, and seeds must be read from the settings loaded via `src/config.py`.
4. **Git Discipline:** All development must occur on the `feature/cnn-baseline` branch. Commit descriptions should use Conventional Commit formats (e.g. `feat(data): add stratified split manifest generator`).

---

*Last Updated: 2026-07-16*
