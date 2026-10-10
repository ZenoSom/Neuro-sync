"""
================================================================================
ADHD DETECTION - INCREMENTAL LEARNING & MODEL IMPROVEMENT
================================================================================
Continuous model enhancement through:
  - Active learning (uncertain predictions flagged for review)
  - Periodic retraining on expanded dataset
  - Hyperparameter optimization
  - Model versioning and rollback
================================================================================
"""

import os
import json
import pickle
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, VotingClassifier
from sklearn.metrics import accuracy_score, f1_score, classification_report
import joblib

# ================================================================================
# CONFIGURATION
# ================================================================================

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR.parent / "model"
LOGS_DIR = MODEL_DIR / "training_logs"
LOGS_DIR.mkdir(exist_ok=True, parents=True)

LABEL_MAPPING = {
    "Low Risk": 0,
    "Moderate Risk": 1,
    "High Risk ADHD": 2,
}
LABEL_NAMES = list(LABEL_MAPPING.keys())
FEATURE_NAMES = ["focus", "hyperactivity", "completion"]

# ================================================================================
# MODEL VERSIONING
# ================================================================================

def log_training_event(event_type, metrics, notes=""):
    """Log training events for audit trail."""
    timestamp = datetime.now().isoformat()
    log_entry = {
        "timestamp": timestamp,
        "event_type": event_type,
        "metrics": metrics,
        "notes": notes,
    }
    
    log_path = LOGS_DIR / f"training_log_{datetime.now().strftime('%Y%m%d')}.jsonl"
    with open(log_path, "a") as f:
        f.write(json.dumps(log_entry) + "\n")
    
    return log_entry


def get_model_version():
    """Get the latest model version."""
    metadata_files = list(MODEL_DIR.glob("adhd_metadata_v*.json"))
    if not metadata_files:
        return 0
    
    versions = [int(f.stem.split('_v')[-1]) for f in metadata_files]
    return max(versions)


# ================================================================================
# ACTIVE LEARNING
# ================================================================================

def identify_uncertain_predictions(model, X_test, y_test, threshold=0.6):
    """Identify predictions where the model is uncertain."""
    y_proba = model.predict_proba(X_test)
    max_confidence = np.max(y_proba, axis=1)
    
    uncertain_mask = max_confidence < threshold
    uncertain_indices = np.where(uncertain_mask)[0]
    
    return uncertain_indices, max_confidence[uncertain_mask]


def create_uncertainty_report(X_test, y_test, uncertain_indices, confidence_scores):
    """Create a report of uncertain predictions for manual review."""
    report = {
        "total_samples": len(X_test),
        "uncertain_count": len(uncertain_indices),
        "uncertainty_rate": len(uncertain_indices) / len(X_test),
        "min_confidence": float(np.min(confidence_scores)) if len(confidence_scores) > 0 else 1.0,
        "mean_confidence": float(np.mean(confidence_scores)) if len(confidence_scores) > 0 else 1.0,
        "samples_for_review": [
            {
                "index": int(idx),
                "true_label": LABEL_NAMES[y_test[idx]],
                "confidence": float(confidence_scores[i])
            }
            for i, idx in enumerate(uncertain_indices[:10])  # Top 10 uncertain
        ]
    }
    
    return report


# ================================================================================
# HYPERPARAMETER OPTIMIZATION
# ================================================================================

def optimize_behavioral_model(X_train, y_train, X_val, y_val):
    """Quick hyperparameter search for behavioral model."""
    print("\n  Optimizing Behavioral Model Hyperparameters...")
    
    best_score = 0
    best_params = None
    
    # Grid search over key parameters
    param_grids = [
        {"n_estimators": 100, "max_depth": 15},
        {"n_estimators": 150, "max_depth": 18},
        {"n_estimators": 200, "max_depth": 20},
        {"n_estimators": 250, "max_depth": 20},
    ]
    
    for params in param_grids:
        model = RandomForestClassifier(
            **params,
            random_state=42,
            n_jobs=-1,
            class_weight="balanced"
        )
        model.fit(X_train, y_train)
        
        y_pred = model.predict(X_val)
        score = f1_score(y_val, y_pred, average='weighted')
        
        print(f"    Params: {params} → F1: {score:.4f}")
        
        if score > best_score:
            best_score = score
            best_params = params
    
    print(f"  ✓ Best params: {best_params} (F1: {best_score:.4f})\n")
    return best_params, best_score


# ================================================================================
# INCREMENTAL RETRAINING
# ================================================================================

