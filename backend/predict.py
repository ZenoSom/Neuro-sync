# ====================================================================
# Prediction logic — DSM-5 ASRS Scoring Engine
# Replaces arbitrary sliders with clinically-validated questionnaire scoring
# ====================================================================

import re
import numpy as np

try:
    import nltk
    from nltk.corpus import stopwords
    from nltk.stem import WordNetLemmatizer
except Exception:
    nltk = None
    stopwords = None
    WordNetLemmatizer = None

try:
    from tensorflow.keras.preprocessing.sequence import pad_sequences
except Exception:
    pad_sequences = None

from model_loader import (
    get_model,
    get_feature_names,
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


# ── Helpers ──────────────────────────────────────────────────────────

def clamp(value: float, min_val: float, max_val: float) -> float:
    return max(min_val, min(max_val, value))


def clean_text(text: str) -> str:
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
    if probability < 0.30:
        return "Low"
    if probability < 0.50:
        return "Mild"
    if probability < 0.70:
        return "Moderate"
    return "High"


# ── DSM-5 ASRS Scoring Engine ─────────────────────────────────────────

# DSM-5 thresholds: a response of "Sometimes" (2) or above counts as a symptom
_SYMPTOM_THRESHOLD = 2  # 0=Never, 1=Rarely, 2=Sometimes, 3=Often, 4=Very Often

# DSM-5 clinical cutoff: ≥6 symptoms in a subscale = clinically significant
_CLINICAL_CUTOFF = 6

# Inattention questions: Q1–Q9 (Part A)
_INATTENTION_KEYS = ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9"]

# Hyperactivity/Impulsivity questions: Q10–Q18 (Part B)
_HYPERACTIVITY_KEYS = ["q10", "q11", "q12", "q13", "q14", "q15", "q16", "q17", "q18"]

# Human-readable question labels for driver contributions
_QUESTION_LABELS = {
    "q1": "Careless Mistakes",
    "q2": "Sustaining Attention",
    "q3": "Listening Difficulty",
    "q4": "Follow-Through Failure",
    "q5": "Organization Trouble",
    "q6": "Avoiding Mental Effort",
    "q7": "Losing Things",
    "q8": "External Distraction",
    "q9": "Daily Forgetfulness",
    "q10": "Fidgeting/Squirming",
    "q11": "Leaving Seat",
    "q12": "Restlessness",
    "q13": "Quiet Leisure Difficulty",
    "q14": "'On the Go' Feeling",
    "q15": "Excessive Talking",
    "q16": "Blurting Out Answers",
    "q17": "Waiting Turn Difficulty",
    "q18": "Interrupting Others",
}


def _asrs_scoring(input_data: dict) -> tuple:
    """
    Compute ASRS/DSM-5 subscale scores and combined probability.

    Returns:
        (asrs_probability, inattention_score, hyperactivity_score,
         inattention_count, hyperactivity_count, dsm5_presentation,
         driver_contributions)
    """
    # Extract question values (default 0 = Never if missing)
    inattention_vals = [int(input_data.get(k, 0)) for k in _INATTENTION_KEYS]
    hyperactivity_vals = [int(input_data.get(k, 0)) for k in _HYPERACTIVITY_KEYS]

    # Raw sums (0–36 each)
    inattention_raw = sum(inattention_vals)
    hyperactivity_raw = sum(hyperactivity_vals)

    # Normalised 0.0–1.0 subscale scores
    inattention_score = inattention_raw / 36.0
    hyperactivity_score = hyperactivity_raw / 36.0

    # DSM-5 symptom counts (items at or above threshold)
    inattention_count = sum(1 for v in inattention_vals if v >= _SYMPTOM_THRESHOLD)
    hyperactivity_count = sum(1 for v in hyperactivity_vals if v >= _SYMPTOM_THRESHOLD)

    # DSM-5 clinical presentation classification
    inatt_flag = inattention_count >= _CLINICAL_CUTOFF
    hyper_flag = hyperactivity_count >= _CLINICAL_CUTOFF

    if inatt_flag and hyper_flag:
        dsm5_presentation = "Combined Presentation"
    elif inatt_flag:
        dsm5_presentation = "Predominantly Inattentive"
    elif hyper_flag:
        dsm5_presentation = "Predominantly Hyperactive-Impulsive"
    else:
        dsm5_presentation = "Subthreshold / Low Risk"

    # Combined ASRS probability
    # Part A (inattention) weighted slightly higher as it's the primary screener
    asrs_probability = clamp(
        (inattention_score * 0.55) + (hyperactivity_score * 0.45),
        0.02, 0.98
    )

    # Build driver contributions (top symptoms by score)
    all_keys = _INATTENTION_KEYS + _HYPERACTIVITY_KEYS
    all_vals = inattention_vals + hyperactivity_vals
    contributions = []
    for key, val in zip(all_keys, all_vals):
        normalised = val / 4.0  # 0.0–1.0
        if normalised > 0:
            contributions.append({
                "feature": _QUESTION_LABELS.get(key, key),
                "impact": round(normalised * (0.12 if key in _INATTENTION_KEYS else 0.10), 4),
                "direction": "risk" if val >= _SYMPTOM_THRESHOLD else "protective",
                "value": round(normalised, 3),
                "raw_score": val,
                "subscale": "Inattention" if key in _INATTENTION_KEYS else "Hyperactivity",
            })

    contributions.sort(key=lambda x: x["impact"], reverse=True)

    return (
        asrs_probability,
        round(inattention_score, 4),
        round(hyperactivity_score, 4),
        inattention_count,
        hyperactivity_count,
        dsm5_presentation,
        contributions[:8],  # top 8 drivers
    )


# ── Text Prediction Pipeline (unchanged) ─────────────────────────────

def _predict_text_with_v3_model(journal_text: str):
    text_model = get_text_model()
    vectorizer = get_vectorizer()
    if text_model is None or vectorizer is None or not journal_text:
        return None

    cleaned = clean_text(journal_text)
    if not cleaned:
        return None

    _V3_CLASS_PROBA = {0: 0.15, 1: 0.55, 2: 0.90}

    try:
        text_vec = vectorizer.transform([cleaned])
        if hasattr(text_model, "predict_proba"):
            class_probas = text_model.predict_proba(text_vec)[0]
            n = len(class_probas)
            if n == 3:
                proba = (class_probas[0] * 0.15 + class_probas[1] * 0.55 + class_probas[2] * 0.90)
            elif n == 2:
                proba = float(class_probas[1])
            else:
                proba = float(np.dot(class_probas, np.linspace(0.1, 0.9, n)))
        else:
            pred = text_model.predict(text_vec)[0]
            proba = _V3_CLASS_PROBA.get(int(pred), 0.5)

        tokens = cleaned.split()
        return clamp(float(proba), 0.1, 0.95), True, {"token_count": len(tokens)}, "text_ml_model"
    except Exception:
        return None


def _text_lexicon_probability(journal_text: str):
    if not journal_text:
        return 0.5, False, {"token_count": 0, "risk_terms": 0, "protective_terms": 0, "signal": 0.0}

    import re as _re
    voice_emotions_raw = []
    emotion_tag_match = _re.search(r"\[Voice Emotion Signals Detected: ([^\]]+)\]", journal_text)
    if emotion_tag_match:
        voice_emotions_raw = [e.strip().lower() for e in emotion_tag_match.group(1).split(",")]
        journal_text = journal_text[: emotion_tag_match.start()].strip()

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
    VOICE_RISK = {"anxious", "frustrated", "scattered", "exhausted", "impulsive"}
    VOICE_PROTECT = {"calm", "focused", "hopeful"}

    risk_count = sum(1 for t in tokens if t in risk_terms)
    protective_count = sum(1 for t in tokens if t in protective_terms)
    risk_count += sum(1 for e in voice_emotions_raw if e in VOICE_RISK)
    protective_count += sum(1 for e in voice_emotions_raw if e in VOICE_PROTECT)

    effective = max(4.0, (token_count + len(voice_emotions_raw) * 2) * 0.35)
    raw_signal = clamp((risk_count - protective_count) / effective, -1.5, 1.5)
    lex_prob = clamp(0.5 + (raw_signal * 0.14), 0.2, 0.8)
    conf = clamp((token_count + len(voice_emotions_raw) * 5) / 40.0, 0.25, 1.0)
    adj = 0.5 + ((lex_prob - 0.5) * conf)

    return (
        clamp(adj, 0.2, 0.8),
        True,
        {
            "token_count": token_count,
            "risk_terms": risk_count,
            "protective_terms": protective_count,
            "signal": round(float(raw_signal), 4),
            "voice_emotions": voice_emotions_raw,
        },
    )


# ── Main Prediction Entry Point ───────────────────────────────────────

def make_prediction(input_data: dict) -> dict:
    """
    Takes DSM-5 questionnaire answers (q1–q18) plus optional enrichments,
    runs the ASRS scoring engine, behavioral ML model, and NLP text pipeline,
    and returns a structured clinical prediction.
    """

    # ── 1) ASRS / DSM-5 Scoring ──────────────────────────────────────
    (
        asrs_probability,
        inattention_score,
        hyperactivity_score,
        inattention_count,
        hyperactivity_count,
        dsm5_presentation,
        driver_contributions,
    ) = _asrs_scoring(input_data)

    # ── 1.5) Behavioral ML Model ────────────────────────────────────
    ml_probability = asrs_probability  # fallback
    behavioral_model = get_model()
    feature_names = get_feature_names()
    
    if behavioral_model and feature_names:
        try:
            # Extract features in the exact order required
            features = []
            for feat in feature_names:
                if feat == "age":
                    features.append(float(input_data.get("age", 25)))
                elif feat == "sleep_hours":
                    features.append(float(input_data.get("sleep_hours", 7.5)))
                elif feat == "screen_time":
                    features.append(float(input_data.get("screen_time", 4.5)))
                elif feat.startswith("q"):
                    # Extract q1-q18
                    features.append(float(input_data.get(feat, 0)))
                else:
                    features.append(0.0)
            
            # Predict
            pred_proba = behavioral_model.predict_proba([features])[0]
            if len(pred_proba) > 1:
                ml_probability = float(pred_proba[1])
        except Exception as e:
            print(f"ML Model error: {e}")
            pass

    # ── 2) Text / NLP prediction ──────────────────────────────────────
    journal_text = input_data.get("journal_text", "")
    proba_text = 0.5
    text_analyzed = False
    text_mode = "none"
    text_debug = {"token_count": 0}

    # Try CNN+LSTM deep learning model first
    dl_model = get_dl_model()
    tokenizer_obj = get_tokenizer()
    if dl_model and tokenizer_obj and journal_text and pad_sequences is not None:
        cleaned = clean_text(journal_text)
        if cleaned:
            try:
                seq = tokenizer_obj.texts_to_sequences([cleaned])
                padded = pad_sequences(seq, maxlen=MAX_SEQ_LEN)
                pred = dl_model.predict(padded, verbose=0)
                proba_text = float(pred[0][0])
                text_analyzed = True
                text_mode = "dl_model"
                text_debug = {"token_count": len(cleaned.split())}
            except Exception:
                pass

    # Fallback: TF-IDF + ensemble
    if not text_analyzed and journal_text:
        result = _predict_text_with_v3_model(journal_text)
        if result:
            proba_text, text_analyzed, text_debug, text_mode = result

    # Fallback: lexicon
    if not text_analyzed and journal_text:
        proba_text, text_analyzed, text_debug = _text_lexicon_probability(journal_text)
        text_mode = "lexicon_fallback" if text_analyzed else "none"

    # ── 3) Cognitive Quiz Score ───────────────────────────────────────
    quiz_score = float(input_data.get("quiz_score", 0.0))
    quiz_attempted = bool(input_data.get("quiz_attempted", False))

    # ── 4) Blend all signals ──────────────────────────────────────────
    # Blend ML model with pure DSM-5 ASRS. ML model is 70% and DSM-5 is 30% of base.
    base_probability = (ml_probability * 0.70) + (asrs_probability * 0.30)
    
    # Optional Gaze / Webcam adjustments
    fidget = float(input_data.get("fidget_index", 0))
    gaze = float(input_data.get("gaze_deviation", 0))
    # If high fidget or high gaze deviation, slight bump in prob
    if fidget > 0.6 or gaze > 0.6:
        base_probability = min(0.99, base_probability * 1.05)

    # Blend with Text and Quiz
    if text_analyzed and quiz_attempted:
        token_count = text_debug.get("token_count", 0)
        text_weight = 0.10 if token_count < 10 else (0.15 if text_mode == "dl_model" else 0.10)
        quiz_weight = 0.15
        asrs_weight = 1.0 - text_weight - quiz_weight
        proba_final = (
            base_probability * asrs_weight
            + proba_text * text_weight
            + quiz_score * quiz_weight
        )
    elif text_analyzed:
        token_count = text_debug.get("token_count", 0)
        text_weight = 0.10 if token_count < 10 else (0.20 if text_mode == "dl_model" else 0.15)
        proba_final = base_probability * (1.0 - text_weight) + proba_text * text_weight
    elif quiz_attempted:
        quiz_weight = 0.15
        proba_final = base_probability * (1.0 - quiz_weight) + quiz_score * quiz_weight
    else:
        proba_final = base_probability

    # ── 5) Webcam Telemetry ───────────────────────────────────────────
    gaze_val = float(input_data.get("gaze_deviation", 0.0))
    fidget_val = float(input_data.get("fidget_index", 0.0))
    tracked_expr = input_data.get("tracked_expression", "Focused")
    webcam_active = gaze_val > 0.0 or fidget_val > 0.0

    if webcam_active:
        camera_risks = []
        if gaze_val > 0.0:
            camera_risks.append(clamp(gaze_val / 10.0, 0.0, 1.0))
        if fidget_val > 0.0:
            camera_risks.append(clamp(fidget_val / 10.0, 0.0, 1.0))
        avg_cam = sum(camera_risks) / len(camera_risks)
        proba_final = clamp((proba_final * 0.90) + (avg_cam * 0.10), 0.01, 0.99)

        if gaze_val > 3.0:
            driver_contributions.append({
                "feature": "Webcam Gaze Drift",
                "impact": round(clamp(gaze_val / 10.0, 0, 1) * 0.08, 4),
                "direction": "risk" if gaze_val > 5.0 else "neutral",
                "value": round(gaze_val, 2),
                "subscale": "Webcam",
            })
        if fidget_val > 3.0:
            driver_contributions.append({
                "feature": "Webcam Fidgeting",
                "impact": round(clamp(fidget_val / 10.0, 0, 1) * 0.08, 4),
                "direction": "risk" if fidget_val > 5.0 else "neutral",
                "value": round(fidget_val, 2),
                "subscale": "Webcam",
            })

    if text_analyzed and text_mode == "lexicon_fallback":
        signal = float(text_debug.get("signal", 0.0))
        driver_contributions.append({
            "feature": "Journal Signal",
            "impact": round(abs(signal) * 0.08, 4),
            "direction": "risk" if signal > 0 else "protective",
            "value": round(signal, 4),
            "subscale": "Text NLP",
        })

    proba_final = clamp(float(proba_final), 0.01, 0.99)

    # ── 6) Final Classification ───────────────────────────────────────
    if proba_final >= 0.70:
        prediction = "ADHD Indicators Present"
    elif proba_final >= 0.45:
        prediction = "Subthreshold — Monitor"
    else:
        prediction = "Low Risk"

    severity = classify_severity(proba_final)

    driver_contributions = sorted(
        driver_contributions, key=lambda x: x.get("impact", 0), reverse=True
    )[:8]

    return {
        "prediction": prediction,
        "confidence": round(proba_final, 4),
        "severity": severity,
        "behavioral_scores": {
            "inattention_score": inattention_score,
            "hyperactivity_score": hyperactivity_score,
            "inattention_symptom_count": inattention_count,
            "hyperactivity_symptom_count": hyperactivity_count,
            "dsm5_presentation": dsm5_presentation,
            "quiz_score": round(quiz_score, 3),
            "quiz_attempted": quiz_attempted,
        },
        "analysis_details": {
            "asrs_proba": round(asrs_probability, 4),
            "text_proba": round(proba_text, 4) if text_analyzed else None,
            "quiz_proba": round(quiz_score, 4) if quiz_attempted else None,
            "text_analyzed": text_analyzed,
            "fallback_mode": text_mode in ("lexicon_fallback", "none"),
            "text_mode": text_mode,
            "driver_contributions": driver_contributions,
            "text_debug": text_debug,
            "dsm5_clinical": {
                "inattention_count": inattention_count,
                "hyperactivity_count": hyperactivity_count,
                "inattention_flag": inattention_count >= _CLINICAL_CUTOFF,
                "hyperactivity_flag": hyperactivity_count >= _CLINICAL_CUTOFF,
                "presentation": dsm5_presentation,
                "threshold_used": _CLINICAL_CUTOFF,
            },
            "warnings": get_loader_warnings(),
            "webcam_telemetry": {
                "gaze_deviation": round(gaze_val, 2),
                "fidget_index": round(fidget_val, 2),
                "tracked_expression": tracked_expr,
                "active": webcam_active,
            },
        },
        "iks_recommendations": {},
    }
