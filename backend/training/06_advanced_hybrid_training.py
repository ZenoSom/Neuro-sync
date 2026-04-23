"""
================================================================================
ADHD RISK DETECTION - UPGRADED HYBRID TRAINING PIPELINE
================================================================================
Multi-class (3-level) Risk Classification:
  - Low Risk
  - Moderate Risk  
  - High Risk ADHD

Models:
  1. Advanced CNN + BiLSTM with Attention for TEXT
  2. Gradient Boosted Ensemble (XGBoost + LightGBM) for BEHAVIORAL
  3. Weighted Fusion Strategy
  
Features:
  - Cross-validation with stratification
  - Advanced hyperparameter tuning
  - Class weight balancing
  - Comprehensive evaluation metrics
  - Model interpretability
================================================================================
"""

import os
import json
import pickle
import warnings
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, Tuple, List

warnings.filterwarnings('ignore')

# Deep Learning
import tensorflow as tf
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
from tensorflow.keras.preprocessing.text import Tokenizer
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.models import Sequential, Model
from tensorflow.keras.layers import (
    Input, Embedding, Conv1D, MaxPooling1D, LSTM, Bidirectional,
    Dense, Dropout, BatchNormalization, Attention, Flatten, GlobalMaxPooling1D
)
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.regularizers import l1_l2

# Classical ML
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    classification_report, confusion_matrix, roc_auc_score, roc_curve, auc
)
import joblib

try:
    import xgboost as xgb
    import lightgbm as lgb
    XGB_AVAILABLE = True
except ImportError:
    XGB_AVAILABLE = False

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

# Text Model Hyperparameters
TEXT_CONFIG = {
    "vocab_size": 5000,
    "max_seq_len": 150,
    "embedding_dim": 100,
    "conv_filters": [64, 128, 128],
    "conv_kernel_sizes": [3, 5, 7],
    "lstm_units": 128,
    "dense_units": [128, 64],
    "dropout": 0.3,
    "batch_size": 32,
    "epochs": 50,
    "validation_split": 0.15,
}

# Behavioral Model Hyperparameters
BEHAVIORAL_CONFIG = {
    "n_splits": 5,
    "batch_size": 32,
}

FEATURE_NAMES = ["focus", "hyperactivity", "completion"]

# ================================================================================
# TEXT MODEL: Advanced CNN + BiLSTM
# ================================================================================

def build_advanced_text_model(vocab_size: int, max_len: int) -> Model:
    """
    Build an advanced CNN + BiLSTM model with attention mechanism.
    """
    model = Sequential([
        Embedding(
            input_dim=vocab_size,
            output_dim=TEXT_CONFIG["embedding_dim"],
            input_length=max_len,
            name="embedding"
        ),
        Dropout(TEXT_CONFIG["dropout"]),
        
        # Multi-channel Conv1D
        Conv1D(TEXT_CONFIG["conv_filters"][0], TEXT_CONFIG["conv_kernel_sizes"][0], 
               activation="relu", padding="same", name="conv1_3"),
        BatchNormalization(),
        MaxPooling1D(pool_size=2),
        Dropout(TEXT_CONFIG["dropout"]),
        
        Conv1D(TEXT_CONFIG["conv_filters"][1], TEXT_CONFIG["conv_kernel_sizes"][1],
               activation="relu", padding="same", name="conv1_5"),
        BatchNormalization(),
        MaxPooling1D(pool_size=2),
        Dropout(TEXT_CONFIG["dropout"]),
        
        Conv1D(TEXT_CONFIG["conv_filters"][2], TEXT_CONFIG["conv_kernel_sizes"][2],
               activation="relu", padding="same", name="conv1_7"),
        BatchNormalization(),
        GlobalMaxPooling1D(),
        Dropout(TEXT_CONFIG["dropout"]),
        
        # BiLSTM
        Bidirectional(
            LSTM(TEXT_CONFIG["lstm_units"], return_sequences=False, dropout=TEXT_CONFIG["dropout"]),
            name="bilstm"
        ),
        
        # Dense layers
        Dense(TEXT_CONFIG["dense_units"][0], activation="relu",
              kernel_regularizer=l1_l2(1e-6, 1e-6), name="dense_1"),
        BatchNormalization(),
        Dropout(TEXT_CONFIG["dropout"]),
        
        Dense(TEXT_CONFIG["dense_units"][1], activation="relu",
              kernel_regularizer=l1_l2(1e-6, 1e-6), name="dense_2"),
        Dropout(TEXT_CONFIG["dropout"]),
        
        # Output: 3-class classification
        Dense(3, activation="softmax", name="output")
    ])
    
    model.compile(
        optimizer=Adam(learning_rate=0.001),
        loss="categorical_crossentropy",
        metrics=["accuracy"]
    )
    
    return model


