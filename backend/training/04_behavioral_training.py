# ====================================================================
# ADHD Assessment Model — Train & Export
# Trains a RandomForest on structured behavioral features (ASRS)
# Exports model to backend/model/adhd_behavioral_ensemble_v3.pkl
# ====================================================================

import os
import json
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, VotingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import joblib

np.random.seed(42)

FEATURE_NAMES = [
    "age", "sleep_hours", "screen_time",
    "q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9",
    "q10", "q11", "q12", "q13", "q14", "q15", "q16", "q17", "q18"
]

N_SAMPLES = 5000

def generate_synthetic_data(n=N_SAMPLES):
    """
    Generate synthetic behavioural data that mimics ADHD patterns using ASRS (q1-q18).
    ADHD-positive samples have higher scores (2-4) on q1-q18.
    """
    data = []

    for _ in range(n):
        is_adhd = np.random.rand() < 0.45  # ~45% prevalence in dataset

        if is_adhd:
            age = np.random.randint(18, 55)
            sleep_hours = np.clip(np.random.normal(5.5, 1.5), 2, 10)
            screen_time = np.clip(np.random.normal(8.0, 2.5), 1, 16)
            
            # ADHD people tend to score 2 (Sometimes), 3 (Often), 4 (Very Often)
            q_vals = np.clip(np.random.normal(2.8, 1.0, 18), 0, 4).astype(int)
        else:
            age = np.random.randint(18, 55)
            sleep_hours = np.clip(np.random.normal(7.5, 1.0), 4, 10)
            screen_time = np.clip(np.random.normal(4.5, 2.0), 1, 12)
            
            # Non-ADHD people tend to score 0 (Never), 1 (Rarely), 2 (Sometimes)
            q_vals = np.clip(np.random.normal(0.8, 0.8, 18), 0, 4).astype(int)

        row = {
            "age": age,
            "sleep_hours": round(sleep_hours, 1),
            "screen_time": round(screen_time, 1),
            "label": 1 if is_adhd else 0,
        }
        for i in range(18):
            row[f"q{i+1}"] = q_vals[i]

        data.append(row)

    return pd.DataFrame(data)

def train_and_export():
    print("=" * 60)
    print("ADHD Behavioral Ensemble Model (v3) — Training")
    print("=" * 60)

    df = generate_synthetic_data()
    print(f"\n✓ Generated {len(df):,} synthetic samples")
    print(f"  Label distribution:\n{df['label'].value_counts().to_string()}\n")

    X = df[FEATURE_NAMES].values
    y = df["label"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )

    rf = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
    gb = GradientBoostingClassifier(n_estimators=100, max_depth=5, random_state=42)
    lr = LogisticRegression(max_iter=1000, random_state=42)
    
    model = VotingClassifier(
        estimators=[('rf', rf), ('gb', gb), ('lr', lr)],
        voting='soft'
    )
    
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"✓ Test Accuracy: {acc:.4f}\n")
    print(classification_report(y_test, y_pred, target_names=["Non-ADHD", "ADHD"]))

    # Export - Adjusted for backend/training/ folder
    model_dir = os.path.join(os.path.dirname(__file__), "..", "model")
    os.makedirs(model_dir, exist_ok=True)
    
    model_path = os.path.join(model_dir, "adhd_behavioral_ensemble_v3.pkl")
    joblib.dump(model, model_path)

    with open(os.path.join(model_dir, "feature_names.json"), "w") as f:
        json.dump(FEATURE_NAMES, f)

    print(f"✓ Model saved to {model_path}")
    print(f"✓ Feature names saved to {os.path.join(model_dir, 'feature_names.json')}")

if __name__ == "__main__":
    train_and_export()
