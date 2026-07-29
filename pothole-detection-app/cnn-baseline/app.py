"""Flask web application for CNN baseline inference demonstration.

Serves a single-page dashboard displaying the loaded MobileNetV2 classifier
details, allowing users to upload images and viewing real-time classification
outputs (pothole vs normal, confidence levels, inference latency, etc.).
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path
from flask import Flask, jsonify, redirect, render_template, request

# Ensure cnn-baseline/src is in PYTHONPATH
_PROJECT_ROOT = Path(__file__).resolve().parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from src.config import get_config
from src.inference.predictor import PotholePredictor

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%H:%M:%S",
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("flask_app")

app = Flask(__name__)

# --- Auto-detect Checkpoint and Config ---
def resolve_inference_assets() -> tuple[Path, Path]:
    """Resolve the latest experiment run's best model checkpoint and config."""
    experiments_dir = _PROJECT_ROOT / "experiments"
    if not experiments_dir.is_dir():
        raise FileNotFoundError("No 'experiments' directory found. Model must be trained first.")

    # Find latest run folder
    run_dirs = sorted(
        [d for d in experiments_dir.iterdir() if d.is_dir() and d.name.startswith("run_")],
        key=lambda d: d.name,
        reverse=True
    )
    if not run_dirs:
        raise FileNotFoundError("No 'run_*' directories found. Run training before running the web app.")

    latest_run = run_dirs[0]
    checkpoint_path = latest_run / "models" / "best_model.pth"
    config_path = latest_run / "config.yaml"

    if not checkpoint_path.is_file():
        raise FileNotFoundError(f"Best model checkpoint not found at: {checkpoint_path}")

    return checkpoint_path, config_path


# Global predictor instance
predictor = None
checkpoint_info = {}

try:
    checkpoint_file, config_file = resolve_inference_assets()
    logger.info(f"Initializing predictor with checkpoint: {checkpoint_file}")
    predictor = PotholePredictor(checkpoint_path=checkpoint_file, config_path=config_file)
    checkpoint_info = {
        "run_id": checkpoint_file.parents[1].name,
        "checkpoint_name": checkpoint_file.name,
        "model_architecture": predictor.model.architecture_name,
        "device": str(predictor.device)
    }
except Exception as e:
    logger.error(f"Failed to load prediction assets during app startup: {e}")
    checkpoint_info = {
        "error": f"Asset loading failed: {e}. Check that a model is trained under experiments/ directory."
    }


@app.route("/", methods=["GET"])
def index():
    """Render the dashboard page."""
    return render_template("index.html", checkpoint_info=checkpoint_info)


@app.route("/predict", methods=["POST"])
def predict():
    """Predict endpoint receiving uploaded image file."""
    if predictor is None:
        return jsonify({"error": "Model predictor not initialized. Check server startup logs."}), 500

    if "image" not in request.files:
        return jsonify({"error": "No image file provided in the request form data under key 'image'."}), 400

    file = request.files["image"]
    if file.filename == "":
        return jsonify({"error": "Empty filename. Select a valid image file."}), 400

    try:
        # Read file bytes directly to avoid writing to disk
        image_bytes = file.read()
        
        # Run predictor inference
        predictions = predictor.predict(image_bytes)
        
        # Log prediction result
        logger.info(
            f"Prediction: class={predictions['predicted_class']} | "
            f"conf={predictions['confidence']:.4f} | "
            f"latency={predictions['inference_time_ms']:.2f}ms"
        )
        
        return jsonify(predictions)
    except Exception as e:
        logger.error(f"Error performing Web inference: {e}")
        return jsonify({"error": f"Inference failed: {str(e)}"}), 500


if __name__ == "__main__":
    # Load settings from configs/config.yaml for hosting
    try:
        cfg = get_config()
        device_str = cfg.project.get("device", "cpu")
    except Exception:
        device_str = "cpu"

    logger.info("Starting Flask application dev server on http://127.0.0.1:5000")
    app.run(host="127.0.0.1", port=5000, debug=True)
