import os
import json
import joblib

try:
    import tensorflow as tf
except Exception:  # pragma: no cover - runtime safety fallback
    tf = None

_model = None
_feature_names = None
_text_model = None
_vectorizer = None
_scaler = None
_metadata = None
_dl_model = None
_tokenizer = None
_warnings = set()

MODEL_DIR = os.path.join(os.path.dirname(__file__), "model")
LFS_POINTER_HEADER = "version https://git-lfs.github.com/spec/v1"


def _add_warning(message: str):
    if message:
        _warnings.add(message)


def _is_lfs_pointer(path: str) -> bool:
    if not os.path.exists(path) or os.path.getsize(path) > 4096:
        return False
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            first_line = f.readline().strip()
        return first_line == LFS_POINTER_HEADER
    except Exception:
        return False


def _missing_or_pointer(path: str, label: str) -> bool:
    if not os.path.exists(path):
        _add_warning(f"Missing model artifact: {label} ({path}).")
        return True
    if _is_lfs_pointer(path):
        _add_warning(
            f"Model artifact is a Git LFS pointer and not downloaded: {label} ({path})."
        )
        return True
    return False


def get_loader_warnings():
    return sorted(_warnings)


def get_model_artifact_status():
    artifacts = {
        "behavioral_model": os.path.join(MODEL_DIR, "adhd_behavioral_ensemble_v3.pkl"),
        "feature_names": os.path.join(MODEL_DIR, "feature_names.json"),
        "scaler": os.path.join(MODEL_DIR, "adhd_scaler_v3.pkl"),
        "metadata": os.path.join(MODEL_DIR, "adhd_metadata_v3.json"),
        "text_model": os.path.join(MODEL_DIR, "adhd_text_ensemble_v3.pkl"),
        "vectorizer": os.path.join(MODEL_DIR, "adhd_vectorizer_v3.pkl"),
        "dl_model": os.path.join(MODEL_DIR, "dl_model", "adhd_dl_model.h5"),
        "tokenizer": os.path.join(MODEL_DIR, "dl_model", "tokenizer.pkl"),
    }

    status = {}
    for label, path in artifacts.items():
        exists = os.path.exists(path)
        pointer = _is_lfs_pointer(path) if exists else False
        status[label] = {
            "path": path,
            "exists": exists,
            "is_lfs_pointer": pointer,
            "ready": exists and not pointer,
        }
    return status


def get_model_readiness():
    # Trigger lazy loading to validate runtime availability.
    behavioral_loaded = bool(get_model() is not None and get_feature_names())
    dl_loaded = bool(get_dl_model() is not None and get_tokenizer() is not None)
    text_loaded = bool(get_text_model() is not None and get_vectorizer() is not None)

    warnings = get_loader_warnings()
    models_loaded = behavioral_loaded or dl_loaded or text_loaded

    return {
        "models_loaded": models_loaded,
        "fallback_mode": not models_loaded,
        "warnings": warnings,
        "artifact_status": get_model_artifact_status(),
        "behavioral_loaded": behavioral_loaded,
        "dl_loaded": dl_loaded,
        "text_loaded": text_loaded,
    }


# ── Behavioral (structured) model ────────────────────────────────────


def get_model():
    """Returns the behavioral (structured) ensemble model (v3)."""
    global _model
    if _model is None:
        path = os.path.join(MODEL_DIR, "adhd_behavioral_ensemble_v3.pkl")
        if _missing_or_pointer(path, "behavioral_model"):
            return None
        try:
            _model = joblib.load(path)
        except Exception as exc:
            _add_warning(f"Failed to load behavioral model: {exc}")
            _model = None
    return _model


def get_feature_names():
    """Returns feature names for the behavioral model."""
    global _feature_names
    if _feature_names is None:
        path = os.path.join(MODEL_DIR, "feature_names.json")
        if not os.path.exists(path):
            _add_warning(f"Missing feature names file: {path}.")
            return None
        if _is_lfs_pointer(path):
            _add_warning(f"Feature names file is an unresolved LFS pointer: {path}.")
            return None
        try:
            with open(path, encoding="utf-8") as f:
                _feature_names = json.load(f)
        except Exception as exc:
            _add_warning(f"Failed to load feature names: {exc}")
            _feature_names = None
    return _feature_names


def get_scaler():
    """Returns the feature scaler (v3)."""
    global _scaler
    if _scaler is None:
        path = os.path.join(MODEL_DIR, "adhd_scaler_v3.pkl")
        if _missing_or_pointer(path, "scaler"):
            return None
        try:
            _scaler = joblib.load(path)
        except Exception as exc:
            _add_warning(f"Failed to load scaler: {exc}")
            _scaler = None
    return _scaler


def get_metadata():
    """Returns the v3 model metadata dict."""
    global _metadata
    if _metadata is None:
        path = os.path.join(MODEL_DIR, "adhd_metadata_v3.json")
        if not os.path.exists(path):
            _add_warning(f"Missing metadata file: {path}.")
            return None
        try:
            with open(path, encoding="utf-8") as f:
                _metadata = json.load(f)
        except Exception as exc:
            _add_warning(f"Failed to load metadata: {exc}")
            _metadata = None
    return _metadata


# ── Text model (TF-IDF + ensemble) ──────────────────────────────────


def get_text_model():
    """Returns the text ensemble model (v3)."""
    global _text_model
    if _text_model is None:
        path = os.path.join(MODEL_DIR, "adhd_text_ensemble_v3.pkl")
        if _missing_or_pointer(path, "text_model"):
            return None
        try:
            _text_model = joblib.load(path)
        except Exception as exc:
            _add_warning(f"Failed to load text model: {exc}")
            _text_model = None
    return _text_model


def get_vectorizer():
    """Returns the TF-IDF vectorizer (v3)."""
    global _vectorizer
    if _vectorizer is None:
        path = os.path.join(MODEL_DIR, "adhd_vectorizer_v3.pkl")
        if _missing_or_pointer(path, "vectorizer"):
            return None
        try:
            _vectorizer = joblib.load(path)
        except Exception as exc:
            _add_warning(f"Failed to load TF-IDF vectorizer: {exc}")
            _vectorizer = None
    return _vectorizer


# ── Deep Learning model (CNN+LSTM) ──────────────────────────────────


def get_dl_model():
    """Returns the Deep Learning (ANN) model."""
    global _dl_model
    if _dl_model is None:
        if tf is None:
            _add_warning("TensorFlow is unavailable; deep learning model disabled.")
            return None
        path = os.path.join(MODEL_DIR, "dl_model", "adhd_dl_model.h5")
        if _missing_or_pointer(path, "dl_model"):
            return None
        try:
            _dl_model = tf.keras.models.load_model(path)
        except Exception as exc:
            _add_warning(f"Failed to load deep learning model: {exc}")
            _dl_model = None
    return _dl_model


def get_tokenizer():
    """Returns the Tokenizer for Deep Learning prediction."""
    global _tokenizer
    if _tokenizer is None:
        path = os.path.join(MODEL_DIR, "dl_model", "tokenizer.pkl")
        if _missing_or_pointer(path, "dl_tokenizer"):
            return None
        try:
            _tokenizer = joblib.load(path)
        except Exception as exc:
            _add_warning(f"Failed to load tokenizer: {exc}")
            _tokenizer = None
    return _tokenizer
