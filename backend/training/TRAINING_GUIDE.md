# ADHD Detection - Advanced Model Training & Upgrade Guide

## 🎯 Project Overview

This project implements a **hybrid AI diagnostic system** for ADHD risk detection using:
- **CNN + BiLSTM** neural networks for text analysis (journal entries)
- **Ensemble methods** (Random Forest, Gradient Boosting, XGBoost) for behavioral data
- **Weighted fusion** strategy combining both model outputs
- **3-class classification**: Low Risk, Moderate Risk, High Risk ADHD

## 📊 Dataset Generation

### Generated Dataset Specifications
- **Total Samples**: 8,000 rows
- **Distribution**:
  - Low Risk: 2,800 (35%)
  - Moderate Risk: 2,800 (35%)
  - High Risk ADHD: 2,400 (30%)

### Features
- **Text**: Realistic human-like journal entries with ADHD patterns
- **Behavioral Metrics**:
  - `focus` (1-10): Concentration ability
  - `hyperactivity` (1-10): Activity level
  - `completion` (1-10): Task completion rate

### Data Quality
- 70% synthetic data with realistic templates
- 30% inspired by real-world ADHD behavior patterns
- Paraphrasing via synonym substitution
- No duplicate entries
- Mixed/edge cases for robustness

**Files**:
```
backend/training/
├── adhd_risk_dataset_full.csv        # 8,000 rows
├── adhd_risk_dataset_preview.csv     # 50-row sample
└── generate_adhd_risk_dataset.py     # Generation script
```

## 🧠 Model Architectures

### Version 2.0: Advanced DL Pipeline
**File**: `06_advanced_hybrid_training.py`

**Text Model** (CNN + BiLSTM):
- Embedding layer (100-dim with pre-trained FastText)
- Multi-channel Conv1D (3, 5, 7 kernels)
- BatchNormalization + Dropout (0.3)
- GlobalMaxPooling1D
- Bidirectional LSTM (128 units)
- Dense layers with L1/L2 regularization
- Output: 3-class softmax

**Behavioral Model** (Ensemble):
- Random Forest: 300 trees, max_depth=20
- Gradient Boosting: 200 trees, learning_rate=0.05
- XGBoost/LightGBM (if available)

**Fusion Strategy**:
```
hybrid_score = 0.60 * text_model_score + 0.40 * behavioral_model_score
```

### Version 3.0: Lightweight Rapid Pipeline ⭐
**File**: `07_lightweight_rapid_training.py`

**Text Model** (TF-IDF + Voting Ensemble):
- TfidfVectorizer (200 features, bigrams)
- Voting ensemble:
  - Random Forest (150 trees)
  - Gradient Boosting (150 trees)
  - Logistic Regression

**Behavioral Model** (Voting Ensemble):
- Random Forest (200 trees, max_depth=18)
- Gradient Boosting (200 trees)
- Gaussian Naive Bayes

**Hybrid Model** (Feature Concatenation):
- Combines TF-IDF + Behavioral features
- Random Forest (300 trees) + Gradient Boosting (250 trees)

**Evaluation Metrics**:
- Accuracy, Precision, Recall, F1-Score (weighted)
- Per-class classification report
- Confusion matrix

### Version 4.0: Incremental Learning Pipeline
**File**: `08_incremental_learning.py`

**Features**:
- Active learning (uncertainty identification)
- Hyperparameter optimization via grid search
- Periodic retraining on expanded datasets
- Model versioning with audit trail
- Continuous improvement cycles

## 📈 Training Pipeline

### Step-by-Step Execution

#### 1. Generate Dataset
```bash
python backend/training/generate_adhd_risk_dataset.py
```
Output:
- Full dataset: 8,000 samples
- Preview: 50 samples for validation

#### 2. Train Lightweight Models (Fast)
```bash
python backend/training/07_lightweight_rapid_training.py
```
**Duration**: 5-10 minutes
**Output Models**:
- `adhd_text_ensemble_v3.pkl`
- `adhd_behavioral_ensemble_v3.pkl`
- `adhd_hybrid_ensemble_v3.pkl`
- `adhd_vectorizer_v3.pkl`
- `adhd_scaler_v3.pkl`
- `adhd_metadata_v3.json`

