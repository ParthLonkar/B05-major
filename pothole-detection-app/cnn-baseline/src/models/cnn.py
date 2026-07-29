"""CNN model architectures and factory definitions for pothole classification."""

import logging
import torch
import torch.nn as nn
import torchvision.models as models

logger = logging.getLogger(__name__)


class PotholeClassifier(nn.Module):
    """PyTorch image classification model wrapping pretrained backbones."""

    def __init__(
        self,
        architecture: str = "MobileNetV2",
        pretrained: bool = True,
        freeze_backbone: bool = True,
        dropout_rate: float = 0.5,
        num_classes: int = 2
    ):
        """
        Args:
            architecture: Backbone model name ("MobileNetV2", "EfficientNetB0", "ResNet18").
            pretrained: If True, load pre-trained ImageNet weights.
            freeze_backbone: If True, freeze the feature extractor parameters.
            dropout_rate: Dropout probability for the classification head.
            num_classes: Number of output units (logits).
        """
        super().__init__()
        self.architecture_name = architecture
        self.num_classes = num_classes
        self.dropout_rate = dropout_rate

        # Initialize the selected backbone feature extractor
        self.backbone = self._get_backbone(architecture, pretrained)
        
        # Replace classification head
        self._replace_classifier_head()
        
        # Apply initial freezing state
        self.set_freeze_backbone(freeze_backbone)

    def _get_backbone(self, architecture: str, pretrained: bool) -> nn.Module:
        """Resolve and instantiate the torchvision model backbone."""
        arch_lower = architecture.lower()
        
        # Determine weights configuration
        weights = "DEFAULT" if pretrained else None

        if arch_lower == "mobilenetv2" or arch_lower == "mobilenet_v2":
            model = models.mobilenet_v2(weights=weights)
            logger.info(f"Loaded MobileNetV2 backbone (pretrained={pretrained})")
            return model
        elif arch_lower == "efficientnetb0" or arch_lower == "efficientnet_b0":
            model = models.efficientnet_b0(weights=weights)
            logger.info(f"Loaded EfficientNetB0 backbone (pretrained={pretrained})")
            return model
        elif arch_lower == "resnet18":
            model = models.resnet18(weights=weights)
            logger.info(f"Loaded ResNet18 backbone (pretrained={pretrained})")
            return model
        else:
            supported = ["MobileNetV2", "EfficientNetB0", "ResNet18"]
            raise ValueError(f"Unsupported backbone architecture: '{architecture}'. "
                             f"Supported architectures: {supported}")

    def _replace_classifier_head(self) -> None:
        """Replace the backbone's default classification layer with our own classification head."""
        arch_lower = self.architecture_name.lower()

        if arch_lower in {"mobilenetv2", "mobilenet_v2"}:
            # MobileNetV2 classifier is self.backbone.classifier (Sequential)
            in_features = self.backbone.classifier[1].in_features
            self.backbone.classifier = nn.Sequential(
                nn.Dropout(p=self.dropout_rate),
                nn.Linear(in_features, self.num_classes)
            )
        elif arch_lower in {"efficientnetb0", "efficientnet_b0"}:
            # EfficientNetB0 classifier is self.backbone.classifier (Sequential)
            in_features = self.backbone.classifier[1].in_features
            self.backbone.classifier = nn.Sequential(
                nn.Dropout(p=self.dropout_rate),
                nn.Linear(in_features, self.num_classes)
            )
        elif arch_lower == "resnet18":
            # ResNet18 fc layer is self.backbone.fc (Linear)
            in_features = self.backbone.fc.in_features
            self.backbone.fc = nn.Sequential(
                nn.Dropout(p=self.dropout_rate),
                nn.Linear(in_features, self.num_classes)
            )

        logger.info(f"Replaced classifier head for {self.architecture_name}. Output classes: {self.num_classes}")

    def set_freeze_backbone(self, freeze: bool) -> None:
        """Freeze or unfreeze the backbone parameters.

        Args:
            freeze: If True, backbone parameters are frozen (requires_grad=False).
                    If False, backbone parameters are unfrozen (requires_grad=True).
        """
        arch_lower = self.architecture_name.lower()

        # Iterate over all backbone parameters
        for name, param in self.backbone.named_parameters():
            # Exclude our custom classification head from freezing
            if arch_lower in {"mobilenetv2", "mobilenet_v2"} and "classifier" in name:
                param.requires_grad = True
            elif arch_lower in {"efficientnetb0", "efficientnet_b0"} and "classifier" in name:
                param.requires_grad = True
            elif arch_lower == "resnet18" and "fc" in name:
                param.requires_grad = True
            else:
                param.requires_grad = not freeze

        state_str = "FROZEN" if freeze else "UNFROZEN"
        logger.info(f"Backbone parameters set to: {state_str}")

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Forward pass. Returns raw logits."""
        return self.backbone(x)


class ModelFactory:
    """Model factory to construct PotholeClassifier models from configuration."""

    @staticmethod
    def create_model(config_dict: dict) -> PotholeClassifier:
        """Construct a PotholeClassifier using settings from config.yaml.

        Args:
            config_dict: Dictionary containing the 'model' config settings.

        Returns:
            An instantiated PotholeClassifier model.
        """
        model_config = config_dict["model"]
        
        architecture = model_config.get("architecture", "MobileNetV2")
        pretrained = model_config.get("pretrained", True)
        freeze_backbone = model_config.get("freeze_backbone", True)
        dropout_rate = model_config.get("dropout_rate", 0.5)
        num_classes = model_config.get("num_classes", 2)

        model = PotholeClassifier(
            architecture=architecture,
            pretrained=pretrained,
            freeze_backbone=freeze_backbone,
            dropout_rate=dropout_rate,
            num_classes=num_classes
        )

        return model


def get_model_summary(model: PotholeClassifier) -> dict:
    """Compute parameter counts and size of a PotholeClassifier.

    Args:
        model: Model instance to inspect.

    Returns:
        Dict containing parameter counts and model size details.
    """
    total_params = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    frozen_params = total_params - trainable_params
    
    # Footprint size estimation (assuming float32: 4 bytes per param)
    estimated_size_mb = (total_params * 4) / (1024 * 1024)

    summary_info = {
        "architecture": model.architecture_name,
        "total_params": total_params,
        "trainable_params": trainable_params,
        "frozen_params": frozen_params,
        "estimated_size_mb": estimated_size_mb
    }

    return summary_info
