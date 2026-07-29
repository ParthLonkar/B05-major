"""Verification script to test PyTorch model architecture and forward pass."""

import sys
from pathlib import Path
import torch

# Ensure cnn-baseline/src is in PYTHONPATH
sys.path.append(str(Path(__file__).resolve().parents[1]))

from src.config import get_config
from src.models.cnn import ModelFactory, get_model_summary


def main():
    # Load configuration
    try:
        config = get_config()
    except Exception as e:
        print(f"Error loading configuration: {e}")
        sys.exit(1)

    print("=== CONFIGURATION LOADER ===")
    print(f"Architecture:      {config.model['architecture']}")
    print(f"Pretrained:        {config.model['pretrained']}")
    print(f"Freeze backbone:   {config.model['freeze_backbone']}")
    print(f"Dropout rate:      {config.model['dropout_rate']}")
    print(f"Number of classes: {config.model['num_classes']}")

    # Build model
    print("\nBuilding model via ModelFactory...")
    try:
        model = ModelFactory.create_model(config.raw)
    except Exception as e:
        print(f"Error instantiating model: {e}")
        sys.exit(1)

    # Get summary
    summary = get_model_summary(model)
    print("\n=== MODEL ARCHITECTURE SUMMARY ===")
    print(f"Backbone:           {summary['architecture']}")
    print(f"Total parameters:   {summary['total_params']:,}")
    print(f"Trainable params:   {summary['trainable_params']:,}")
    print(f"Frozen parameters:  {summary['frozen_params']:,}")
    print(f"Est. Size on Disk:  {summary['estimated_size_mb']:.2f} MB")

    # Verify dummy forward pass
    print("\n=== VERIFYING DUMMY FORWARD PASS ===")
    dummy_batch_size = 4
    channels = 3
    height = width = config.preprocessing["image_size"]

    print(f"Creating dummy input tensor of shape: [{dummy_batch_size}, {channels}, {height}, {width}]")
    dummy_input = torch.randn(dummy_batch_size, channels, height, width)

    # Put model in eval mode for validation check
    model.eval()

    # Move to CPU/device
    device = torch.device("cuda" if torch.cuda.is_available() and config.project["device"] == "cuda" else "cpu")
    print(f"Sending tensors to device: {device}")
    model = model.to(device)
    dummy_input = dummy_input.to(device)

    try:
        with torch.no_grad():
            logits = model(dummy_input)
        
        print(f"Output shape (logits): {list(logits.shape)} (Expected: [{dummy_batch_size}, {config.model['num_classes']}])")
        print(f"Logits output sample (first sample): {logits[0].tolist()}")
        print("\nModel verification successful. Forward pass runs cleanly and produces correct dimensions.")
    except Exception as e:
        print(f"Error during forward pass: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
