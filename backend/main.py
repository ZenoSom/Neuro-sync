# ====================================================================
# ADHD Assessment API - FastAPI
# ====================================================================

from contextlib import asynccontextmanager
from typing import Any, Dict, List

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from copilot_service import copilot_service
from iks_recommender import recommender
from model_loader import get_model_readiness
from predict import make_prediction


@asynccontextmanager
async def lifespan(app: FastAPI):
    readiness = get_model_readiness()
    llm_available = copilot_service.is_llm_available() or recommender.is_llm_available()

    print("=" * 50)
    print("ADHD ASSESSMENT SYSTEM - STARTUP")
    print("=" * 50)
    print(f"Models loaded: {readiness['models_loaded']}")
    print(f"LLM available: {llm_available}")
    print(f"Fallback mode: {readiness['fallback_mode'] or not llm_available}")
    if readiness["warnings"]:
        print("Warnings:")
        for warning in readiness["warnings"]:
            print(f" - {warning}")
    print("=" * 50 + "\n")
    yield


app = FastAPI(
    title="ADHD Assessment API",
    description="Predicts ADHD likelihood from behavioural assessment data",
    version="1.1.0",
    lifespan=lifespan,
)


# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AssessmentInput(BaseModel):
    # ── Demographics & Lifestyle (used for IKS recommendations) ──────────
    age: int = Field(..., ge=10, le=100, description="User age")
    sleep_hours: float = Field(7.0, ge=0, le=16, description="Avg sleep hours per night")
    screen_time: float = Field(4.0, ge=0, le=24, description="Daily screen time in hours")

    # ── Part A: Inattention (DSM-5 Criterion A1) — Q1–Q9 ─────────────────
    # 0=Never, 1=Rarely, 2=Sometimes, 3=Often, 4=Very Often
    q1: int = Field(..., ge=0, le=4, description="Careless mistakes / overlook details")
    q2: int = Field(..., ge=0, le=4, description="Trouble keeping attention on tasks")
    q3: int = Field(..., ge=0, le=4, description="Seem not to listen when spoken to directly")
    q4: int = Field(..., ge=0, le=4, description="Fail to follow through / leave tasks unfinished")
    q5: int = Field(..., ge=0, le=4, description="Trouble organizing tasks and activities")
    q6: int = Field(..., ge=0, le=4, description="Avoid tasks that need sustained mental effort")
    q7: int = Field(..., ge=0, le=4, description="Lose things needed for tasks")
    q8: int = Field(..., ge=0, le=4, description="Easily distracted by external stimuli")
    q9: int = Field(..., ge=0, le=4, description="Forgetful in daily activities")

    # ── Part B: Hyperactivity / Impulsivity (DSM-5 Criterion A2) — Q10–Q18
    q10: int = Field(..., ge=0, le=4, description="Fidget / tap hands or feet / squirm")
    q11: int = Field(..., ge=0, le=4, description="Leave seat when expected to stay seated")
    q12: int = Field(..., ge=0, le=4, description="Feel restless")
    q13: int = Field(..., ge=0, le=4, description="Hard to take part in leisure activities quietly")
    q14: int = Field(..., ge=0, le=4, description="Feel 'on the go' / driven by a motor")
    q15: int = Field(..., ge=0, le=4, description="Talk excessively")
    q16: int = Field(..., ge=0, le=4, description="Blurt out answers before question is finished")
    q17: int = Field(..., ge=0, le=4, description="Trouble waiting your turn")
    q18: int = Field(..., ge=0, le=4, description="Interrupt or intrude on others")

    # ── Optional enrichment signals ───────────────────────────────────────
    journal_text: str = Field("", description="Optional free-text journal entry for NLP analysis")
    quiz_score: float = Field(0.0, ge=0.0, le=1.0, description="Cognitive quiz risk score (0=low risk, 1=high risk)")
    quiz_attempted: bool = Field(False, description="Whether the user completed the cognitive quizzes")
    gaze_deviation: float = Field(0.0, ge=0.0, le=10.0, description="Webcam gaze deviation index")
    fidget_index: float = Field(0.0, ge=0.0, le=10.0, description="Webcam fidgeting index")
    tracked_expression: str = Field("Focused", description="Webcam tracked emotional state")


