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


def _text_lexicon_probability(journal_text: str):
    if not journal_text:
        return 0.5, False, {"token_count": 0, "risk_terms": 0, "protective_terms": 0, "signal": 0.0}

    cleaned = clean_text(journal_text)
    if not cleaned:
        return 0.5, False, {"token_count": 0, "risk_terms": 0, "protective_terms": 0, "signal": 0.0}

    tokens = cleaned.split()
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

    risk_count = sum(1 for token in tokens if token in risk_terms)
    protective_count = sum(1 for token in tokens if token in protective_terms)

    raw_signal = (risk_count - protective_count) / max(4.0, token_count * 0.35)
    raw_signal = clamp(raw_signal, -1.5, 1.5)
    lexical_probability = clamp(0.5 + (raw_signal * 0.14), 0.2, 0.8)

    confidence_from_length = clamp(token_count / 40.0, 0.25, 1.0)
    adjusted_probability = 0.5 + ((lexical_probability - 0.5) * confidence_from_length)

    return (
        clamp(adjusted_probability, 0.2, 0.8),
        True,
        {
            "token_count": token_count,
            "risk_terms": risk_count,
            "protective_terms": protective_count,
            "signal": round(float(raw_signal), 4),
        },
    )


def make_prediction(input_data: dict) -> dict:
    """
    Takes feature values + journal text, runs available models,
    and always returns non-constant structured prediction.
    """
    model = get_model()
    feature_names = get_feature_names()

    proba_behavioral = 0.5
    behavioral_mode = "heuristic_fallback"
    driver_contributions = []
    behavioral_components = {}

    if model and feature_names:
        try:
            features = [float(input_data.get(feat, 5.0)) for feat in feature_names]
            proba_behavioral = float(model.predict_proba(np.array([features]))[0][1])
            behavioral_mode = "ml_model"
        except Exception:
            proba_behavioral, driver_contributions, behavioral_components = _behavioral_heuristic_probability(input_data)
            behavioral_mode = "heuristic_fallback"
    else:
        proba_behavioral, driver_contributions, behavioral_components = _behavioral_heuristic_probability(input_data)

    dl_model = get_dl_model()
    tokenizer = get_tokenizer()
    journal_text = input_data.get("journal_text", "")

    proba_text = 0.5
    text_analyzed = False
    text_mode = "none"
    text_debug = {"token_count": 0}

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
                proba_text, text_analyzed, text_debug = _text_lexicon_probability(journal_text)
                text_mode = "lexicon_fallback" if text_analyzed else "none"
    elif journal_text:
        proba_text, text_analyzed, text_debug = _text_lexicon_probability(journal_text)
        text_mode = "lexicon_fallback" if text_analyzed else "none"

    if text_analyzed:
        token_count = text_debug.get("token_count", len(str(journal_text).split()))
        if token_count < 10:
            text_weight = 0.1
        else:
            text_weight = 0.35 if text_mode == "dl_model" else 0.22
        behavioral_weight = 1.0 - text_weight
        proba_final = (proba_text * text_weight) + (proba_behavioral * behavioral_weight)
    else:
        proba_final = proba_behavioral

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
        },
        "iks_recommendations": {},
    }
