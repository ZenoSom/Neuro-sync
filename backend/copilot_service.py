import json
import os
import re
from typing import Dict, List

import requests
from dotenv import load_dotenv

load_dotenv()


class CopilotService:
    def __init__(self):
        self.api_url = "https://router.huggingface.co/v1/chat/completions"
        self.cache: Dict[str, dict] = {}
        self._warnings = set()

        config = self._load_config()
        self.api_token = config.get("token")
        self.model = config.get("model", "meta-llama/Llama-3.1-8B-Instruct")

        if not self.api_token:
            self._warnings.add(
                "HF_TOKEN is missing. Copilot brief will use deterministic fallback mode."
            )

    def _load_config(self):
        config = {"token": None, "model": None}
        try:
            env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
            if os.path.exists(env_path):
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith("#") or "=" not in line:
                            continue
                        key, value = line.split("=", 1)
                        key = key.strip()
                        value = value.strip()
                        if key in {"HF_TOKEN", "HUGGINGFACE_API_KEY"}:
                            config["token"] = value
                        elif key in {"COPILOT_LLM_MODEL", "LLM_MODEL"}:
                            config["model"] = value
        except Exception as exc:
            self._warnings.add(f"Failed to parse .env config for copilot: {exc}")

        if not config["token"]:
            config["token"] = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_API_KEY")
        if not config["model"]:
            config["model"] = os.getenv("COPILOT_LLM_MODEL") or os.getenv("LLM_MODEL")

        return config

    def is_llm_available(self) -> bool:
        return bool(self.api_token)

    def get_status_warnings(self) -> List[str]:
        return sorted(self._warnings)

    def _build_cache_key(self, payload: dict) -> str:
        return json.dumps(payload, sort_keys=True, ensure_ascii=True)

    def _extract_json(self, response_text: str):
        code_block_match = re.search(
            r"```(?:json)?\s*(\{.*?\})\s*```", response_text, re.DOTALL
        )
        if code_block_match:
            return code_block_match.group(1)

        json_match = re.search(r"\{.*\}", response_text, re.DOTALL)
        if json_match:
            return json_match.group()
        return response_text

    def _build_llm_prompt(self, payload: dict) -> str:
        return (
            "You are an ADHD clinician copilot assistant for educational triage support.\n"
            "Blend modern behavioral health framing with culturally respectful IKS wellness cues.\n"
            "Do not provide a diagnosis. Keep language non-alarmist, specific, and practical.\n\n"
            "Input payload:\n"
            f"{json.dumps(payload, indent=2)}\n\n"
            "Return JSON ONLY with EXACT keys:\n"
            "summary (string), confidence_explanation (string), risk_drivers (array of strings),\n"
            "protective_factors (array of strings), next_steps (array of strings),\n"
            "iks_alignment (array of strings), red_flags (array of strings), disclaimer (string).\n"
            "Use 2-4 concise bullet-like strings per array."
        )

    def _normalize_response(self, data: dict, source_mode: str):
        return {
            "summary": data.get("summary") or "No summary available.",
            "confidence_explanation": data.get("confidence_explanation")
            or "Confidence is derived from behavioral and optional text signals.",
            "risk_drivers": data.get("risk_drivers") or [],
            "protective_factors": data.get("protective_factors") or [],
            "next_steps": data.get("next_steps") or [],
            "iks_alignment": data.get("iks_alignment") or [],
            "red_flags": data.get("red_flags") or [],
            "disclaimer": data.get("disclaimer")
            or (
                "This is an educational screening assistant, not a medical diagnosis. "
                "Please consult a licensed clinician for formal evaluation."
            ),
            "source_mode": source_mode,
        }

    def generate_brief(self, payload: dict):
        cache_key = self._build_cache_key(payload)
        if cache_key in self.cache:
            return self.cache[cache_key]

        if self.is_llm_available():
            llm_result = self._try_llm_brief(payload)
            if llm_result:
                self.cache[cache_key] = llm_result
                return llm_result

        fallback = self.generate_fallback_brief(payload)
        self.cache[cache_key] = fallback
        return fallback

    def _try_llm_brief(self, payload: dict):
        request_body = {
            "model": self.model,
            "messages": [{"role": "user", "content": self._build_llm_prompt(payload)}],
            "temperature": 0.2,
            "max_tokens": 700,
            "stream": False,
        }
        headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json",
        }

        try:
            response = requests.post(
                self.api_url, headers=headers, json=request_body, timeout=60
            )
            if response.status_code != 200:
                self._warnings.add(
                    f"Copilot LLM request failed with status {response.status_code}."
                )
                return None

            raw_text = response.json()["choices"][0]["message"]["content"]
            parsed = json.loads(self._extract_json(raw_text))
            return self._normalize_response(parsed, source_mode="llm")
        except Exception as exc:
            self._warnings.add(f"Copilot LLM unavailable, fallback engaged: {exc}")
            return None

    def _risk_drivers(self, scores: dict):
        items = []
        if scores.get("focus_level", 5) <= 4:
            items.append("Sustained focus appears low, which may raise inattention burden.")
        if scores.get("hyperactivity", 5) >= 7:
            items.append("Elevated restlessness markers suggest higher hyperactivity strain.")
        if scores.get("impulsiveness", 5) >= 7:
            items.append("Impulsivity signals are elevated and may impact planning consistency.")
        if scores.get("stress_level", 5) >= 7:
            items.append("High stress can amplify executive-function challenges.")
        if scores.get("task_completion", 5) <= 4:
            items.append("Lower task follow-through may indicate executive load.")
        return items[:4]

    def _protective_factors(self, scores: dict):
        factors = []
        if scores.get("attention_span", 5) >= 6:
            factors.append("Attention-span score shows usable concentration capacity.")
        if scores.get("task_completion", 5) >= 6:
            factors.append("Task completion trend suggests workable routine anchors.")
        if scores.get("stress_level", 5) <= 4:
            factors.append("Stress load appears manageable, supporting better regulation.")
        if scores.get("hyperactivity", 5) <= 4:
            factors.append("Hyperactivity level appears relatively controlled.")
        return factors[:4]

    def _iks_alignment(self, severity: str):
        severity = (severity or "").lower()
        if severity == "high":
            return [
                "Use calming breath practices (long exhale, gentle Nadi Shodhana).",
                "Add evening wind-down routine with low stimulation and Yoga Nidra.",
                "Consider clinician-reviewed integration of Ayurveda lifestyle discipline.",
            ]
        if severity == "moderate":
            return [
                "Use structured pranayama breaks between focus sessions.",
                "Pair light movement yoga with fixed daily routine blocks (Dinacharya).",
                "Add brief guided meditation after high-stress periods.",
            ]
        return [
            "Use short mindfulness and posture resets during work blocks.",
            "Maintain stable sleep-wake rhythm with reduced late-night screen exposure.",
            "Blend evidence-based routines with gentle yoga-breathing practices.",
        ]

    def generate_fallback_brief(self, payload: dict):
        severity = payload.get("severity", "Unknown")
        confidence = float(payload.get("confidence", 0.5))
        prediction = payload.get("prediction", "ADHD Screening Result")
        scores = payload.get("behavioral_scores", {}) or {}

        risk_drivers = self._risk_drivers(scores)
        if not risk_drivers:
            risk_drivers = [
                "Current marker pattern is mixed, so risk signals are not strongly concentrated."
            ]

        protective_factors = self._protective_factors(scores)
        if not protective_factors:
            protective_factors = [
                "Baseline responses still provide useful starting points for routine tuning."
            ]

        confidence_percent = round(confidence * 100)
        summary = (
            f"Screening result is {prediction} with approximately {confidence_percent}% "
            f"confidence and {severity} severity pattern."
        )
        confidence_explanation = (
            "Confidence combines behavioral profile signals and optional writing-pattern analysis "
            "when enough journal text is provided."
        )

        next_steps = [
            "Use this report as triage support and discuss findings with a licensed clinician.",
            "Track sleep, stress, and task completion for 2 weeks to validate pattern stability.",
            "Start one low-friction routine intervention and measure change weekly.",
        ]

        red_flags = [
            "Functional decline in school/work or major daily-life disruption.",
            "Persistent sleep collapse, severe anxiety, or emotional dysregulation.",
            "Any self-harm thoughts or crisis symptoms require immediate professional help.",
        ]

        brief = self._normalize_response(
            {
                "summary": summary,
                "confidence_explanation": confidence_explanation,
                "risk_drivers": risk_drivers,
                "protective_factors": protective_factors,
                "next_steps": next_steps,
                "iks_alignment": self._iks_alignment(severity),
                "red_flags": red_flags,
                "disclaimer": (
                    "This copilot brief is for educational screening and wellness guidance only. "
                    "It is not a diagnosis or a substitute for clinical evaluation."
                ),
            },
            source_mode="fallback",
        )
        return brief


copilot_service = CopilotService()
