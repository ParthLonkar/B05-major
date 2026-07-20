"""CLI entry-point for benchmarking the trained CNN model.

Usage (from the cnn-baseline/ directory):
    python -m scripts.benchmark                                          # auto-detect latest run
    python -m scripts.benchmark --run experiments/run_2026-07-17_213534  # explicit run directory
    python -m scripts.benchmark --checkpoint path/to/best_model.pth      # explicit checkpoint
    python -m scripts.benchmark --iterations 200                         # custom iteration count
"""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Ensure the project root (cnn-baseline/) is on sys.path so that
# ``from src.…`` imports resolve correctly regardless of cwd.
# ---------------------------------------------------------------------------
_PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from src.config import get_config  # noqa: E402
from src.models.cnn import ModelFactory, get_model_summary  # noqa: E402
from src.evaluation.benchmark import ModelBenchmark  # noqa: E402


def _setup_logging() -> None:
    """Configure root logger with a readable console format."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s  [%(levelname)s]  %(name)s — %(message)s",
        datefmt="%H:%M:%S",
    )


def _resolve_run_dir(explicit_run: str | None) -> Path:
    """Determine the experiment run directory.

    If *explicit_run* is given, use it directly.  Otherwise, auto-detect the
    most recently created ``run_*`` subdirectory under ``experiments/``.

    Args:
        explicit_run: Optional path string provided via ``--run``.

    Returns:
        Resolved ``Path`` to the experiment run directory.

    Raises:
        FileNotFoundError: If no run directory can be resolved.
    """
    if explicit_run is not None:
        run_dir = Path(explicit_run)
        if not run_dir.is_absolute():
            run_dir = _PROJECT_ROOT / run_dir
        if run_dir.is_dir():
            return run_dir.resolve()
        raise FileNotFoundError(f"Specified run directory not found: {run_dir}")

    experiments_dir = _PROJECT_ROOT / "experiments"
    if not experiments_dir.is_dir():
        raise FileNotFoundError(
            f"Experiments directory not found: {experiments_dir}"
        )

    run_dirs = sorted(
        [d for d in experiments_dir.iterdir() if d.is_dir() and d.name.startswith("run_")],
        key=lambda d: d.name,
        reverse=True,
    )
    if not run_dirs:
        raise FileNotFoundError(
            "No run_* directories found under experiments/. "
            "Have you trained a model yet?"
        )

    return run_dirs[0].resolve()


def _resolve_checkpoint(run_dir: Path, explicit_checkpoint: str | None) -> Path:
    """Determine the checkpoint file to load.

    Priority:
        1. ``--checkpoint`` CLI argument (if provided).
        2. ``best_model.pth`` inside *run_dir/models/*.

    Args:
        run_dir: The resolved experiment run directory.
        explicit_checkpoint: Optional checkpoint path from CLI.

    Returns:
        Absolute path to the ``.pth`` file.

    Raises:
        FileNotFoundError: If no usable checkpoint is found.
    """
    if explicit_checkpoint is not None:
        ckpt = Path(explicit_checkpoint)
        if not ckpt.is_absolute():
            ckpt = _PROJECT_ROOT / ckpt
        if ckpt.is_file():
            return ckpt.resolve()
        raise FileNotFoundError(f"Specified checkpoint not found: {ckpt}")

    best = run_dir / "models" / "best_model.pth"
    if best.is_file():
        return best.resolve()

    raise FileNotFoundError(
        f"best_model.pth not found in {run_dir / 'models'}. "
        "Provide an explicit --checkpoint path."
    )


def main() -> None:
    """Parse CLI args, build components, and run the benchmark."""
    parser = argparse.ArgumentParser(
        description="Benchmark the trained CNN model's performance characteristics."
    )
    parser.add_argument(
        "--config",
        type=str,
        default=None,
        help="Path to config.yaml (default: configs/config.yaml).",
    )
    parser.add_argument(
        "--run",
        type=str,
        default=None,
        help=(
            "Path to a specific experiment run directory "
            "(default: latest run_* under experiments/)."
        ),
    )
    parser.add_argument(
        "--checkpoint",
        type=str,
        default=None,
        help="Path to a .pth checkpoint (default: <run>/models/best_model.pth).",
    )
    parser.add_argument(
        "--warmup",
        type=int,
        default=10,
        help="Number of warmup iterations before timing (default: 10).",
    )
    parser.add_argument(
        "--iterations",
        type=int,
        default=100,
        help="Number of timed forward-pass iterations (default: 100).",
    )
    args = parser.parse_args()

    _setup_logging()
    logger = logging.getLogger(__name__)

    logger.info("=" * 60)
    logger.info("CNN POTHOLE CLASSIFIER — PERFORMANCE BENCHMARK")
    logger.info("=" * 60)

    # ---- Resolve run directory and checkpoint ----
    run_dir = _resolve_run_dir(args.run)
    checkpoint_path = _resolve_checkpoint(run_dir, args.checkpoint)
    logger.info("Experiment run : %s", run_dir)
    logger.info("Checkpoint     : %s", checkpoint_path)

    # ---- Configuration ----
    config_path = args.config or str(run_dir / "config.yaml")
    cfg = get_config(config_path)

    # ---- Device selection ----
    import torch

    cfg_device: str = cfg.project.get("device", "cpu")
    if cfg_device == "cuda" and not torch.cuda.is_available():
        logger.warning(
            "Config requests CUDA but no GPU detected — falling back to CPU."
        )
        cfg_device = "cpu"
    device = torch.device(cfg_device)
    logger.info("Benchmark device: %s", device)

    # ---- Build model ----
    model = ModelFactory.create_model(cfg.raw)
    summary = get_model_summary(model)
    logger.info(
        "Model: %s  |  total_params=%s  |  ~%.1f MB",
        summary["architecture"],
        f'{summary["total_params"]:,}',
        summary["estimated_size_mb"],
    )

    # ---- Load checkpoint weights ----
    ckpt = torch.load(checkpoint_path, map_location=device, weights_only=False)
    model.load_state_dict(ckpt["model_state_dict"])
    logger.info(
        "Loaded checkpoint  |  epoch=%d  |  val_loss=%.4f",
        ckpt.get("epoch", 0),
        ckpt.get("val_loss", float("nan")),
    )

    # ---- Run benchmark ----
    image_size: int = cfg.preprocessing.get("image_size", 224)

    benchmark = ModelBenchmark(
        model=model,
        device=device,
        image_size=image_size,
    )

    results = benchmark.run(
        checkpoint_path=checkpoint_path,
        num_warmup=args.warmup,
        num_iterations=args.iterations,
    )

    # ---- Save results ----
    benchmark_output_dir = run_dir / "benchmark"
    saved = benchmark.save_results(benchmark_output_dir)

    # ---- Final summary ----
    logger.info("=" * 60)
    logger.info("BENCHMARK COMPLETE")
    logger.info("  Total Params  : %s", f'{results["total_params"]:,}')
    logger.info("  Trainable     : %s", f'{results["trainable_params"]:,}')
    logger.info("  Frozen        : %s", f'{results["frozen_params"]:,}')
    logger.info("  Model Size    : %.2f MB", results["model_size_mb"])
    logger.info("  Avg Latency   : %.2f ms/image", results["avg_latency_ms"])
    logger.info("  Throughput    : %.1f images/sec", results["throughput_fps"])
    logger.info("  Device        : %s", results["device"])
    logger.info("  JSON saved    : %s", saved["json"])
    logger.info("  Report saved  : %s", saved["txt"])
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
