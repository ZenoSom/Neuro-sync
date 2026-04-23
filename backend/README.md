---
title: ADHD Assessment API
emoji: 🚀
colorFrom: pink
colorTo: indigo
sdk: docker
pinned: false
license: mit
app_port: 7860
---

# ADHD Assessment API - Hybrid CNN+LSTM

This space hosts the backend for the ADHD Assessment project.
- **Backend**: FastAPI
- **Model**: CNN + LSTM Hybrid Neural Network
- **Frontend**: React (Vercel)

## API Endpoints:

- `GET /readiness`: Reports model + LLM readiness and fallback mode warnings.
- `POST /predict`: Submit assessment data for ADHD likelihood prediction.
- `POST /recommend`: Get IKS (Indian Knowledge Systems) recommendations.
- `POST /copilot/brief`: Generate explainable Clinician Co-Pilot narrative (LLM or fallback).
- `GET /health`: Check if the service is running.