#### 3. Train Advanced DL Models (Slower)
```bash
python backend/training/06_advanced_hybrid_training.py
```
**Duration**: 15-30 minutes
**Requires**: TensorFlow, Keras
**Output Models**:
- `adhd_text_model_v2.h5` (CNN+BiLSTM)
- `adhd_behavioral_ensemble_v2.pkl` (Ensemble)
- `adhd_tokenizer_v2.pkl`
- `adhd_scaler_v2.pkl`
- `adhd_metadata_v2.json`

#### 4. Run Incremental Learning (Optional)
```bash
python backend/training/08_incremental_learning.py
```
**Duration**: 10-20 minutes per cycle
**Output**: Version-updated models with improvement logs

## 🎯 Model Performance Metrics

### Expected Accuracies (on 1,200 test samples)

| Model | Text Accuracy | Behavioral Accuracy | Hybrid Accuracy |
|-------|--------------|-------------------|-----------------|
| **v3.0 (Lightweight)** | 0.82-0.85 | 0.80-0.83 | 0.85-0.88 ⭐ |
| **v2.0 (Advanced DL)** | 0.84-0.87 | 0.82-0.85 | 0.87-0.90 ⭐⭐ |
| **Baseline** | 0.70 | 0.68 | 0.72 |

### Evaluation Metrics Tracked
- **Accuracy**: Overall correct predictions
- **Precision**: True positives / predicted positives
- **Recall**: True positives / actual positives
- **F1-Score**: Harmonic mean of precision & recall
- **AUC-ROC**: Area under the receiver operating characteristic curve
- **Confusion Matrix**: Per-class breakdown

## 🚀 Model Deployment

### Models Available in Backend

**Location**: `backend/model/`

**Latest Models** (choose one):
```
Option 1 (Fast, Lightweight):
  - adhd_text_ensemble_v3.pkl
  - adhd_behavioral_ensemble_v3.pkl
  - adhd_hybrid_ensemble_v3.pkl

Option 2 (Advanced, Higher Accuracy):
  - adhd_text_model_v2.h5
  - adhd_behavioral_ensemble_v2.pkl
  - (Requires TensorFlow)

Option 3 (Legacy, Binary Classification):
  - adhd_model.pkl
```

### Integration with FastAPI Backend

Update `backend/predict.py` to use new models:
```python
# Load v3 models
text_model = joblib.load('model/adhd_text_ensemble_v3.pkl')
behavioral_model = joblib.load('model/adhd_behavioral_ensemble_v3.pkl')
vectorizer = joblib.load('model/adhd_vectorizer_v3.pkl')
scaler = joblib.load('model/adhd_scaler_v3.pkl')

# Make prediction
def predict(text, focus, hyperactivity, completion):
    # Text prediction
    text_features = vectorizer.transform([text]).toarray()
    text_proba = text_model.predict_proba(text_features)[0]
    
    # Behavioral prediction
    behavioral_features = scaler.transform([[focus, hyperactivity, completion]])
    behavioral_proba = behavioral_model.predict_proba(behavioral_features)[0]
    
    # Fusion
    fusion_proba = 0.60 * text_proba + 0.40 * behavioral_proba
    prediction = np.argmax(fusion_proba)
    
    return LABEL_NAMES[prediction], fusion_proba
```

## 💾 Model Persistence & Versioning

### Training Logs
```
backend/model/training_logs/
├── training_log_20260416.jsonl
└── training_log_20260417.jsonl
```

### Metadata Files
Each model version includes metadata:
```json
{
  "version": "3.0",
  "model_type": "ensemble_voting",
  "label_mapping": {
    "Low Risk": 0,
    "Moderate Risk": 1,
    "High Risk ADHD": 2
  },
  "test_accuracy": 0.8642,
  "test_f1": 0.8605,
  "text_weight": 0.60,
  "behavioral_weight": 0.40
}
```

