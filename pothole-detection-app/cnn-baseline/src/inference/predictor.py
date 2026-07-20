"""Predictor class wrapping CNN baseline inference.

Loads the trained model checkpoint once, preprocesses inputs, runs model forward
pass in evaluation mode under no_grad, and formats the output predictions,
confidences, latencies, and probability distributions.
"""

from __future__ import annotations

import logging
import time
from pathlib import Path
from typing import Any, Dict, List, Tuple
from PIL import Image

import torch
import torch.nn as nn

from src.config import get_config
from src.models.cnn import ModelFactory
from src.inference.preprocess import preprocess_image

logger = logging.getLogger(__name__)


class PotholePredictor:
    """Predictor class for binary pothole classification inference."""

    def __init__(
        self,
        checkpoint_path: str | Path,
        config_path: str | Path | None = None,
        device: str | None = None,
    ) -> None:
        """Initialize the predictor loading config and weights.

        Args:
            checkpoint_path: Path to the trained .pth checkpoint file.
            config_path: Path to the config file (defaults to configs/config.yaml).
            device: Overriding device choice ('cpu' or 'cuda'). If None, resolves from config.
        """
        # 1. Load config
        self.config = get_config(config_path)
        self.image_size = self.config.preprocessing.get("image_size", 224)
        self.class_names: List[str] = self.config.dataset.get(
            "class_names", ["normal", "pothole"]
        )

        # 2. Resolve device
        if device is None:
            cfg_device = self.config.project.get("device", "cpu")
            if cfg_device == "cuda" and not torch.cuda.is_available():
                logger.warning("CUDA requested but not available. Using CPU.")
                cfg_device = "cpu"
            self.device = torch.device(cfg_device)
        else:
            self.device = torch.device(device)

        # 3. Build model
        logger.info(f"Building classifier model architecture for inference...")
        self.model = ModelFactory.create_model(self.config.raw)

        # 4. Load checkpoint
        checkpoint_path = Path(checkpoint_path)
        if not checkpoint_path.is_file():
            raise FileNotFoundError(f"Checkpoint file not found at: {checkpoint_path}")

        logger.info(f"Loading trained weights from checkpoint: {checkpoint_path}...")
        # Since we only run inference, we use weights_only=False to load config dictionary metadata if needed
        checkpoint = torch.load(checkpoint_path, map_location=self.device, weights_only=False)
        self.model.load_state_dict(checkpoint["model_state_dict"])
        self.model.to(self.device)
        self.model.eval()

        logger.info(
            "PotholePredictor successfully initialized  |  "
            f"arch={self.model.architecture_name}  |  device={self.device}"
        )

    def predict(
        self,
        image_input: str | Path | bytes | Image.Image,
    ) -> Dict[str, Any]:
        """Perform classification inference on a single input image.

        Args:
            image_input: Path to file, raw image bytes, or an open PIL Image.

        Returns:
            Dict containing prediction metadata:
              - 'predicted_class': Class name string ('normal' or 'pothole')
              - 'confidence': Softmax confidence float (0.0 to 1.0)
              - 'inference_time_ms': Inference latency in milliseconds
              - 'class_probabilities': Dict mapping class names to probability floats
        """
        start_time = time.perf_counter()

        # 1. Preprocess image
        img_tensor = preprocess_image(image_input, image_size=self.image_size)
        img_tensor = img_tensor.to(self.device)

        # 2. Run model forward pass under torch.no_grad()
        with torch.no_grad():
            # Get logits
            logits = self.model(img_tensor)
            # Apply Softmax to get probability distribution
            probabilities = torch.softmax(logits, dim=1).squeeze(0)

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        # 3. Resolve results
        pred_idx = int(torch.argmax(probabilities).item())
        predicted_class = self.class_names[pred_idx]
        confidence = float(probabilities[pred_idx].item())

        class_probabilities = {
            self.class_names[i]: float(probabilities[i].item())
            for i in range(len(self.class_names))
        }

        return {
            "predicted_class": predicted_class,
            "confidence": round(confidence, 4),
            "inference_time_ms": round(elapsed_ms, 2),
            "class_probabilities": {
                k: round(v, 4) for k, v in class_probabilities.items()
            },
        }
