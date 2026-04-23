"""
================================================================================
ADHD RISK DETECTION - LIGHTWEIGHT RAPID TRAINING PIPELINE
================================================================================
Fast iterative training for continuous model improvement.
Uses Scikit-learn ensemble methods + lightweight TensorFlow.

Features:
  - 2-3 minute training time
  - Multi-class risk classification
  - Real-time model improvements
  - Incremental learning capability
================================================================================
"""

import os
import json
import pickle
import numpy as np
import pandas as pd
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')

# ML Libraries
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, VotingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import GaussianNB
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    classification_report, confusion_matrix
)
import joblib

# NLP
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.decomposition import TruncatedSVD

# ================================================================================
# CONFIGURATION
# ================================================================================

BASE_DIR = Path(__file__).resolve().parent
DATASET_PATH = BASE_DIR / "adhd_risk_dataset_full.csv"
MODEL_DIR = BASE_DIR.parent / "model"
MODEL_DIR.mkdir(exist_ok=True, parents=True)

LABEL_MAPPING = {
    "Low Risk": 0,
    "Moderate Risk": 1,
    "High Risk ADHD": 2,
}
LABEL_NAMES = list(LABEL_MAPPING.keys())
FEATURE_NAMES = ["focus", "hyperactivity", "completion"]

# ================================================================================
# TEXT FEATURE EXTRACTION
# ================================================================================

def extract_text_features(X_text, n_features=200, fit=True, vectorizer=None):
    """Extract TF-IDF features from text."""
    if fit:
        vectorizer = TfidfVectorizer(
            max_features=n_features,
            ngram_range=(1, 2),
            stop_words='english',
            min_df=2,
            max_df=0.9
        )
        X_tfidf = vectorizer.fit_transform(X_text).toarray()
    else:
        X_tfidf = vectorizer.transform(X_text).toarray()
    
    return X_tfidf, vectorizer


# ================================================================================
# MODEL BUILDING
# ================================================================================

def build_text_model():
    """Build ensemble model for text features."""
    return VotingClassifier([
        ('rf', RandomForestClassifier(n_estimators=150, max_depth=15, random_state=42, n_jobs=-1)),
        ('gb', GradientBoostingClassifier(n_estimators=150, learning_rate=0.05, max_depth=7, random_state=42)),
        ('lr', LogisticRegression(max_iter=1000, random_state=42, n_jobs=-1)),
    ], voting='soft')


def build_behavioral_model():
    """Build ensemble model for behavioral features."""
    return VotingClassifier([
        ('rf', RandomForestClassifier(n_estimators=200, max_depth=18, random_state=42, n_jobs=-1)),
        ('gb', GradientBoostingClassifier(n_estimators=200, learning_rate=0.05, max_depth=8, random_state=42)),
        ('gnb', GaussianNB()),
    ], voting='soft')


def build_hybrid_model():
    """Build final hybrid ensemble."""
    return VotingClassifier([
        ('rf', RandomForestClassifier(n_estimators=300, max_depth=20, random_state=42, n_jobs=-1, class_weight='balanced')),
        ('gb', GradientBoostingClassifier(n_estimators=250, learning_rate=0.05, max_depth=9, random_state=42)),
    ], voting='soft')


# ================================================================================
# TRAINING PIPELINE
# ================================================================================

