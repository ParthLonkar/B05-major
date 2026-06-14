$ErrorActionPreference = "Stop"

if (!(Test-Path ".\.venv\Scripts\Activate.ps1")) {
  throw "Missing .venv. Run: python -m venv .venv"
}

.\.venv\Scripts\Activate.ps1

if (-not $env:POTHOLE_MODEL_PATH) {
  throw "Set POTHOLE_MODEL_PATH to your weights (e.g. runs\\detect\\train\\weights\\best.pt)."
}

uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

