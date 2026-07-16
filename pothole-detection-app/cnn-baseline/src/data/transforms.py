"""Preprocessing and data augmentation transformations for PyTorch models."""

from torchvision import transforms


class TransformsFactory:
    """Factory to create train and validation/test torchvision transform pipelines."""

    def __init__(self, image_size: int = 224):
        self.image_size = image_size
        # Standard ImageNet channel-wise normalization stats
        self.normalize = transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225]
        )

    def get_train_transforms(self) -> transforms.Compose:
        """Create training transformations including augmentations."""
        return transforms.Compose(
            [
                # Random Resized Crop (scale from 80% to 100% of original, slight aspect ratio jitter)
                transforms.RandomResizedCrop(
                    size=(self.image_size, self.image_size),
                    scale=(0.80, 1.0),
                    ratio=(0.9, 1.1)
                ),
                # Random horizontal flips with 50% probability
                transforms.RandomHorizontalFlip(p=0.5),
                # Slight random rotations (±15 degrees)
                transforms.RandomRotation(degrees=15),
                # Affine transformations: random translation (up to 10% shift in width/height)
                transforms.RandomAffine(
                    degrees=0,
                    translate=(0.1, 0.1),
                    scale=None
                ),
                # Color modifications: brightness, contrast, saturation, and hue alterations
                transforms.ColorJitter(
                    brightness=0.2,
                    contrast=0.2,
                    saturation=0.2,
                    hue=0.05
                ),
                # Convert PIL image to tensor [0.0, 1.0]
                transforms.ToTensor(),
                # Channel-wise z-score normalization
                self.normalize,
            ]
        )

    def get_val_test_transforms(self) -> transforms.Compose:
        """Create validation and testing transformations (no augmentation)."""
        return transforms.Compose(
            [
                # Scale to target size
                transforms.Resize((self.image_size, self.image_size)),
                # Convert PIL image to tensor [0.0, 1.0]
                transforms.ToTensor(),
                # Channel-wise z-score normalization
                self.normalize,
            ]
        )