def retrain_on_new_data(train_data_path, retrain_count=1):
    """Retrain models on expanded dataset."""
    print("="*80)
    print(f"INCREMENTAL RETRAINING #{retrain_count}")
    print("="*80 + "\n")
    
    # Load current best model
    current_version = get_model_version()
    print(f"Current model version: v{current_version}\n")
    
    # Load training data
    df = pd.read_csv(train_data_path)
    print(f"Training data: {len(df)} samples\n")
    
    # Prepare data
    X_behavioral = df[FEATURE_NAMES].values
    y = np.array([LABEL_MAPPING[label] for label in df["label"]])
    
    # Split
    X_train, X_val, y_train, y_val = train_test_split(
        X_behavioral, y, test_size=0.2, stratify=y, random_state=42
    )
    
    # Optimize hyperparameters
    best_params, best_score = optimize_behavioral_model(X_train, y_train, X_val, y_val)
    
    # Train new model
    print("Training new model with optimized hyperparameters...")
    new_model = RandomForestClassifier(
        **best_params,
        random_state=42,
        n_jobs=-1,
        class_weight="balanced"
    )
    new_model.fit(X_train, y_train)
    
    # Validate
    y_pred = new_model.predict(X_val)
    new_score = f1_score(y_val, y_pred, average='weighted')
    
    print(f"✓ New model F1-Score: {new_score:.4f}\n")
    
    # Compare with current
    try:
        old_model = joblib.load(MODEL_DIR / f"adhd_behavioral_ensemble_v{current_version}.pkl")
        old_score = f1_score(y_val, old_model.predict(X_val), average='weighted')
        improvement = (new_score - old_score) / old_score * 100 if old_score > 0 else 0
        
        print(f"Comparison:")
        print(f"  Old Model (v{current_version}): F1 = {old_score:.4f}")
        print(f"  New Model (v{current_version+1}): F1 = {new_score:.4f}")
        print(f"  Improvement: {improvement:+.2f}%\n")
    except:
        improvement = 0
    
    # Log event
    event = log_training_event(
        "incremental_retrain",
        {
            "f1_score": float(new_score),
            "improvement_pct": float(improvement),
            "samples_trained": len(df),
            "hyperparameters": best_params,
        },
        f"Retraining #{retrain_count}"
    )
    
    # Optionally save new version if improved
    if new_score > best_score:
        new_version = current_version + 1
        joblib.dump(new_model, MODEL_DIR / f"adhd_behavioral_ensemble_v{new_version}.pkl")
        
        metadata = {
            "version": new_version,
            "f1_score": float(new_score),
            "improvement_pct": float(improvement),
            "retraining_number": retrain_count,
            "hyperparameters": best_params,
        }
        
        with open(MODEL_DIR / f"adhd_metadata_v{new_version}.json", "w") as f:
            json.dump(metadata, f, indent=2)
        
        print(f"✓ New model saved as v{new_version}\n")
        return True, new_version
    else:
        print(f"⚠ Model did not improve. Keeping v{current_version}\n")
        return False, current_version


# ================================================================================
# CONTINUOUS IMPROVEMENT PIPELINE
# ================================================================================

def continuous_improvement_cycle(train_data_path, cycles=3):
    """Run multiple improvement cycles."""
    print("\n" + "="*80)
    print("CONTINUOUS IMPROVEMENT CYCLES")
    print("="*80 + "\n")
    
    improvement_history = []
    
    for cycle in range(1, cycles + 1):
        print(f"\n{'='*80}")
        print(f"CYCLE {cycle}/{cycles}")
        print(f"{'='*80}\n")
        
        improved, version = retrain_on_new_data(train_data_path, retrain_count=cycle)
        
        improvement_history.append({
            "cycle": cycle,
            "improved": improved,
            "version": version,
        })
        
        if not improved and cycle > 1:
            print(f"Model converged at v{version}. Stopping improvement cycles.\n")
            break
    
    # Summary
    print("\n" + "="*80)
    print("IMPROVEMENT SUMMARY")
    print("="*80)
    print(json.dumps(improvement_history, indent=2))
    print("\n" + "="*80 + "\n")


# ================================================================================
# MAIN
# ================================================================================

def main():
    train_data = BASE_DIR / "adhd_risk_dataset_full.csv"
    
    if not train_data.exists():
        print(f"❌ Training data not found: {train_data}")
        return
    
    # Run continuous improvement
    continuous_improvement_cycle(train_data, cycles=2)
    
    print("✓ Incremental learning pipeline complete!\n")


if __name__ == "__main__":
    main()