## 🔄 Continuous Improvement Workflow

### Active Learning
- Identify predictions where model confidence < 60%
- Flag these samples for expert review
- Add reviewed samples back to training data

### Periodic Retraining
- Trigger retraining every N new samples (e.g., 500)
- Use StratifiedKFold for cross-validation
- Compare new vs old model performance
- Save new version if F1-Score improves >1%

### Hyperparameter Optimization
- Grid search over key parameters
- Test combinations:
  - n_estimators: [100, 150, 200, 250, 300]
  - max_depth: [15, 18, 20, 25]
  - learning_rate: [0.01, 0.05, 0.1]

### Rollback Strategy
- Keep last 3 model versions
- Roll back if new version underperforms
- Maintain audit trail in training logs

## 📝 Data Pipeline Architecture

```
┌─────────────────────┐
│  Raw Data Input     │
│ (8000 samples)      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Text Preprocessing │
│ • Lower case        │
│ • Remove URLs       │
│ • Tokenize          │
│ • TF-IDF extraction │
└──────────┬──────────┘
           │
           ├─────────────────────────┐
           │                         │
           ▼                         ▼
    ┌────────────┐        ┌──────────────────┐
    │ Text Model │        │ Behavioral Model │
    │ (Ensemble) │        │ (Ensemble)       │
    └────────────┘        └──────────────────┘
           │                         │
           └────────────┬────────────┘
                        │
                        ▼
                ┌────────────────────┐
                │   Fusion Strategy  │
                │  (Weighted Avg)    │
                │  60% + 40% → Pred  │
                └────────────────────┘
                        │
                        ▼
                ┌────────────────────┐
                │  Risk Prediction   │
                │  • Low Risk        │
                │  • Moderate Risk   │
                │  • High Risk ADHD  │
                └────────────────────┘
```

## 🎓 Key Learnings & Best Practices

### Data Quality
✅ Ensure balanced class distribution (35%-35%-30%)
✅ Use realistic data templates + synthetic variations
✅ Remove duplicates and clean empty entries
✅ Stratified splits for train/val/test

### Model Selection
✅ Use ensemble methods for stability
✅ Text → TF-IDF + Linear models (faster)
✅ Text → Neural networks (if VRam available)
✅ Behavioral → Tree-based methods (interpretable)
✅ Fusion → Weighted averaging empirically tuned

### Evaluation
✅ Use stratified K-fold cross-validation
✅ Report per-class metrics (not just overall accuracy)
✅ Monitor confusion matrix for systematic errors
✅ Track F1-Score (balanced metric for imbalanced classes)

### Deployment
✅ Version all models and keep history
✅ Log all training/inference events
✅ Implement monitoring dashboards
✅ Set up alerts for performance degradation

## 📋 Troubleshooting

### Issue: Out of Memory
- Reduce batch size (32 → 16)
- Use incremental training on smaller chunks
- Profile memory with `memory_profiler`

### Issue: Slow Training
- Use v3.0 (lightweight) instead of v2.0
- Reduce ensemble size (e.g., 150 → 100 trees)
- Enable GPU acceleration (if available)

### Issue: Poor Generalization
- Increase validation set size (15% → 25%)
- Add L1/L2 regularization
- Increase dropout rates (0.3 → 0.4)
- Augment training data

## 🔗 Related Files

**Backend**:
- `backend/main.py` - FastAPI entry point
- `backend/predict.py` - Inference logic
- `backend/model_loader.py` - Model management

**Frontend**:
- `frontend/src/pages/AssessmentPage.jsx` - User input form
- `frontend/src/pages/ResultPage.jsx` - Result visualization

**Training**:
- `backend/training/01_scrape_adhd.py` - Data scrapin
- `backend/training/03_cleaning_and_merge.py` - Data merging
- `backend/training/generate_adhd_risk_dataset.py` - Synthetic data generation

---

**Status**: ✅ All training pipelines ready
**Last Updated**: April 16, 2026
