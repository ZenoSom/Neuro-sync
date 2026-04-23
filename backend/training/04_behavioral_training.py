# ====================================================================
# ADHD Assessment Model — Train & Export
# Trains a RandomForest on structured behavioral features
# Exports model to backend/model/adhd_model.pkl
# ====================================================================

import os
import json
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import joblib

np.random.seed(42)

FEATURE_NAMES = [
    "age",
    "sleep_hours",
    "screen_time",
    "focus_level",        # 1-10 (10 = excellent focus)
    "hyperactivity",      # 1-10 (10 = very hyperactive)
    "impulsiveness",      # 1-10 (10 = very impulsive)
    "stress_level",       # 1-10 (10 = extreme stress)
    "attention_span",     # 1-10 (10 = great attention)
    "task_completion",    # 1-10 (10 = always completes)
]

N_SAMPLES = 5000

def generate_synthetic_data(n=N_SAMPLES):
    """
    Generate synthetic behavioural data that mimics ADHD patterns.
    ADHD-positive samples have higher hyperactivity/impulsiveness/screen_time
    and lower focus/attention/task_completion/sleep.
    """
    data = []

    for _ in range(n):
        is_adhd = np.random.rand() < 0.45  # ~45% prevalence in dataset

        if is_adhd:
            age            = np.random.randint(18, 55)
            sleep_hours    = np.clip(np.random.normal(5.0, 1.2), 2, 10)
            screen_time    = np.clip(np.random.normal(8.5, 2.0), 1, 16)
            focus_level    = np.clip(np.random.normal(3.5, 1.5), 1, 10)
            hyperactivity  = np.clip(np.random.normal(7.0, 1.5), 1, 10)
            impulsiveness  = np.clip(np.random.normal(7.0, 1.5), 1, 10)
            stress_level   = np.clip(np.random.normal(7.0, 1.5), 1, 10)
            attention_span = np.clip(np.random.normal(3.0, 1.5), 1, 10)
            task_completion= np.clip(np.random.normal(3.5, 1.5), 1, 10)
        else:
            age            = np.random.randint(18, 55)
            sleep_hours    = np.clip(np.random.normal(7.5, 1.0), 2, 10)
            screen_time    = np.clip(np.random.normal(4.5, 2.0), 1, 16)
            focus_level    = np.clip(np.random.normal(7.0, 1.5), 1, 10)
            hyperactivity  = np.clip(np.random.normal(3.5, 1.5), 1, 10)
            impulsiveness  = np.clip(np.random.normal(3.5, 1.5), 1, 10)
            stress_level   = np.clip(np.random.normal(4.0, 1.5), 1, 10)
            attention_span = np.clip(np.random.normal(7.5, 1.5), 1, 10)
            task_completion= np.clip(np.random.normal(7.5, 1.5), 1, 10)

        data.append({
            "age":             age,
            "sleep_hours":     round(sleep_hours, 1),
            "screen_time":     round(screen_time, 1),
            "focus_level":     round(focus_level, 1),
            "hyperactivity":   round(hyperactivity, 1),
            "impulsiveness":   round(impulsiveness, 1),
            "stress_level":    round(stress_level, 1),
            "attention_span":  round(attention_span, 1),
            "task_completion": round(task_completion, 1),
            "label":           1 if is_adhd else 0,
        })

    return pd.DataFrame(data)


def train_and_export():
    print("=" * 60)
    print("ADHD Assessment Model — Training")
    print("=" * 60)

    df = generate_synthetic_data()
    print(f"\n✓ Generated {len(df):,} synthetic samples")
    print(f"  Label distribution:\n{df['label'].value_counts().to_string()}\n")

    X = df[FEATURE_NAMES].values
    y = df["label"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )

    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=15,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"✓ Test Accuracy: {acc:.4f}\n")
    print(classification_report(y_test, y_pred, target_names=["Non-ADHD", "ADHD"]))

    # Export - Adjusted for backend/training/ folder
    model_dir = os.path.join(os.path.dirname(__file__), "..", "model")
    os.makedirs(model_dir, exist_ok=True)
    
    joblib.dump(model, os.path.join(model_dir, "adhd_model.pkl"))

    with open(os.path.join(model_dir, "feature_names.json"), "w") as f:
        json.dump(FEATURE_NAMES, f)

    print(f"✓ Model saved to {os.path.join(model_dir, 'adhd_model.pkl')}")
    print(f"✓ Feature names saved to {os.path.join(model_dir, 'feature_names.json')}")


if __name__ == "__main__":
    train_and_export()
