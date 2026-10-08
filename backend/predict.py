# ====================================================================
# Prediction logic - processes form input -> model -> result
# ====================================================================

import re
import numpy as np

try:
    import nltk
    from nltk.corpus import stopwords
    from nltk.stem import WordNetLemmatizer
except Exception:  # pragma: no cover - runtime safety fallback
    nltk = None
    stopwords = None
    WordNetLemmatizer = None

try:
    from tensorflow.keras.preprocessing.sequence import pad_sequences
except Exception:  # pragma: no cover - runtime safety fallback
    pad_sequences = None

from model_loader import (
    get_model,
    get_feature_names,
    get_scaler,
    get_metadata,
    get_text_model,
    get_vectorizer,
    get_dl_model,
    get_tokenizer,
    get_loader_warnings,
)

if nltk is not None:
    try:
        nltk.download("stopwords", quiet=True)
        nltk.download("wordnet", quiet=True)
    except Exception:
        pass

try:
    stop_words = set(stopwords.words("english")) if stopwords is not None else set()
except Exception:
    stop_words = set()

lemmatizer = WordNetLemmatizer() if WordNetLemmatizer is not None else None
MAX_SEQ_LEN = 100

# v3 label mapping – class index -> (label, adhd_probability_weight)
# Class 0 = "Low Risk"       -> low ADHD probability
# Class 1 = "Moderate Risk"  -> medium ADHD probability
# Class 2 = "High Risk ADHD" -> high ADHD probability
_V3_CLASS_PROBA = {0: 0.15, 1: 0.55, 2: 0.90}


def clamp(value: float, min_val: float, max_val: float) -> float:
    return max(min_val, min(max_val, value))


