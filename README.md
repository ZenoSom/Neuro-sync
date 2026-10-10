---
title: Neuro Sync
emoji: 🧠
colorFrom: indigo
colorTo: blue
sdk: docker
app_port: 7860
pinned: true
---

# 🧠 ADHD Vision: AI-Powered Neurodivergence Platform

[![Hugging Face Spaces](https://img.shields.io/badge/%F0%9F%A4%97%20Hugging%20Face-Spaces-yellow)](https://huggingface.co/spaces) 
[![Vercel Deployment](https://img.shields.io/badge/Vercel-Deployment-black)](https://vercel.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-v0.100+-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-v19-61DAFB?logo=react)](https://react.dev)

**ADHD Vision** is a full-stack screening and wellness platform designed to bridge the gap in mental health accessibility. It combines Deep Learning with traditional Indian Knowledge Systems (IKS) to give users an ADHD-traits screening indicator and holistic wellness routines.

> ⚠️ **Research prototype. Not a diagnostic or medical device.** Only a trained clinician can diagnose ADHD. If you are concerned, please talk to a doctor or psychologist.

---

## 🔎 Evidence at a Glance

### Who reports on the methods this project builds on

| Organization | What it reports | Link |
|---|---|---|
| **CDC** | The DSM-5 list of 9 inattention and 9 hyperactivity-impulsivity symptoms; symptom-count thresholds (6 or more up to age 16, 5 or more from age 17); the extra criteria (before age 12, two or more settings, clear impact, not better explained by another disorder). States that only trained healthcare providers can diagnose ADHD. | [Clinical Care of ADHD in Children](https://www.cdc.gov/adhd/hcp/clinical-care/index.html) |
| **American Academy of Pediatrics (AAP)** | Clinical practice guideline (2019) for diagnosing, evaluating and treating ADHD in ages 4 to 18: use rating scales, gather reports from several informants, rule out other conditions. | [Pediatrics 2019 guideline (PubMed)](https://pubmed.ncbi.nlm.nih.gov/31570648/) |
| **WHO / Harvard Medical School** | The Adult ADHD Self-Report Scale (ASRS) and its validation against clinician assessments. | [ASRS official page](https://www.hcp.med.harvard.edu/ncs/asrs.php), [DSM-5 validation](https://hcp.hms.harvard.edu/publication/world-health-organization-adult-attention-deficithyperactivity-disorder-self-report), [2005 validation (PubMed)](https://pubmed.ncbi.nlm.nih.gov/15841682/), [screener validity study](https://hcp.hms.harvard.edu/publication/validity-world-health-organization-adult-adhd-self-report-scale-asrs-screener) |
| **NICE (UK)** | Evaluated the QbTest (attention task plus motion tracking) and recommended it only alongside a standard clinical assessment, not on its own. | [NICE briefing MIB318](https://www.nice.org.uk/advice/mib318/chapter/Summary) |
| **US FDA** | Cleared QbTest (2014) as a supplement to clinical assessment; approved the EEG-based NEBA system (2013) for use with a clinician's evaluation. | [QbTest overview](https://www.thecarlatreport.com/the-carlat-child-psychiatry-report/how-helpful-is-computerized-testing-for-adhd), [NEBA review](https://pmc.ncbi.nlm.nih.gov/articles/PMC5135022) |
| **Peer-reviewed meta-analyses** | Accuracy of continuous performance tests (CPTs) and QbTest for identifying ADHD. | [CPT meta-analysis (PubMed)](https://pubmed.ncbi.nlm.nih.gov/37004919/), [QbTest meta-analysis](https://orca.cardiff.ac.uk/161833) |
| **Research task libraries (not certifications)** | The Go/No-Go, Stop-Signal and Flanker tasks are classic research paradigms. PsyToolkit hosts demos and lists the original papers. | [Go/No-Go](https://www.psytoolkit.org/experiment-library/go-no-go.html), [Stop-Signal](https://www.psytoolkit.org/experiment-library/stopsignal.html), [Flanker](https://www.psytoolkit.org/experiment-library/flanker.html) |

### How effective are they?

These figures are reported for **other instruments**, not for this project.

| Method | Reported effectiveness | Source |
|---|---|---|
| ASRS 6-question screener (2005, 154 people) | Sensitivity 68.7%, specificity 99.5% | [PubMed](https://pubmed.ncbi.nlm.nih.gov/15841682/) |
| ASRS, DSM-5 version, general population | Sensitivity 91.4%, specificity 96.0%, PPV 67.3% | [Harvard](https://hcp.hms.harvard.edu/publication/world-health-organization-adult-attention-deficithyperactivity-disorder-self-report) |
| ASRS, DSM-5 version, clinical sample | Sensitivity 91.9%, specificity 74.0%, PPV 82.8% | [Harvard](https://hcp.hms.harvard.edu/publication/world-health-organization-adult-attention-deficithyperactivity-disorder-self-report) |
| ASRS screener vs. clinician diagnosis (health-plan sample) | AUC 0.90 | [Harvard](https://hcp.hms.harvard.edu/publication/validity-world-health-organization-adult-adhd-self-report-scale-asrs-screener) |
| Continuous performance tests, total score (2024 meta-analysis) | Sensitivity 0.75, specificity 0.71; overall AUC 0.7 to 0.8, described as barely acceptable | [PubMed](https://pubmed.ncbi.nlm.nih.gov/37004919/) |
| CPT omission errors / commission errors (same analysis) | Sensitivity 0.63 / 0.59; specificity 0.74 / 0.66 | [PubMed](https://pubmed.ncbi.nlm.nih.gov/37004919/) |
| QbTest | Cleared by the FDA and backed by NICE only as an add-on to a clinical assessment | [NICE](https://www.nice.org.uk/advice/mib318/chapter/Summary) |

**How to read these numbers**
- A questionnaire such as the ASRS performs much better than a game-style attention task. Attention tasks alone are not accurate enough to diagnose ADHD.
- Sensitivity is how many people with ADHD are caught. Specificity is how many people without ADHD are correctly cleared. PPV (precision) depends on how common ADHD is in the group tested: our own calculation shows that a test with 0.75 sensitivity and 0.71 specificity would have only about 12% precision in a general population where about 5% have ADHD.

### How effective is **this** project?

**Not yet measured.** The DSM-5-based questions and the Go/No-Go style tasks have not been validated against clinician diagnoses, and the CNN + LSTM, Random Forest and journal (NLP) analysis have no independent validation. See [Model Performance](#-model-performance-internal-results).

> The official ASRS is copyrighted (WHO, NYU and Harvard). Use it only in its published, unaltered form and link to the official source above.

---

## ✨ Key Features

- **🔬 Hybrid AI Screening:** Dual-model inference using **CNN + LSTM** for linguistic pattern recognition in journals and **Random Forest** for behavioral mapping.
- **🏮 IKS Wellness Engine:** Personalized wellness routines derived from **Ayurveda** and **Yoga** (Yoga, Pranayama, Dinacharya, and Meditative Sleep/Nidra). These support general well-being and are **not** a treatment for ADHD.
- **📉 Behavioral Radar:** High-impact data visualization using `Recharts` to map focus, hyperactivity, and task completion.
- **📄 Digital PDF Reports:** Auto-generated screening summaries that users can bring to a doctor or psychologist.
- **🌌 Cinematic UI/UX:** A bespoke "High-Tech Lab" experience built with glassmorphism, dark-mode kinetics, and `Framer Motion` animations.
- **🐳 Multi-Cloud Deployment:** Productionized via `Docker` on **Hugging Face Spaces** (Backend) and **Vercel** (Frontend).

---

## 🛠️ Technology Stack

### **Machine Learning & AI**
- **Neural Network:** Hybrid CNN + Long Short-Term Memory (LSTM) via **TensorFlow**.
- **Classical ML:** Random Forest Classifier (**Scikit-learn**).
- **NLP:** Optimized tokenization for ADHD-risk linguistic markers.

### **Backend (API)**
- **Framework:** **FastAPI** (Python 3.9+) with asynchronous inference.
- **Documentation:** Automatic Swagger (OpenAPI) generation.
- **Containerization:** **Docker** for standardized ML environment hosting.

### **Frontend (UI)**
- **Framework:** **React 19** with **Vite** (Next-gen bundling).
- **Styling:** **Tailwind CSS v4** (Utility-first, high performance).
- **Interactivity:** **Framer Motion** (Micro-animations and cinematic transitions).
- **Icons & Visuals:** **Lucide React** (HUD-style iconography).

---

## 🚀 Installation & Local Setup

### 1. Clone the Repository
```bash
git clone https://github.com/lucky15426/ADHD.Detection.git
cd ADHD.Detection
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# On Windows
source venv/Scripts/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 📂 Project Architecture

```text
├── backend/
│   ├── main.py                # FastAPI Entry Point
│   ├── predict.py             # Dual-Model Inference Logic
│   ├── model/                 # Saved .h5 and .pkl models
│   └── training/              # Historical Training Logs & Scripts
├── frontend/
│   ├── src/
│   │   ├── components/        # Reusable UI (BackgroundOrbs, etc.)
│   │   ├── pages/             # Landing, Assessment, Results
│   │   └── services/          # API Integration (Axios)
│   └── tailwind.config.js     # Design Tokens
└── Dockerfile                 # Hugging Face Deployment config
```

---

## 📊 Model Performance (internal results)

> ⚠️ **Not clinically validated.**

The models were tested on an internal dataset of ADHD vs. non-ADHD self-reports. The reported result was **~89.4% precision** on a balanced set of linguistic metrics and behavioral scores.

Please read this number with care:
- It is an internal test result. It has not been checked against clinician-confirmed diagnoses and has not been peer reviewed.
- Precision on a balanced test set does not show how the tool would perform on real users, because precision depends on how common ADHD is in the group tested. Recall (sensitivity), specificity, PPV, NPV and AUC should also be reported.
- Dataset details (source, size, how the ADHD labels were assigned, train/test split): _TODO_.

---

## ⚠️ Limitations

- This platform produces a screening indicator. It does not diagnose ADHD.
- ADHD is diagnosed by a trained clinician using the DSM-5 criteria, including onset before age 12, symptoms in two or more settings, impact on functioning, and ruling out other conditions ([CDC](https://www.cdc.gov/adhd/hcp/clinical-care/index.html)).
- Sleep, stress, anxiety, low mood and medication can affect questionnaire and attention-task results.
- Written-text (NLP) analysis has no published clinical validation as an ADHD indicator.
- Wellness routines (Yoga, Pranayama, Ayurveda-based habits) are general well-being support, not a substitute for medical treatment.

---

## 🛡️ License & Disclosure
*This platform is an educational screening tool and is not intended to replace professional psychiatric evaluation. All data is processed for awareness and research purposes.*

**Developed by Team Hierarchy** | Built for the future of Accessible Neuro-Screening Systems.