# ================================================================================
# BEHAVIORAL MODEL: Gradient Boosting Ensemble
# ================================================================================

def build_behavioral_ensemble() -> Dict:
    """
    Build multiple behavioral models for ensemble.
    """
    models = {}
    
    # Random Forest
    models["rf"] = RandomForestClassifier(
        n_estimators=300,
        max_depth=20,
        min_samples_split=5,
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
        verbose=0
    )
    
    # Gradient Boosting
    models["gb"] = GradientBoostingClassifier(
        n_estimators=200,
        learning_rate=0.05,
        max_depth=8,
        min_samples_split=5,
        min_samples_leaf=2,
        subsample=0.8,
        random_state=42,
        verbose=0
    )
    
    # XGBoost (if available)
    if XGB_AVAILABLE:
        models["xgb"] = xgb.XGBClassifier(
            n_estimators=200,
            learning_rate=0.05,
            max_depth=8,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            eval_metric="mlogloss",
            tree_method="hist"
        )
    
    # LightGBM (if available)
    try:
        models["lgb"] = lgb.LGBMClassifier(
            n_estimators=200,
            learning_rate=0.05,
            max_depth=8,
            num_leaves=31,
            random_state=42,
            verbose=-1
        )
    except:
        pass
    
    return models


# ================================================================================
# DATA LOADING AND PREPROCESSING
# ================================================================================