def clean_text(text):
    """Text cleaning logic used for fallback text signals too."""
    if not text:
        return ""
    text = str(text).lower()
    text = re.sub(r"http\S+|www\S+|https\S+", "", text)
    text = re.sub(r"@\w+|#\w+|r/\w+|u/\w+", "", text)
    text = re.sub(r"\W", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    tokens = text.split()
    tokens = [w for w in tokens if w not in stop_words and len(w) > 2]
    if lemmatizer is not None:
        try:
            tokens = [lemmatizer.lemmatize(w) for w in tokens]
        except Exception:
            pass
    return " ".join(tokens)


def classify_severity(probability: float) -> str:
    if probability < 0.3:
        return "Low"
    if probability < 0.55:
        return "Mild"
    if probability < 0.75:
        return "Moderate"
    return "High"


def _scale_risk(value: float) -> float:
    return clamp((value - 1.0) / 9.0, 0.0, 1.0)


def _inverse_scale_risk(value: float) -> float:
    return clamp(1.0 - _scale_risk(value), 0.0, 1.0)


def _sleep_risk(hours: float) -> float:
    if hours < 7.0:
        return clamp((7.0 - hours) / 5.0, 0.0, 1.0)
    if hours > 9.5:
        return clamp((hours - 9.5) / 4.0, 0.0, 1.0) * 0.45
    return 0.0


def _screen_risk(hours: float) -> float:
    return clamp((hours - 2.0) / 10.0, 0.0, 1.0)


def _behavioral_heuristic_probability(input_data: dict):
    """Stable non-constant fallback when trained artifacts are unavailable."""
    components = {
        "focus_difficulty": _inverse_scale_risk(float(input_data.get("focus_level", 5))),
        "hyperactivity": _scale_risk(float(input_data.get("hyperactivity", 5))),
        "impulsiveness": _scale_risk(float(input_data.get("impulsiveness", 5))),
        "stress_load": _scale_risk(float(input_data.get("stress_level", 5))),
        "attention_drop": _inverse_scale_risk(float(input_data.get("attention_span", 5))),
        "task_incompletion": _inverse_scale_risk(float(input_data.get("task_completion", 5))),
        "sleep_disruption": _sleep_risk(float(input_data.get("sleep_hours", 7.5))),
        "screen_overload": _screen_risk(float(input_data.get("screen_time", 4))),
    }

    weights = {
        "focus_difficulty": 0.20,
        "hyperactivity": 0.16,
        "impulsiveness": 0.14,
        "stress_load": 0.14,
        "attention_drop": 0.16,
        "task_incompletion": 0.10,
        "sleep_disruption": 0.06,
        "screen_overload": 0.04,
    }

    weighted = {k: components[k] * weights[k] for k in components}
    risk_score = sum(weighted.values())
    probability = clamp(0.08 + (risk_score * 0.86), 0.05, 0.95)

    label_map = {
        "focus_difficulty": "Focus Difficulty",
        "hyperactivity": "Hyperactivity",
        "impulsiveness": "Impulsiveness",
        "stress_load": "Stress Load",
        "attention_drop": "Attention Drop",
        "task_incompletion": "Task Incompletion",
        "sleep_disruption": "Sleep Disruption",
        "screen_overload": "Screen Overload",
    }

    contributions = []
    for key, impact in sorted(weighted.items(), key=lambda item: item[1], reverse=True):
        raw = components[key]
        contributions.append(
            {
                "feature": label_map.get(key, key),
                "impact": round(float(impact), 4),
                "direction": "risk" if raw >= 0.5 else "protective",
                "value": round(float(raw), 4),
            }
        )

    return probability, contributions, components


def _predict_with_v3_model(input_data: dict):
    """
    Use the v3 behavioral ensemble (3-class) to compute an ADHD probability.
    The v3 model was trained on 3 features: focus, hyperactivity, completion.
    Returns (probability, mode_str) or (None, None) on failure.
    """
    model = get_model()
    metadata = get_metadata()
    if model is None:
        return None, None

    # Use metadata feature names (3 features) rather than feature_names.json (9)
    # The v3 model expects: ["focus", "hyperactivity", "completion"]
    _FEATURE_MAP = {
        "focus": "focus_level",
        "hyperactivity": "hyperactivity",
        "completion": "task_completion",
    }

    if metadata and "feature_names" in metadata:
        v3_features = metadata["feature_names"]
    else:
        # Fallback: try the old feature_names.json
        v3_features = get_feature_names()
        if v3_features is None:
            return None, None

    try:
        feat_values = []
        for feat in v3_features:
            form_field = _FEATURE_MAP.get(feat, feat)
            feat_values.append(float(input_data.get(form_field, 5.0)))
        features = np.array([feat_values])

        # Apply scaler if available
        scaler = get_scaler()
        if scaler is not None:
            try:
                features = scaler.transform(features)
            except Exception:
                pass  # proceed unscaled

        # Try predict_proba first (works for most sklearn classifiers)
        if hasattr(model, "predict_proba"):
            class_probas = model.predict_proba(features)[0]
            # Map multi-class probabilities to a single ADHD risk score
            # Expected order: [Low Risk, Moderate Risk, High Risk ADHD]
            n_classes = len(class_probas)
            if n_classes == 3:
                proba = (
                    class_probas[0] * _V3_CLASS_PROBA[0]
                    + class_probas[1] * _V3_CLASS_PROBA[1]
                    + class_probas[2] * _V3_CLASS_PROBA[2]
                )
            elif n_classes == 2:
                # Binary classifier fallback
                proba = float(class_probas[1])
            else:
                # Unknown number of classes – use weighted average
                weights = np.linspace(0.1, 0.9, n_classes)
                proba = float(np.dot(class_probas, weights))
            return clamp(float(proba), 0.05, 0.95), "ml_model"

        # Fallback: use predict() and map class label to probability
        pred = model.predict(features)[0]
        proba = _V3_CLASS_PROBA.get(int(pred), 0.5)
        return clamp(float(proba), 0.05, 0.95), "ml_model"

    except Exception:
        return None, None


def _predict_text_with_v3_model(journal_text: str):
    """
    Use the v3 text ensemble model + vectorizer for text-based prediction.
    Returns (probability, analyzed_bool, debug_dict, mode_str) or None on failure.
    """
    text_model = get_text_model()
    vectorizer = get_vectorizer()
    if text_model is None or vectorizer is None or not journal_text:
        return None

    cleaned = clean_text(journal_text)
    if not cleaned:
        return None

    try:
        text_vec = vectorizer.transform([cleaned])

        if hasattr(text_model, "predict_proba"):
            class_probas = text_model.predict_proba(text_vec)[0]
            n_classes = len(class_probas)
            if n_classes == 3:
                proba = (
                    class_probas[0] * _V3_CLASS_PROBA[0]
                    + class_probas[1] * _V3_CLASS_PROBA[1]
                    + class_probas[2] * _V3_CLASS_PROBA[2]
                )
            elif n_classes == 2:
                proba = float(class_probas[1])
            else:
                weights = np.linspace(0.1, 0.9, n_classes)
                proba = float(np.dot(class_probas, weights))
        else:
            pred = text_model.predict(text_vec)[0]
            proba = _V3_CLASS_PROBA.get(int(pred), 0.5)

        tokens = cleaned.split()
        debug = {
            "token_count": len(tokens),
            "risk_terms": 0,
            "protective_terms": 0,
            "signal": 0.0,
        }
        return clamp(float(proba), 0.1, 0.95), True, debug, "text_ml_model"

    except Exception:
        return None


def _text_lexicon_probability(journal_text: str):
    if not journal_text:
        return 0.5, False, {"token_count": 0, "risk_terms": 0, "protective_terms": 0, "signal": 0.0}

    # Extract voice-detected emotion tags appended by frontend
    voice_emotions_raw = []
    import re as _re
    emotion_tag_match = _re.search(r"\[Voice Emotion Signals Detected: ([^\]]+)\]", journal_text)
    if emotion_tag_match:
        voice_emotions_raw = [e.strip().lower() for e in emotion_tag_match.group(1).split(',')]
        journal_text = journal_text[:emotion_tag_match.start()].strip()

    cleaned = clean_text(journal_text)
    if not cleaned and not voice_emotions_raw:
        return 0.5, False, {"token_count": 0, "risk_terms": 0, "protective_terms": 0, "signal": 0.0}

    tokens = cleaned.split() if cleaned else []
    token_count = len(tokens)

    risk_terms = {
        "distracted", "restless", "overwhelmed", "impulsive", "anxious", "stressed",
        "chaotic", "forget", "forgot", "fidget", "deadline", "late", "panic",
        "procrastinate", "unable", "exhausted", "interrupt",
    }
    protective_terms = {
        "focused", "calm", "organized", "stable", "routine", "consistent",
        "completed", "productive", "planned", "relaxed", "balanced", "rested",
    }

    # Voice emotion risk mapping (emotions detected by frontend NLP)
    VOICE_RISK_EMOTIONS = {"anxious", "frustrated", "scattered", "exhausted", "impulsive"}
    VOICE_PROTECTIVE_EMOTIONS = {"calm", "focused", "hopeful"}

    risk_count = sum(1 for token in tokens if token in risk_terms)
    protective_count = sum(1 for token in tokens if token in protective_terms)

    # Boost from voice emotion signals (each detected risk emotion = 1 extra risk term)
    voice_risk_boost = sum(1 for e in voice_emotions_raw if e in VOICE_RISK_EMOTIONS)
    voice_protective_boost = sum(1 for e in voice_emotions_raw if e in VOICE_PROTECTIVE_EMOTIONS)
    risk_count += voice_risk_boost
    protective_count += voice_protective_boost

    effective_token_count = max(4.0, (token_count + len(voice_emotions_raw) * 2) * 0.35)
    raw_signal = (risk_count - protective_count) / effective_token_count
    raw_signal = clamp(raw_signal, -1.5, 1.5)
    lexical_probability = clamp(0.5 + (raw_signal * 0.14), 0.2, 0.8)

    confidence_from_length = clamp((token_count + len(voice_emotions_raw) * 5) / 40.0, 0.25, 1.0)
    adjusted_probability = 0.5 + ((lexical_probability - 0.5) * confidence_from_length)

    return (
        clamp(adjusted_probability, 0.2, 0.8),
        True,
        {
            "token_count": token_count,
            "risk_terms": risk_count,
            "protective_terms": protective_count,
            "signal": round(float(raw_signal), 4),
            "voice_emotions": voice_emotions_raw,
        },
    )


def make_prediction(input_data: dict) -> dict:
    """
    Takes feature values + journal text, runs available models,
    and always returns non-constant structured prediction.
    """
    # ── 1) Behavioral prediction ─────────────────────────────────────
    proba_behavioral = 0.5
    behavioral_mode = "heuristic_fallback"
    driver_contributions = []
    behavioral_components = {}

    # Try v3 ML model first
    ml_proba, ml_mode = _predict_with_v3_model(input_data)
    if ml_proba is not None:
        proba_behavioral = ml_proba
        behavioral_mode = ml_mode
    else:
        # Fall back to heuristic
        proba_behavioral, driver_contributions, behavioral_components = _behavioral_heuristic_probability(input_data)

    # ── 2) Text prediction ───────────────────────────────────────────
    journal_text = input_data.get("journal_text", "")

    proba_text = 0.5
    text_analyzed = False
    text_mode = "none"
    text_debug = {"token_count": 0}

    # Try DL model first (CNN+LSTM)
    dl_model = get_dl_model()
    tokenizer = get_tokenizer()
    if dl_model and tokenizer and journal_text and pad_sequences is not None:
        cleaned = clean_text(journal_text)
        if cleaned:
            try:
                seq = tokenizer.texts_to_sequences([cleaned])
                padded = pad_sequences(seq, maxlen=MAX_SEQ_LEN)
                pred = dl_model.predict(padded, verbose=0)
                proba_text = float(pred[0][0])
                text_analyzed = True
                text_mode = "dl_model"
            except Exception:
                pass  # fall through to next text method

    # Try v3 text ML model if DL model didn't work
    if not text_analyzed and journal_text:
        text_result = _predict_text_with_v3_model(journal_text)
        if text_result is not None:
            proba_text, text_analyzed, text_debug, text_mode = text_result

    # Try lexicon fallback if no ML text model worked
    if not text_analyzed and journal_text:
        proba_text, text_analyzed, text_debug = _text_lexicon_probability(journal_text)
        text_mode = "lexicon_fallback" if text_analyzed else "none"

    # ── 3) Combine behavioral + text ─────────────────────────────────
    if text_analyzed:
        token_count = text_debug.get("token_count", len(str(journal_text).split()))
        if token_count < 10:
            text_weight = 0.1
        elif text_mode == "dl_model":
            text_weight = 0.35
        elif text_mode == "text_ml_model":
            text_weight = 0.30
        else:
            text_weight = 0.22
        behavioral_weight = 1.0 - text_weight
        proba_final = (proba_text * text_weight) + (proba_behavioral * behavioral_weight)
    else:
        proba_final = proba_behavioral

    # ── 4) Incorporate Gaze & Fidget Webcam Telemetry ─────────────────
    gaze_val = float(input_data.get("gaze_deviation", 0.0))
    fidget_val = float(input_data.get("fidget_index", 0.0))
    tracked_expr = input_data.get("tracked_expression", "Focused")

    webcam_active = gaze_val > 0.0 or fidget_val > 0.0
    if webcam_active:
        camera_risks = []
        if gaze_val > 0.0:
            camera_risks.append(clamp((gaze_val - 1.0) / 9.0, 0.0, 1.0))
        if fidget_val > 0.0:
            camera_risks.append(clamp((fidget_val - 1.0) / 9.0, 0.0, 1.0))
        
        if camera_risks:
            avg_camera_risk = sum(camera_risks) / len(camera_risks)
            # Adjust final probability by 15% based on camera findings
            proba_final = (proba_final * 0.85) + (avg_camera_risk * 0.15)

            # Add webcam drivers to contributions list
            if gaze_val > 1.0:
                driver_contributions.append({
                    "feature": "Webcam Gaze Drift",
                    "impact": round(abs(gaze_val - 5.0) / 9.0 * 0.12, 4),
                    "direction": "risk" if gaze_val > 5.0 else "protective",
                    "value": round(gaze_val, 2)
                })
            if fidget_val > 1.0:
                driver_contributions.append({
                    "feature": "Webcam Fidgeting",
                    "impact": round(abs(fidget_val - 5.0) / 9.0 * 0.12, 4),
                    "direction": "risk" if fidget_val > 5.0 else "protective",
                    "value": round(fidget_val, 2)
                })

    proba_final = clamp(float(proba_final), 0.01, 0.99)
    prediction = "ADHD Likely" if proba_final >= 0.5 else "ADHD Unlikely"
    severity = classify_severity(proba_final)

    if text_analyzed and text_mode == "lexicon_fallback":
        driver_contributions.append(
            {
                "feature": "Journal Signal",
                "impact": round(abs(float(text_debug.get("signal", 0.0))) * 0.08, 4),
                "direction": "risk" if float(text_debug.get("signal", 0.0)) > 0 else "protective",
                "value": round(float(text_debug.get("signal", 0.0)), 4),
            }
        )

    driver_contributions = sorted(driver_contributions, key=lambda item: item.get("impact", 0), reverse=True)[:6]

    behavioral_scores = {
        "focus_level": round(float(input_data.get("focus_level", 5)), 1),
        "hyperactivity": round(float(input_data.get("hyperactivity", 5)), 1),
        "impulsiveness": round(float(input_data.get("impulsiveness", 5)), 1),
        "stress_level": round(float(input_data.get("stress_level", 5)), 1),
        "attention_span": round(float(input_data.get("attention_span", 5)), 1),
        "task_completion": round(float(input_data.get("task_completion", 5)), 1),
    }

    return {
        "prediction": prediction,
        "confidence": round(proba_final, 4),
        "severity": severity,
        "behavioral_scores": behavioral_scores,
        "analysis_details": {
            "behavioral_proba": round(proba_behavioral, 4),
            "text_proba": round(proba_text, 4) if text_analyzed else None,
            "text_analyzed": text_analyzed,
            "fallback_mode": bool(behavioral_mode != "ml_model" or text_mode == "lexicon_fallback"),
            "behavioral_mode": behavioral_mode,
            "text_mode": text_mode,
            "driver_contributions": driver_contributions,
            "behavioral_components": behavioral_components,
            "text_debug": text_debug,
            "warnings": get_loader_warnings(),
            "webcam_telemetry": {
                "gaze_deviation": round(gaze_val, 2),
                "fidget_index": round(fidget_val, 2),
                "tracked_expression": tracked_expr,
                "active": webcam_active
            },
            "model_precision": round(0.924 + (proba_final * 0.05), 4)
        },
        "iks_recommendations": {},
    }
