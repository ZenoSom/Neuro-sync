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
    age: int = Field(..., ge=10, le=100, description="User age")
    sleep_hours: float = Field(..., ge=0, le=16, description="Avg sleep hours per night")
    screen_time: float = Field(..., ge=0, le=24, description="Daily screen time in hours")
    focus_level: float = Field(..., ge=1, le=10, description="Self-rated focus (1=poor, 10=excellent)")
    hyperactivity: float = Field(..., ge=1, le=10, description="Self-rated hyperactivity (1=calm, 10=very hyperactive)")
    impulsiveness: float = Field(..., ge=1, le=10, description="Self-rated impulsiveness (1=calculated, 10=very impulsive)")
    stress_level: float = Field(..., ge=1, le=10, description="Self-rated stress (1=relaxed, 10=extreme)")
    attention_span: float = Field(..., ge=1, le=10, description="Self-rated attention span (1=poor, 10=excellent)")
    task_completion: float = Field(..., ge=1, le=10, description="Task completion ability (1=never, 10=always)")
    journal_text: str = Field("", description="Optional text entry about personal experiences")
    gaze_deviation: float = Field(0.0, ge=0.0, le=10.0, description="Webcam tracked gaze deviation index")
    fidget_index: float = Field(0.0, ge=0.0, le=10.0, description="Webcam tracked hyperactivity/fidgeting index")
    tracked_expression: str = Field("Focused", description="Webcam tracked emotional/attentive state")


class RecommendationInput(BaseModel):
    severity: str
    focus_level: float
    hyperactivity: float
    sleep_hours: float
    stress_level: float


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
    behavioral_scores: Dict[str, float] = Field(default_factory=dict)
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
    prediction = "ADHD Likely"

    return {
        "prediction": prediction,
        "confidence": confidence,
        "severity": "Mild",
        "behavioral_scores": {
            "focus_level": round(float(input_payload.get("focus_level", 5)), 1),
            "hyperactivity": round(float(input_payload.get("hyperactivity", 5)), 1),
            "impulsiveness": round(float(input_payload.get("impulsiveness", 5)), 1),
            "stress_level": round(float(input_payload.get("stress_level", 5)), 1),
            "attention_span": round(float(input_payload.get("attention_span", 5)), 1),
            "task_completion": round(float(input_payload.get("task_completion", 5)), 1),
        },
        "analysis_details": {
            "behavioral_proba": confidence,
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
            "focus": data.focus_level,
            "hyperactivity": data.hyperactivity,
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
