"""Configuration loader for the CNN baseline project."""

import os
from pathlib import Path
import yaml


class ConfigLoader:
    """Loads and exposes configuration settings from config.yaml."""

    def __init__(self, config_path: str | Path = None):
        if config_path is None:
            # Resolve default path relative to this file: src/config.py -> ../configs/config.yaml
            config_path = Path(__file__).resolve().parents[1] / "configs" / "config.yaml"
        else:
            config_path = Path(config_path)

        if not config_path.exists():
            raise FileNotFoundError(f"Configuration file not found at: {config_path}")

        with open(config_path, "r", encoding="utf-8") as f:
            self._config = yaml.safe_load(f)

        self._validate_config()

    def _validate_config(self):
        """Validate structure of the config."""
        required_keys = ["project", "dataset", "preprocessing", "augmentation", "model", "training", "outputs"]
        for key in required_keys:
            if key not in self._config:
                raise KeyError(f"Missing required top-level configuration key: {key}")

    @property
    def raw(self) -> dict:
        """Returns the raw dictionary configuration."""
        return self._config

    @property
    def project(self) -> dict:
        return self._config["project"]

    @property
    def dataset(self) -> dict:
        return self._config["dataset"]

    @property
    def preprocessing(self) -> dict:
        return self._config["preprocessing"]

    @property
    def augmentation(self) -> dict:
        return self._config["augmentation"]

    @property
    def model(self) -> dict:
        return self._config["model"]

    @property
    def training(self) -> dict:
        return self._config["training"]

    @property
    def outputs(self) -> dict:
        return self._config["outputs"]


def get_config(config_path: str | Path = None) -> ConfigLoader:
    """Helper function to load and return a ConfigLoader instance."""
    return ConfigLoader(config_path)
