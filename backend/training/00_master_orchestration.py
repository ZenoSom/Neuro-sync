"""
================================================================================
ADHD DETECTION - MASTER TRAINING ORCHESTRATION
================================================================================
Unified training pipeline that runs all model upgrades with optimization.
Automatically selects best model configuration based on available resources.

Features:
  - Multi-version model training
  - Automatic resource detection
  - Fallback mechanisms
  - Comprehensive reporting
  - One-command execution
================================================================================
"""

import os
import sys
import time
import json
import subprocess
from pathlib import Path
from datetime import datetime

# ================================================================================
# CONFIGURATION
# ================================================================================

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent.parent
TRAINING_SCRIPTS = {
    "dataset": "generate_adhd_risk_dataset.py",
    "lightweight_v3": "07_lightweight_rapid_training.py",
    "advanced_v2": "06_advanced_hybrid_training.py",
    "incremental": "08_incremental_learning.py",
}

REQUIREMENTS = {
    "lightweight_v3": ["numpy", "pandas", "scikit-learn", "joblib"],
    "advanced_v2": ["numpy", "pandas", "scikit-learn", "joblib", "tensorflow", "nltk"],
    "incremental": ["numpy", "pandas", "scikit-learn", "joblib"],
}

# ================================================================================
# UTILITIES
# ================================================================================

def print_banner(text):
    """Print formatted banner."""
    width = 80
    print("\n" + "="*width)
    print(text.center(width))
    print("="*width + "\n")


def print_step(step_num, total, description):
    """Print step indicator."""
    print(f"\n[{step_num}/{total}] {description}")
    print("-" * 60)


def run_script(script_name, python_exe):
    """Run a training script."""
    script_path = BASE_DIR / script_name
    
    if not script_path.exists():
        print(f"❌ Script not found: {script_path}")
        return False
    
    print(f"Executing: {script_name}")
    print(f"Python: {python_exe}\n")
    
    try:
        result = subprocess.run(
            [python_exe, str(script_path)],
            cwd=str(BASE_DIR),
            capture_output=False,
            timeout=3600  # 1 hour timeout
        )
        return result.returncode == 0
    except subprocess.TimeoutExpired:
        print(f"❌ Script timeout: {script_name}")
        return False
    except Exception as e:
        print(f"❌ Error running {script_name}: {e}")
        return False


def check_python_version():
    """Verify Python version compatibility."""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print(f"❌ Python {version.major}.{version.minor} not supported. Min: 3.8")
        return False
    print(f"✓ Python {version.major}.{version.minor} compatible")
    return True


def detect_resources():
    """Detect available computational resources."""
    resources = {
        "cpu_cores": os.cpu_count() or 1,
        "has_cuda": check_cuda_availability(),
        "available_ram_gb": get_available_memory() / (1024**3),
    }
    
    print(f"\n📊 System Resources:")
    print(f"  CPU Cores: {resources['cpu_cores']}")
    print(f"  CUDA Available: {resources['has_cuda']}")
    print(f"  Available RAM: {resources['available_ram_gb']:.1f} GB")
    
    return resources


def check_cuda_availability():
    """Check if CUDA is available."""
    try:
        import tensorflow as tf
        return len(tf.config.list_physical_devices('GPU')) > 0
    except:
        return False


def get_available_memory():
    """Get available system memory."""
    try:
        import psutil
        return psutil.virtual_memory().available
    except:
        return 8 * 1024**3  # Default 8GB


def recommend_pipeline(resources):
    """Recommend optimal training pipeline based on resources."""
    print(f"\n🎯 Training Pipeline Recommendation:")
    
    if resources["available_ram_gb"] < 4:
        print("  ⚠ Low memory: Using lightweight pipeline")
        return ["lightweight_v3"]
    
    if resources["has_cuda"] and resources["available_ram_gb"] >= 8:
        print("  ✓ Recommended: Full advanced pipeline")
        return ["lightweight_v3", "advanced_v2", "incremental"]
    
    print("  → Using lightweight + incremental pipeline")
    return ["lightweight_v3", "incremental"]


# ================================================================================
# MAIN ORCHESTRATION
# ================================================================================

def main():
    print_banner("ADHD DETECTION - MASTER TRAINING ORCHESTRATION")
    
    # Initialize
    python_exe = sys.executable
    start_time = datetime.now()
    
    print(f"Start Time: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Python Executable: {python_exe}\n")
    
    # Checks
    print("=" * 60)
    print("0. Pre-Execution Checks")
    print("=" * 60)
    
    if not check_python_version():
        print("❌ Python version check failed")
        return
    
    resources = detect_resources()
    
    # Recommendations
    recommended_pipeline = recommend_pipeline(resources)
    print(f"\n  Recommended scripts: {recommended_pipeline}")
    
    # Dataset Generation
    print_step(1, len(recommended_pipeline) + 1, "Generating Dataset")
    
    if not run_script(TRAINING_SCRIPTS["dataset"], python_exe):
        print("⚠ Dataset generation had issues, but continuing...")
    
    # Training Steps
    pipeline_steps = ["dataset"] + recommended_pipeline
    
    results = {}
    for idx, script_key in enumerate(pipeline_steps, 1):
        if script_key == "dataset":
            continue
        
        description = {
            "lightweight_v3": "Training Lightweight Ensemble Models (v3.0)",
            "advanced_v2": "Training Advanced DL Models (v2.0)",
            "incremental": "Running Incremental Learning Cycles",
        }.get(script_key, f"Running {script_key}")
        
        print_step(idx, len(pipeline_steps), description)
        
        script_name = TRAINING_SCRIPTS.get(script_key)
        if script_name:
            success = run_script(script_name, python_exe)
            results[script_key] = success
        else:
            results[script_key] = False
    
    # Summary
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds() / 60
    
    print_banner("TRAINING SUMMARY")
    
    print(f"Duration: {duration:.1f} minutes")
    print(f"End Time: {end_time.strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    print("Results:")
    for script, success in results.items():
        status = "✓" if success else "❌"
        print(f"  {status} {script}")
    
    # Verify Models
    model_dir = BASE_DIR.parent / "model"
    print(f"\n📁 Saved Models in {model_dir}:")
    
    models_found = 0
    for model_file in sorted(model_dir.glob("adhd_*_v*.pkl")) + sorted(model_dir.glob("adhd_*_v*.h5")):
        print(f"  ✓ {model_file.name}")
        models_found += 1
    
    if models_found == 0:
        print("  ⚠ No models found. Check training logs.")
    
    # Final status
    all_passed = all(results.values())
    
    if all_passed:
        print("\n🎉 ✓ ALL TRAINING COMPLETE")
    else:
        print("\n⚠ Some training steps failed. Check logs.")
    
    # Instructions
    print("\n📝 Next Steps:")
    print("  1. Review model files in backend/model/")
    print("  2. Update backend/predict.py with new model paths")
    print("  3. Test models in backend/main.py")
    print("  4. Deploy to production via Docker")
    
    print("\n📖 Documentation:")
    print("  - backend/training/TRAINING_GUIDE.md")
    print("  - backend/training/06_advanced_hybrid_training.py")
    print("  - backend/training/07_lightweight_rapid_training.py")
    print("  - backend/training/08_incremental_learning.py")
    
    print("\n" + "="*80 + "\n")


if __name__ == "__main__":
    main()