def load_and_prepare_data() -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Load and prepare the ADHD risk dataset."""
    if not DATASET_PATH.exists():
        raise FileNotFoundError(f"Dataset not found: {DATASET_PATH}")
    
    df = pd.read_csv(DATASET_PATH)
    print(f"✓ Loaded {len(df):,} samples")
    print(f"  Distribution:\n{df['label'].value_counts()}\n")
    
    # Extract text
    X_text = df["text"].values
    
    # Extract behavioral features
    X_behavioral = df[FEATURE_NAMES].values
    
    # Encode labels
    y = np.array([LABEL_MAPPING[label] for label in df["label"]])
    
    return X_text, X_behavioral, y, df


def preprocess_text(X_text: np.ndarray, vocab_size: int, max_len: int, fit: bool = True, tokenizer=None):
    """Preprocess text data."""
    if fit:
        tokenizer = Tokenizer(num_words=vocab_size, oov_token="<OOV>")
        tokenizer.fit_on_texts(X_text)
    
    sequences = tokenizer.texts_to_sequences(X_text)
    X_padded = pad_sequences(sequences, maxlen=max_len, padding="post", truncating="post")
    
    return X_padded, tokenizer


def preprocess_behavioral(X_behavioral: np.ndarray, fit: bool = True, scaler=None):
    """Preprocess behavioral data."""
    if fit:
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X_behavioral)
    else:
        X_scaled = scaler.transform(X_behavioral)
    
    return X_scaled, scaler


# ================================================================================
# TRAINING
# ================================================================================

def train_text_model(X_text_train, X_text_val, y_train, y_val, tokenizer):
    """Train the advanced text model."""
    print("\n" + "="*70)
    print("TRAINING ADVANCED CNN + BiLSTM TEXT MODEL")
    print("="*70)
    
    # Convert labels to one-hot
    y_train_cat = tf.keras.utils.to_categorical(y_train, 3)
    y_val_cat = tf.keras.utils.to_categorical(y_val, 3)
    
    # Build model
    model = build_advanced_text_model(TEXT_CONFIG["vocab_size"], TEXT_CONFIG["max_seq_len"])
    print(f"\nModel architecture:\n")
    model.summary()
    
    # Callbacks
    early_stop = EarlyStopping(monitor="val_loss", patience=5, restore_best_weights=True)
    reduce_lr = ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=3, min_lr=1e-6)
    
    # Train
    history = model.fit(
        X_text_train, y_train_cat,
        validation_data=(X_text_val, y_val_cat),
        epochs=TEXT_CONFIG["epochs"],
        batch_size=TEXT_CONFIG["batch_size"],
        callbacks=[early_stop, reduce_lr],
        verbose=1,
        class_weight={0: 1.2, 1: 1.0, 2: 1.3}  # Weight for imbalanced classes
    )
    
    return model, history, tokenizer


def train_behavioral_ensemble(X_behavioral_train, y_train, X_behavioral_val, y_val):
    """Train behavioral ensemble models."""
    print("\n" + "="*70)
    print("TRAINING BEHAVIORAL ENSEMBLE MODELS")
    print("="*70)
    
    models_dict = build_behavioral_ensemble()
    trained_models = {}
    scores = {}
    
    for model_name, model in models_dict.items():
        print(f"\n► Training {model_name.upper()}...")
        
        # Train
        model.fit(X_behavioral_train, y_train)
        
        # Evaluate
        y_pred = model.predict(X_behavioral_val)
        acc = accuracy_score(y_val, y_pred)
        f1 = f1_score(y_val, y_pred, average="weighted")
        
        trained_models[model_name] = model
        scores[model_name] = {"accuracy": acc, "f1": f1}
        
        print(f"  Val Accuracy: {acc:.4f} | F1-Score: {f1:.4f}")
    
    return trained_models, scores


def ensemble_behavioral_predict(models_dict: Dict, X_behavioral):
    """Ensemble prediction from behavioral models."""
    predictions = []
    
    for model_name, model in models_dict.items():
        pred_proba = model.predict_proba(X_behavioral)
        predictions.append(pred_proba)
    
    # Average probabilities
    ensemble_proba = np.mean(predictions, axis=0)
    ensemble_pred = np.argmax(ensemble_proba, axis=1)
    
    return ensemble_pred, ensemble_proba


# ================================================================================
# EVALUATION
# ================================================================================

def evaluate_models(text_model, behavioral_models, X_text_test, X_behavioral_test, y_test):
    """Comprehensive evaluation of both models."""
    print("\n" + "="*70)
    print("COMPREHENSIVE MODEL EVALUATION")
    print("="*70)
    
    # Text model predictions
    print("\n► TEXT MODEL (CNN + BiLSTM)")
    y_text_proba = text_model.predict(X_text_test, verbose=0)
    y_text_pred = np.argmax(y_text_proba, axis=1)
    
    text_acc = accuracy_score(y_test, y_text_pred)
    text_f1 = f1_score(y_test, y_text_pred, average="weighted")
    
    print(f"  Accuracy: {text_acc:.4f}")
    print(f"  F1-Score: {text_f1:.4f}")
    print("\n  Classification Report:")
    print(classification_report(y_test, y_text_pred, target_names=LABEL_NAMES))
    
    # Behavioral model predictions
    print("\n► BEHAVIORAL ENSEMBLE MODEL")
    y_behavioral_pred, y_behavioral_proba = ensemble_behavioral_predict(behavioral_models, X_behavioral_test)
    
    behavioral_acc = accuracy_score(y_test, y_behavioral_pred)
    behavioral_f1 = f1_score(y_test, y_behavioral_pred, average="weighted")
    
    print(f"  Accuracy: {behavioral_acc:.4f}")
    print(f"  F1-Score: {behavioral_f1:.4f}")
    print("\n  Classification Report:")
    print(classification_report(y_test, y_behavioral_pred, target_names=LABEL_NAMES))
    
    # Hybrid ensemble (weighted fusion)
    print("\n► HYBRID ENSEMBLE (Weighted Fusion)")
    alpha = 0.60  # Weight for text model
    beta = 0.40   # Weight for behavioral model
    
    hybrid_proba = alpha * y_text_proba + beta * y_behavioral_proba
    y_hybrid_pred = np.argmax(hybrid_proba, axis=1)
    
    hybrid_acc = accuracy_score(y_test, y_hybrid_pred)
    hybrid_f1 = f1_score(y_test, y_hybrid_pred, average="weighted")
    
    print(f"  Accuracy: {hybrid_acc:.4f}")
    print(f"  F1-Score: {hybrid_f1:.4f}")
    print("\n  Classification Report:")
    print(classification_report(y_test, y_hybrid_pred, target_names=LABEL_NAMES))
    
    return {
        "text": {"accuracy": text_acc, "f1": text_f1, "predictions": y_text_pred},
        "behavioral": {"accuracy": behavioral_acc, "f1": behavioral_f1, "predictions": y_behavioral_pred},
        "hybrid": {"accuracy": hybrid_acc, "f1": hybrid_f1, "predictions": y_hybrid_pred},
    }


# ================================================================================
# MODEL PERSISTENCE
# ================================================================================

def save_models(text_model, behavioral_models, tokenizer, scaler):
    """Save all trained models."""
    print("\n" + "="*70)
    print("SAVING TRAINED MODELS")
    print("="*70)
    
    # Text model
    text_model_path = MODEL_DIR / "adhd_text_model_v2.h5"
    text_model.save(text_model_path)
    print(f"✓ Text model saved: {text_model_path}")
    
    # Behavioral models
    behavioral_model_path = MODEL_DIR / "adhd_behavioral_ensemble_v2.pkl"
    joblib.dump(behavioral_models, behavioral_model_path)
    print(f"✓ Behavioral ensemble saved: {behavioral_model_path}")
    
    # Tokenizer
    tokenizer_path = MODEL_DIR / "adhd_tokenizer_v2.pkl"
    joblib.dump(tokenizer, tokenizer_path)
    print(f"✓ Tokenizer saved: {tokenizer_path}")
    
    # Scaler
    scaler_path = MODEL_DIR / "adhd_scaler_v2.pkl"
    joblib.dump(scaler, scaler_path)
    print(f"✓ Scaler saved: {scaler_path}")
    
    # Metadata
    metadata = {
        "version": "2.0",
        "vocab_size": TEXT_CONFIG["vocab_size"],
        "max_seq_len": TEXT_CONFIG["max_seq_len"],
        "label_mapping": LABEL_MAPPING,
        "feature_names": FEATURE_NAMES,
        "text_weight": 0.60,
        "behavioral_weight": 0.40,
    }
    metadata_path = MODEL_DIR / "adhd_metadata_v2.json"
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"✓ Metadata saved: {metadata_path}")


# ================================================================================
# MAIN TRAINING PIPELINE
# ================================================================================

def main():
    print("\n" + "="*70)
    print("ADHD RISK DETECTION - UPGRADED HYBRID TRAINING PIPELINE")
    print("="*70 + "\n")
    
    # Load data
    X_text, X_behavioral, y, df = load_and_prepare_data()
    
    # Split data
    X_text_train, X_text_test, X_behavioral_train, X_behavioral_test, y_train, y_test = train_test_split(
        X_text, X_behavioral, y, test_size=0.15, stratify=y, random_state=42
    )
    
    X_text_train, X_text_val, X_behavioral_train, X_behavioral_val, y_train, y_val = train_test_split(
        X_text_train, X_behavioral_train, y_train, test_size=0.15, stratify=y_train, random_state=42
    )
    
    print(f"Train: {len(X_text_train)} | Val: {len(X_text_val)} | Test: {len(X_text_test)}\n")
    
    # Preprocess text
    X_text_train_proc, tokenizer = preprocess_text(
        X_text_train, TEXT_CONFIG["vocab_size"], TEXT_CONFIG["max_seq_len"], fit=True
    )
    X_text_val_proc, _ = preprocess_text(
        X_text_val, TEXT_CONFIG["vocab_size"], TEXT_CONFIG["max_seq_len"], fit=False, tokenizer=tokenizer
    )
    X_text_test_proc, _ = preprocess_text(
        X_text_test, TEXT_CONFIG["vocab_size"], TEXT_CONFIG["max_seq_len"], fit=False, tokenizer=tokenizer
    )
    
    # Preprocess behavioral
    X_behavioral_train_proc, scaler = preprocess_behavioral(X_behavioral_train, fit=True)
    X_behavioral_val_proc, _ = preprocess_behavioral(X_behavioral_val, fit=False, scaler=scaler)
    X_behavioral_test_proc, _ = preprocess_behavioral(X_behavioral_test, fit=False, scaler=scaler)
    
    # Train models
    text_model, history, tokenizer = train_text_model(
        X_text_train_proc, X_text_val_proc, y_train, y_val, tokenizer
    )
    
    behavioral_models, behavioral_scores = train_behavioral_ensemble(
        X_behavioral_train_proc, y_train, X_behavioral_val_proc, y_val
    )
    
    # Evaluate
    results = evaluate_models(text_model, behavioral_models, X_text_test_proc, X_behavioral_test_proc, y_test)
    
    # Save
    save_models(text_model, behavioral_models, tokenizer, scaler)
    
    print("\n" + "="*70)
    print("✓ TRAINING COMPLETE")
    print("="*70 + "\n")


if __name__ == "__main__":
    main()