class RecommendationInput(BaseModel):
    severity: str
    inattention_score: float = 0.5
    hyperactivity_score: float = 0.5
    sleep_hours: float = 7.0
    stress_level: float = 5.0
    # Legacy aliases kept for backward compatibility
    focus_level: float = 5.0
    hyperactivity: float = 5.0


class PredictionResult(BaseModel):
    prediction: str
    confidence: float
    severity: str
    behavioral_scores: dict
    analysis_details: dict
    iks_recommendations: dict = {}


class ReadinessResult(BaseModel):
    models_loaded: bool
    llm_available: bool
    fallback_mode: bool
    warnings: List[str] = Field(default_factory=list)


class CopilotBriefInput(BaseModel):
    prediction: str
    severity: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    behavioral_scores: Dict[str, Any] = Field(default_factory=dict)
    analysis_details: Dict[str, Any] = Field(default_factory=dict)


class CopilotBriefResult(BaseModel):
    summary: str
    confidence_explanation: str
    risk_drivers: List[str]
    protective_factors: List[str]
    next_steps: List[str]
    iks_alignment: List[str]
    red_flags: List[str]
    disclaimer: str
    source_mode: str


def _build_prediction_fallback(input_payload: dict, reason: str) -> dict:
    confidence = 0.5
    return {
        "prediction": "Screening Inconclusive",
        "confidence": confidence,
        "severity": "Mild",
        "behavioral_scores": {
            "inattention_score": 0.5,
            "hyperactivity_score": 0.5,
            "inattention_symptom_count": 0,
            "hyperactivity_symptom_count": 0,
            "dsm5_presentation": "Inconclusive",
            "quiz_score": round(float(input_payload.get("quiz_score", 0.0)), 3),
        },
        "analysis_details": {
            "asrs_proba": confidence,
            "text_proba": None,
            "text_analyzed": False,
            "fallback_mode": True,
            "warnings": [f"Demo-safe fallback used: {reason}"],
        },
        "iks_recommendations": {},
    }


def _dedupe_preserve_order(items: List[str]) -> List[str]:
    seen = set()
    ordered = []
    for item in items:
        if item and item not in seen:
            seen.add(item)
            ordered.append(item)
    return ordered


@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "ADHD Assessment API is running with CNN-LSTM Neural Network.",
        "endpoints": ["/health", "/readiness", "/predict", "/recommend", "/copilot/brief"],
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/readiness", response_model=ReadinessResult)
def readiness_check():
    model_status = get_model_readiness()
    llm_available = copilot_service.is_llm_available() or recommender.is_llm_available()
    warnings = _dedupe_preserve_order(
        model_status["warnings"]
        + copilot_service.get_status_warnings()
        + recommender.get_status_warnings()
    )

    return {
        "models_loaded": model_status["models_loaded"],
        "llm_available": llm_available,
        "fallback_mode": bool(model_status["fallback_mode"] or not llm_available),
        "warnings": warnings,
    }


@app.post("/predict", response_model=PredictionResult)
def predict(data: AssessmentInput):
    try:
        return make_prediction(data.model_dump())
    except Exception as exc:
        return _build_prediction_fallback(data.model_dump(), str(exc))


@app.post("/recommend")
def recommend(data: RecommendationInput):
    try:
        iks_input = {
            "severity": data.severity,
            "focus": data.focus_level or (1.0 - data.inattention_score) * 10,
            "hyperactivity": data.hyperactivity or data.hyperactivity_score * 10,
            "sleep": data.sleep_hours,
            "stress": data.stress_level,
        }
        iks_result = recommender.generate_iks_recommendations(iks_input)
        return {"iks_recommendations": iks_result}
    except Exception:
        return {"iks_recommendations": recommender._get_fallback_recommendations(data.severity)}


@app.post("/copilot/brief", response_model=CopilotBriefResult)
def copilot_brief(data: CopilotBriefInput):
    payload = data.model_dump()
    try:
        return copilot_service.generate_brief(payload)
    except Exception:
        return copilot_service.generate_fallback_brief(payload)
