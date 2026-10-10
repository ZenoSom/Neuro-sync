import json
import re
import os
import requests
from dotenv import load_dotenv

load_dotenv()

class IKSRecommender:
    def __init__(self):
        # OpenAI-compatible chat completions via HF Router
        self.api_url = "https://router.huggingface.co/v1/chat/completions"
        self.cache = {}
        self._warnings = set()
        
        # Load credentials and model config
        env_config = self._load_config()
        self.api_token = env_config.get("token")
        self.model = env_config.get("model", "meta-llama/Llama-3.1-8B-Instruct")
        
        if not self.api_token:
            self._warnings.add("HF_TOKEN missing for IKS recommender. Static fallback mode is active.")
            print("\n" + "!"*50)
            print("WARNING: HF_TOKEN missing in .env file.")
            print("IKS Recommendations will use STATIC FALLBACK mode.")
            print("!"*50 + "\n")
        else:
            masked = f"{self.api_token[:4]}...{self.api_token[-4:]}"
            print(f"IKS Recommender initialized with token: {masked}")

    def is_llm_available(self):
        return bool(self.api_token)

    def get_status_warnings(self):
        return sorted(self._warnings)

    def _load_config(self):
        """Loads configuration from .env file directly."""
        config = {"token": None, "model": None}
        try:
            env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
            if os.path.exists(env_path):
                with open(env_path, "r") as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith("#"):
                            continue
                        if "=" in line:
                            key, val = line.split("=", 1)
                            key = key.strip()
                            val = val.strip()
                            if key in ["HF_TOKEN", "HUGGINGFACE_API_KEY"]:
                                config["token"] = val
                            elif key == "LLM_MODEL":
                                config["model"] = val
        except Exception as e:
            print(f"Error reading .env file: {e}")
        
        # Fallback to current environment variables
        if not config["token"]:
            config["token"] = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_API_KEY")
        if not config["model"]:
            config["model"] = os.getenv("LLM_MODEL")
            
        return config

    def generate_iks_recommendations(self, user_data: dict):
        """
        Generates traditional wellness recommendations via HF Inference API.
        Falls back to severity-based static data if the API is unavailable.
        """
        severity = user_data.get("severity", "Unknown")
        focus = user_data.get("focus", 5)
        hyperactivity = user_data.get("hyperactivity", 5)
        sleep = user_data.get("sleep", 7)
        stress = user_data.get("stress", 5)

        cache_key = f"{severity}_{focus}_{hyperactivity}_{sleep}_{stress}"
        if cache_key in self.cache:
            print(f"Returning cached IKS recommendations for: {cache_key}")
            return self.cache[cache_key]

        if not self.api_token:
            return self._get_fallback_recommendations(severity)

        user_prompt = f"""You are an expert in Indian Knowledge Systems (IKS), including Yoga, Ayurveda, and Meditation.
Based on the following ADHD assessment data, provide traditional wellness recommendations:
- ADHD Severity: {severity}
- Focus Score (1-10): {focus}
- Hyperactivity Score (1-10): {hyperactivity}
- Sleep Quality (Hours): {sleep}
- Stress Level (1-10): {stress}

Requirements:
1. Suggest specific Yoga asanas for focus and grounding.
2. Suggest Pranayama (breathing) techniques.
3. Suggest Meditation practices.
4. Suggest Ayurvedic Herbs (like Brahmi, Ashwagandha) suitable for these symptoms.
5. Suggest Lifestyle recommendations based on Dinacharya (daily routine).

Format your response EXACTLY as a JSON object with these keys: 
"yoga", "pranayama", "meditation", "herbs", "lifestyle", "note".
The "note" should be a disclaimer that these are traditional wellness practices and not medical prescriptions, inspired by traditions like Charaka Samhita and Yoga Sutras.
Each value should be a list of 2-3 specific suggestions."""

        payload = {
            "model": self.model,
            "messages": [{"role": "user", "content": user_prompt}],
            "max_tokens": 500,
            "temperature": 0.1,  # Lower temperature for more consistent JSON structure
            "stream": False
        }

        headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json"
        }

        print(f"Requesting AI recommendations for {severity} ADHD...")

        try:
            response = requests.post(self.api_url, headers=headers, json=payload, timeout=60)
            
            if response.status_code == 200:
                data = response.json()
                response_text = data["choices"][0]["message"]["content"]
                
                # Robust JSON extraction:
                # 1. Try to find content within ```json ... ``` or ``` ... ```
                # 2. Otherwise try to find content within the first { and last }
                clean_json = response_text
                code_block_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", response_text, re.DOTALL)
                if code_block_match:
                    clean_json = code_block_match.group(1)
                else:
                    json_match = re.search(r"\{.*\}", response_text, re.DOTALL)
                    if json_match:
                        clean_json = json_match.group()

                try:
                    result = json.loads(clean_json)
                    self.cache[cache_key] = result
                    print(f"Success: AI generated recommendations for {severity} severity.")
                    return result
                except json.JSONDecodeError as je:
                    print(f"JSON Parse Error: {je}")
                    print(f"--- RAW RESPONSE START ---\n{response_text}\n--- RAW RESPONSE END ---")
                    return self._get_fallback_recommendations(severity)
            else:
                print(f"API Error: {response.status_code} - {response.text[:300]}")
                return self._get_fallback_recommendations(severity)

        except requests.exceptions.Timeout:
            print("API Timeout (60s). Model may be loading. Try again in a moment.")
            return self._get_fallback_recommendations(severity)
        except Exception as e:
            print(f"API Exception: {e}")
            return self._get_fallback_recommendations(severity)

    def _get_fallback_recommendations(self, severity):
        """Fallback in case of API failure, tailored by severity."""
        print(f"Using STATIC FALLBACK for {severity} severity (AI currently unavailable).")
        if severity == "Low":
            return {
                "yoga": ["Tadasana (Mountain Pose)", "Balasana (Child's Pose)"],
                "pranayama": ["Deep Belly Breathing", "Anulom Vilom"],
                "meditation": ["5-minute Mindfulness", "Breath Awareness"],
                "herbs": ["Tulsi (Holy Basil)"],
                "lifestyle": ["Maintain a regular sleep schedule", "Reduce screen time before bed"],
                "note": "Disclaimer: Traditional wellness suggestions based on IKS for Low severity. Consult a professional for medical advice."
            }
        elif severity == "Mild":
            return {
                "yoga": ["Vrikshasana (Tree Pose)", "Paschimottanasana (Seated Forward Bend)"],
                "pranayama": ["Nadi Shodhana (Alternate Nostril Breathing)"],
                "meditation": ["Trataka (Candle Gazing)", "Guided Relaxation"],
                "herbs": ["Brahmi (Water Hyssop)"],
                "lifestyle": ["Incorporate light daily exercise", "Practice daily journaling"],
                "note": "Disclaimer: Traditional wellness suggestions based on IKS for Mild severity. Consult a professional for medical advice."
            }
        elif severity == "Moderate":
            return {
                "yoga": ["Virabhadrasana (Warrior Pose)", "Sarvangasana (Shoulder Stand)"],
                "pranayama": ["Bhramari (Humming Bee Breath)", "Sheetali (Cooling Breath)"],
                "meditation": ["Vipassana Meditation", "Yoga Nidra"],
                "herbs": ["Ashwagandha (Indian Ginseng)", "Brahmi"],
                "lifestyle": ["Follow a strict Dinacharya (daily routine)", "Oil massage (Abhyanga) weekly"],
                "note": "Disclaimer: Traditional wellness suggestions based on IKS for Moderate severity. Consult a professional for medical advice."
            }
        elif severity == "High":
            return {
                "yoga": ["Shavasana (Corpse Pose)", "Viparita Karani (Legs Up the Wall)"],
                "pranayama": ["Ujjayi (Ocean Breath)", "Prolonged Nadi Shodhana"],
                "meditation": ["Mantra Chanting (Om)", "Deep Guided Yoga Nidra"],
                "herbs": ["Ashwagandha", "Jatamansi", "Shankhpushpi"],
                "lifestyle": ["Seek professional Ayurvedic consultation", "Strictly limit sensory overload and stimulants"],
                "note": "Disclaimer: Traditional wellness suggestions based on IKS for High severity. Please consult a healthcare professional."
            }
        else:
            return {
                "yoga": ["Tadasana (Mountain Pose)", "Vrikshasana (Tree Pose)"],
                "pranayama": ["Nadi Shodhana", "Bhramari"],
                "meditation": ["Trataka (Candle Gazing)", "Mindfulness"],
                "herbs": ["Brahmi", "Ashwagandha"],
                "lifestyle": ["Early to bed, early to rise", "Oil massage (Abhyanga)"],
                "note": "Disclaimer: Traditional wellness suggestions based on IKS. Consult a professional for medical advice."
            }

# Global singleton instance
recommender = IKSRecommender()

