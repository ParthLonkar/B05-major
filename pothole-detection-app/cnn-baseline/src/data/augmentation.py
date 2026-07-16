"""Augmentation pipeline definitions using torchvision transforms."""

from torchvision import transforms


def get_train_transforms(image_size: int = 224) -> transforms.Compose:
    """Get the PyTorch transformation pipeline for training (includes augmentation)."""
    return transforms.Compose(
        [
            # Random crop and scale to target size
            transforms.RandomResizedCrop(
                size=(image_size, image_size),
                scale=(0.80, 1.0),
                ratio=(0.9, 1.1)
            ),
            # Horizontal flip with 50% probability
            transforms.RandomHorizontalFlip(p=0.5),
            # Slight random rotations (±15 degrees)
            transforms.RandomRotation(degrees=15),
            # Lighting, contrast, saturation, and hue alterations
            transforms.ColorJitter(
                brightness=0.2,
                contrast=0.2,
                saturation=0.2,
                hue=0.05
            ),
            # Convert PIL image to tensor, mapping range [0, 255] to [0.0, 1.0]
            transforms.ToTensor(),
            # ImageNet channel-wise normalization
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            ),
        ]
    )


def get_val_test_transforms(image_size: int = 224) -> transforms.Compose:
    """Get the PyTorch transformation pipeline for validation and testing (no augmentation)."""
    return transforms.Compose(
        [
            # Simple resize to target size
            transforms.Resize((image_size, image_size)),
            # Convert PIL image to tensor, mapping range [0, 255] to [0.0, 1.0]
            transforms.ToTensor(),
            # ImageNet channel-wise normalization
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            ),
        ]
    )
