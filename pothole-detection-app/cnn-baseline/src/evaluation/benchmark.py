"""Performance benchmarking utilities for the CNN pothole classifier.

Measures computational characteristics of a trained model:
  - Parameter counts (total, trainable, frozen)
  - Model size on disk (MB)
  - Average CPU inference latency (ms/image)
  - Throughput (images/second)

This module is **independent** of both the training and evaluation pipelines.
It operates on a loaded ``nn.Module`` and a dummy input tensor — no DataLoader
or checkpoint logic is embedded here.
"""

from __future__ import annotations

import json
import logging
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict

import torch
import torch.nn as nn

logger = logging.getLogger(__name__)


class ModelBenchmark:
    """Benchmarks a PyTorch model's computational footprint and inference speed.

    Attributes:
        model: The model under test.
        device: Device used for benchmarking.
        image_size: Spatial resolution of the input tensor.
        results: Benchmark results (populated after ``run``).
    """

    def __init__(
        self,
        model: nn.Module,
        device: torch.device | str = "cpu",
        image_size: int = 224,
    ) -> None:
        """Initialise the benchmark.

        Args:
            model: An instantiated PyTorch model (weights already loaded).
            device: Torch device string or object.
            image_size: Height/width of the square input image.
        """
        self.device: torch.device = torch.device(device)
        self.model: nn.Module = model.to(self.device)
        self.image_size: int = image_size
        self.results: Dict[str, Any] = {}

        logger.info(
            "ModelBenchmark initialised  |  device=%s  |  image_size=%d",
            self.device,
            self.image_size,
        )

    # ------------------------------------------------------------------
    # Parameter analysis
    # ------------------------------------------------------------------
    def _count_parameters(self) -> Dict[str, int]:
        """Count total, trainable, and frozen parameters.

        Returns:
            Dictionary with ``total_params``, ``trainable_params``, and
            ``frozen_params`` counts.
        """
        total = sum(p.numel() for p in self.model.parameters())
        trainable = sum(p.numel() for p in self.model.parameters() if p.requires_grad)
        frozen = total - trainable

        logger.info(
            "Parameters  |  total=%s  |  trainable=%s  |  frozen=%s",
            f"{total:,}",
            f"{trainable:,}",
            f"{frozen:,}",
        )
        return {
            "total_params": total,
            "trainable_params": trainable,
            "frozen_params": frozen,
        }

    # ------------------------------------------------------------------
    # Model size on disk
    # ------------------------------------------------------------------
    def _measure_model_size(self, checkpoint_path: Path | None) -> float:
        """Measure the model checkpoint size on disk.

        If a checkpoint path is provided and exists, its actual file size is
        used.  Otherwise, an estimate based on parameter count is returned
        (float32 = 4 bytes per parameter).

        Args:
            checkpoint_path: Optional path to the ``.pth`` file.

        Returns:
            Size in megabytes (MB).
        """
        if checkpoint_path is not None and checkpoint_path.is_file():
            size_bytes = checkpoint_path.stat().st_size
            size_mb = size_bytes / (1024 * 1024)
            logger.info(
                "Model size (on disk): %.2f MB  (%s)",
                size_mb,
                checkpoint_path.name,
            )
            return round(size_mb, 4)

        # Fallback: estimate from parameter count
        total = sum(p.numel() for p in self.model.parameters())
        size_mb = (total * 4) / (1024 * 1024)
        logger.info("Model size (estimated): %.2f MB", size_mb)
        return round(size_mb, 4)

    # ------------------------------------------------------------------
    # Inference latency measurement
    # ------------------------------------------------------------------
    def _measure_latency(
        self,
        num_warmup: int = 10,
        num_iterations: int = 100,
    ) -> Dict[str, float]:
        """Measure average per-image inference latency and throughput.

        The model is placed in ``eval()`` mode and all computation happens
        inside ``torch.no_grad()``.  A warmup phase ensures JIT compilation
        and cache effects are excluded from timing.

        Args:
            num_warmup: Number of warmup iterations (not timed).
            num_iterations: Number of timed iterations.

        Returns:
            Dictionary with ``avg_latency_ms`` and ``throughput_fps``.
        """
        self.model.eval()
        dummy_input = torch.randn(
            1, 3, self.image_size, self.image_size, device=self.device
        )

        # Warmup
        logger.info("Running %d warmup iterations…", num_warmup)
        with torch.no_grad():
            for _ in range(num_warmup):
                self.model(dummy_input)

        # Timed iterations
        logger.info("Running %d timed iterations…", num_iterations)
        timings: list[float] = []

        with torch.no_grad():
            for _ in range(num_iterations):
                start = time.perf_counter()
                self.model(dummy_input)
                elapsed = time.perf_counter() - start
                timings.append(elapsed)

        avg_seconds = sum(timings) / len(timings)
        avg_ms = avg_seconds * 1000.0
        throughput = 1.0 / avg_seconds if avg_seconds > 0 else 0.0

        logger.info(
            "Latency  |  avg=%.2f ms/image  |  throughput=%.1f images/sec",
            avg_ms,
            throughput,
        )
        return {
            "avg_latency_ms": round(avg_ms, 4),
            "throughput_fps": round(throughput, 2),
        }

    # ------------------------------------------------------------------
    # Full benchmark
    # ------------------------------------------------------------------
    def run(
        self,
        checkpoint_path: Path | str | None = None,
        num_warmup: int = 10,
        num_iterations: int = 100,
    ) -> Dict[str, Any]:
        """Execute the complete performance benchmark.

        Args:
            checkpoint_path: Optional path to the saved ``.pth`` file for
                accurate disk-size measurement.
            num_warmup: Warmup iterations for latency measurement.
            num_iterations: Timed iterations for latency measurement.

        Returns:
            Dictionary containing all benchmark results.
        """
        logger.info("=" * 60)
        logger.info("PERFORMANCE BENCHMARK")
        logger.info("=" * 60)

        ckpt_path = Path(checkpoint_path) if checkpoint_path is not None else None

        params = self._count_parameters()
        model_size_mb = self._measure_model_size(ckpt_path)
        latency = self._measure_latency(
            num_warmup=num_warmup,
            num_iterations=num_iterations,
        )

        self.results = {
            "total_params": params["total_params"],
            "trainable_params": params["trainable_params"],
            "frozen_params": params["frozen_params"],
            "model_size_mb": model_size_mb,
            "avg_latency_ms": latency["avg_latency_ms"],
            "throughput_fps": latency["throughput_fps"],
            "device": str(self.device),
            "image_size": self.image_size,
            "num_warmup": num_warmup,
            "num_iterations": num_iterations,
            "checkpoint": ckpt_path.name if ckpt_path else "N/A",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        logger.info("=" * 60)
        logger.info("Benchmark complete.")
        return self.results

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------
    def save_results(self, output_dir: str | Path) -> Dict[str, Path]:
        """Persist benchmark results to JSON and human-readable text files.

        Produces:
            - ``benchmark_summary.json`` — machine-readable results.
            - ``benchmark_report.txt`` — formatted human-readable report.

        Args:
            output_dir: Directory where files are written.

        Returns:
            Dictionary mapping ``"json"`` and ``"txt"`` to their saved paths.

        Raises:
            RuntimeError: If ``run()`` has not been called yet.
        """
        if not self.results:
            raise RuntimeError(
                "No benchmark results available. Call run() before save_results()."
            )

        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        # 1. JSON
        json_path = output_dir / "benchmark_summary.json"
        with open(json_path, "w", encoding="utf-8") as fh:
            json.dump(self.results, fh, indent=2)
        logger.info("Saved benchmark JSON to: %s", json_path)

        # 2. Human-readable text report
        txt_path = output_dir / "benchmark_report.txt"
        with open(txt_path, "w", encoding="utf-8") as fh:
            fh.write("=" * 60 + "\n")
            fh.write("  Performance Benchmark Report\n")
            fh.write("=" * 60 + "\n\n")
            fh.write(f"  Checkpoint        : {self.results['checkpoint']}\n")
            fh.write(f"  Device            : {self.results['device']}\n")
            fh.write(f"  Image Size        : {self.results['image_size']}x{self.results['image_size']}\n")
            fh.write(f"  Warmup Iterations : {self.results['num_warmup']}\n")
            fh.write(f"  Timed Iterations  : {self.results['num_iterations']}\n\n")
            fh.write("-" * 60 + "\n")
            fh.write("  MODEL PARAMETERS\n")
            fh.write("-" * 60 + "\n")
            fh.write(f"  Total Parameters  : {self.results['total_params']:,}\n")
            fh.write(f"  Trainable Params  : {self.results['trainable_params']:,}\n")
            fh.write(f"  Frozen Params     : {self.results['frozen_params']:,}\n")
            fh.write(f"  Model Size (disk) : {self.results['model_size_mb']:.2f} MB\n\n")
            fh.write("-" * 60 + "\n")
            fh.write("  INFERENCE PERFORMANCE\n")
            fh.write("-" * 60 + "\n")
            fh.write(f"  Avg Latency       : {self.results['avg_latency_ms']:.2f} ms/image\n")
            fh.write(f"  Throughput        : {self.results['throughput_fps']:.1f} images/sec\n\n")
            fh.write("-" * 60 + "\n")
            fh.write(f"  Timestamp         : {self.results['timestamp']}\n")
            fh.write("=" * 60 + "\n")
        logger.info("Saved benchmark report to: %s", txt_path)

        return {"json": json_path, "txt": txt_path}