def main():
    print("\n" + "="*80)
    print("ADHD RISK DETECTION - LIGHTWEIGHT RAPID TRAINING")
    print("="*80 + "\n")
    
    # Load data
    if not DATASET_PATH.exists():
        print(f"❌ Dataset not found: {DATASET_PATH}")
        return
    
    df = pd.read_csv(DATASET_PATH)
    print(f"✓ Loaded {len(df):,} samples")
    print(f"  Label distribution:\n{df['label'].value_counts()}\n")
    
    # Prepare data
    X_text = df["text"].values
    X_behavioral = df[FEATURE_NAMES].values
    y = np.array([LABEL_MAPPING[label] for label in df["label"]])
    
    # Split
    X_text_train, X_text_test, X_behavioral_train, X_behavioral_test, y_train, y_test = train_test_split(
        X_text, X_behavioral, y, test_size=0.15, stratify=y, random_state=42
    )
    
    print(f"Train: {len(X_text_train)} | Test: {len(X_text_test)}\n")
    
    # === TEXT MODEL ===
    print("="*80)
    print("TRAINING TEXT MODEL (TF-IDF + Ensemble)")
    print("="*80)
    
    X_text_train_tfidf, vectorizer = extract_text_features(X_text_train, n_features=200, fit=True)
    X_text_test_tfidf, _ = extract_text_features(X_text_test, n_features=200, fit=False, vectorizer=vectorizer)
    
    text_model = build_text_model()
    print("Training ensemble...")
    text_model.fit(X_text_train_tfidf, y_train)
    
    y_text_pred = text_model.predict(X_text_test_tfidf)
    y_text_proba = text_model.predict_proba(X_text_test_tfidf)
    
    text_acc = accuracy_score(y_test, y_text_pred)
    text_f1 = f1_score(y_test, y_text_pred, average='weighted')
    
    print(f"\n✓ Text Model Performance:")
    print(f"  Accuracy: {text_acc:.4f}")
    print(f"  F1-Score: {text_f1:.4f}\n")
    print(classification_report(y_test, y_text_pred, target_names=LABEL_NAMES))
    
    # === BEHAVIORAL MODEL ===
    print("="*80)
    print("TRAINING BEHAVIORAL MODEL (Ensemble)")
    print("="*80)
    
    scaler = StandardScaler()
    X_behavioral_train_scaled = scaler.fit_transform(X_behavioral_train)
    X_behavioral_test_scaled = scaler.transform(X_behavioral_test)
    
    behavioral_model = build_behavioral_model()
    print("Training ensemble...")
    behavioral_model.fit(X_behavioral_train_scaled, y_train)
    
    y_behavioral_pred = behavioral_model.predict(X_behavioral_test_scaled)
    y_behavioral_proba = behavioral_model.predict_proba(X_behavioral_test_scaled)
    
    behavioral_acc = accuracy_score(y_test, y_behavioral_pred)
    behavioral_f1 = f1_score(y_test, y_behavioral_pred, average='weighted')
    
    print(f"\n✓ Behavioral Model Performance:")
    print(f"  Accuracy: {behavioral_acc:.4f}")
    print(f"  F1-Score: {behavioral_f1:.4f}\n")
    print(classification_report(y_test, y_behavioral_pred, target_names=LABEL_NAMES))
    
    # === HYBRID ENSEMBLE ===
    print("="*80)
    print("CREATING HYBRID ENSEMBLE (Weighted Fusion)")
    print("="*80)
    
    # Combine features
    X_combined_train = np.hstack([X_text_train_tfidf, X_behavioral_train_scaled])
    X_combined_test = np.hstack([X_text_test_tfidf, X_behavioral_test_scaled])
    
    hybrid_model = build_hybrid_model()
    print("Training hybrid ensemble...")
    hybrid_model.fit(X_combined_train, y_train)
    
    y_hybrid_pred = hybrid_model.predict(X_combined_test)
    y_hybrid_proba = hybrid_model.predict_proba(X_combined_test)
    
    hybrid_acc = accuracy_score(y_test, y_hybrid_pred)
    hybrid_f1 = f1_score(y_test, y_hybrid_pred, average='weighted')
    
    print(f"\n✓ Hybrid Model Performance:")
    print(f"  Accuracy: {hybrid_acc:.4f}")
    print(f"  F1-Score: {hybrid_f1:.4f}\n")
    print(classification_report(y_test, y_hybrid_pred, target_names=LABEL_NAMES))
    
    # === WEIGHTED FUSION ===
    print("="*80)
    print("ADVANCED WEIGHTED FUSION (60% Text / 40% Behavioral)")
    print("="*80)
    
    alpha, beta = 0.60, 0.40
    fusion_proba = alpha * y_text_proba + beta * y_behavioral_proba
    y_fusion_pred = np.argmax(fusion_proba, axis=1)
    
    fusion_acc = accuracy_score(y_test, y_fusion_pred)
    fusion_f1 = f1_score(y_test, y_fusion_pred, average='weighted')
    
    print(f"\n✓ Fusion Model Performance:")
    print(f"  Accuracy: {fusion_acc:.4f}")
    print(f"  F1-Score: {fusion_f1:.4f}\n")
    print(classification_report(y_test, y_fusion_pred, target_names=LABEL_NAMES))
    
    # === SAVE MODELS ===
    print("="*80)
    print("SAVING TRAINED MODELS")
    print("="*80 + "\n")
    
    joblib.dump(text_model, MODEL_DIR / "adhd_text_ensemble_v3.pkl")
    print(f"✓ Text ensemble saved: adhd_text_ensemble_v3.pkl")
    
    joblib.dump(behavioral_model, MODEL_DIR / "adhd_behavioral_ensemble_v3.pkl")
    print(f"✓ Behavioral ensemble saved: adhd_behavioral_ensemble_v3.pkl")
    
    joblib.dump(hybrid_model, MODEL_DIR / "adhd_hybrid_ensemble_v3.pkl")
    print(f"✓ Hybrid ensemble saved: adhd_hybrid_ensemble_v3.pkl")
    
    joblib.dump(vectorizer, MODEL_DIR / "adhd_vectorizer_v3.pkl")
    print(f"✓ Vectorizer saved: adhd_vectorizer_v3.pkl")
    
    joblib.dump(scaler, MODEL_DIR / "adhd_scaler_v3.pkl")
    print(f"✓ Scaler saved: adhd_scaler_v3.pkl")
    
    # Metadata
    metadata = {
        "version": "3.0",
        "model_type": "ensemble_voting",
        "label_mapping": LABEL_MAPPING,
        "feature_names": FEATURE_NAMES,
        "algorithms": ["RandomForest", "GradientBoosting", "LogisticRegression"],
        "text_weight": 0.60,
        "behavioral_weight": 0.40,
        "test_accuracy": round(fusion_acc, 4),
        "test_f1": round(fusion_f1, 4),
    }
    
    with open(MODEL_DIR / "adhd_metadata_v3.json", "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"✓ Metadata saved: adhd_metadata_v3.json")
    
    # Summary
    print("\n" + "="*80)
    print("🎯 TRAINING SUMMARY")
    print("="*80)
    print(f"\nModel Performance Comparison:")
    print(f"  Text Model       → Accuracy: {text_acc:.4f} | F1: {text_f1:.4f}")
    print(f"  Behavioral Model → Accuracy: {behavioral_acc:.4f} | F1: {behavioral_f1:.4f}")
    print(f"  Hybrid Model     → Accuracy: {hybrid_acc:.4f} | F1: {hybrid_f1:.4f}")
    print(f"  → Fusion Model   → Accuracy: {fusion_acc:.4f} | F1: {fusion_f1:.4f} ⭐")
    print("\n" + "="*80 + "\n")


if __name__ == "__main__":
    main()
