"""Preprocessing utilities for CNN baseline inference.

This module exposes image validation, conversion to RGB, resizing, and ImageNet
normalization functions to format raw images into a batched PyTorch tensor
suitable for model prediction.
"""

from __future__ import annotations

import io
import logging
from pathlib import Path
from PIL import Image
import torch
from torchvision import transforms

logger = logging.getLogger(__name__)


def preprocess_image(
    image_input: str | Path | bytes | Image.Image,
    image_size: int = 224,
) -> torch.Tensor:
    """Validate, load, and preprocess an image for CNN inference.

    Preprocessing pipeline:
      1. Open or resolve the image input (path, bytes, or PIL Image).
      2. Convert the image to RGB mode (discard alpha channel or handle grayscale).
      3. Resize the image to (image_size, image_size).
      4. Convert to a PyTorch float tensor scaled to [0.0, 1.0].
      5. Normalize with ImageNet channel statistics (mean/std).
      6. Add a batch dimension, returning shape [1, 3, image_size, image_size].

    Args:
        image_input: Path to file, raw image bytes, or an open PIL Image.
        image_size: Target dimension for square resize (default: 224).

    Returns:
        A batched PyTorch tensor ready for model inference.

    Raises:
        ValueError: If the input cannot be loaded as a valid image.
    """
    try:
        # Load the PIL Image depending on the input type
        if isinstance(image_input, (str, Path)):
            img_path = Path(image_input)
            if not img_path.is_file():
                raise FileNotFoundError(f"Image file not found: {img_path}")
            img = Image.open(img_path)
        elif isinstance(image_input, bytes):
            img = Image.open(io.BytesIO(image_input))
        elif isinstance(image_input, Image.Image):
            img = image_input
        else:
            raise TypeError(
                f"Unsupported image input type: {type(image_input)}. "
                "Must be a path (str/Path), raw bytes, or PIL Image."
            )

        # Convert to RGB to ensure 3 channels
        img_rgb = img.convert("RGB")

        # Define transform pipeline matching val/test transforms
        inference_transforms = transforms.Compose([
            transforms.Resize((image_size, image_size)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            )
        ])

        # Apply transformation
        img_tensor = inference_transforms(img_rgb)

        # Add batch dimension [1, C, H, W]
        batched_tensor = img_tensor.unsqueeze(0)
        return batched_tensor

    except Exception as e:
        logger.error(f"Failed to preprocess image: {e}")
        raise ValueError(f"Invalid image input or format error: {e}") from e
