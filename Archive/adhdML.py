# ====================================================================
# ADHD DETECTION - SKLEARN + GENSIM ONLY 
# ====================================================================

import pandas as pd
import numpy as np
import re
import os
import joblib
import matplotlib.pyplot as plt
import seaborn as sns
import warnings
warnings.filterwarnings('ignore')

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.metrics import (
    accuracy_score, f1_score, confusion_matrix, classification_report,
    precision_score, recall_score, roc_auc_score
)

import nltk
nltk.download('stopwords')
nltk.download('wordnet')
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer

from gensim.models import FastText
from gensim.models.keyedvectors import FastTextKeyedVectors

print("="*80)
print("ADHD DETECTION FROM SOCIAL MEDIA TEXT - PRODUCTION VERSION")
print("="*80)

# ====================================================================
# STEP 1: LOAD DATA
# ====================================================================
print("\n" + "="*80)
print("STEP 1: DATASET LOADING")
print("="*80)

df = pd.read_csv('ADHD_VS_NON-ADHD(18+).csv')
print(f"\n✓ Dataset loaded")
print(f"  - Original size: {len(df):,} samples")
print(f"  - Columns: {list(df.columns)}")
print(f"\n✓ Label distribution:")
print(df['label'].value_counts())

# ====================================================================
# STEP 2: TEXT PREPROCESSING
# ====================================================================
print("\n" + "="*80)
print("STEP 2: TEXT PREPROCESSING & CLEANING")
print("="*80)

stop_words = set(stopwords.words('english'))
lemmatizer = WordNetLemmatizer()

def clean_text(text):
    """Comprehensive text cleaning pipeline"""
    if pd.isna(text):
        return ""
    
    text = str(text).lower()
    # Remove URLs
    text = re.sub(r'http\S+|www\S+|https\S+', '', text)
    # Remove Reddit specific patterns
    text = re.sub(r'@\w+|#\w+|r/\w+|u/\w+', '', text)
    # Remove punctuation
    text = re.sub(r'\W', ' ', text)
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    
    # Tokenization
    tokens = text.split()
    # Remove stopwords and short tokens
    tokens = [w for w in tokens if w not in stop_words and len(w) > 2]
    # Lemmatization
    tokens = [lemmatizer.lemmatize(w) for w in tokens]
    
    return ' '.join(tokens)

print("\n✓ Cleaning text...")
df['clean_text'] = df['text'].apply(clean_text)

# Remove duplicates and empty texts
initial_size = len(df)
df = df.drop_duplicates(subset=['clean_text'])
df = df[df['clean_text'].str.strip() != '']

print(f"  - Removed: {initial_size - len(df):,} duplicates/empty samples")
print(f"  - Final size: {len(df):,} samples")

# ====================================================================
# STEP 3: ENCODE LABELS
# ====================================================================
print("\n" + "="*80)
print("STEP 3: LABEL ENCODING")
print("="*80)

label_map = {'ADHD': 1, 'Non-ADHD': 0}
df['label_enc'] = df['label'].map(label_map)
df = df.dropna(subset=['label_enc'])

X = df['clean_text'].values
y = df['label_enc'].values

adhd_count = np.sum(y)
non_adhd_count = len(y) - adhd_count

print(f"\n✓ Labels encoded:")
print(f"  - ADHD (1): {adhd_count:,} samples ({adhd_count/len(y)*100:.1f}%)")
print(f"  - Non-ADHD (0): {non_adhd_count:,} samples ({non_adhd_count/len(y)*100:.1f}%)")

# ====================================================================
# STEP 4: TRAIN-TEST SPLIT
# ====================================================================
print("\n" + "="*80)
print("STEP 4: TRAIN-TEST SPLIT")
print("="*80)

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, stratify=y, random_state=42
)

print(f"\n✓ Data split (80:20):")
print(f"  - Train set: {len(X_train):,} samples")
print(f"  - Test set: {len(X_test):,} samples")

# ====================================================================
# STEP 5: FASTTEXT EMBEDDINGS
# ====================================================================
print("\n" + "="*80)
print("STEP 5: TRAINING FASTTEXT EMBEDDINGS")
print("="*80)

sentences_train = [text.split() for text in X_train]

print("\n✓ Training FastText model...")
fasttext_model = FastText(
    sentences=sentences_train,
    vector_size=100,
    window=5,
    min_count=2,
    sg=1,  # Skip-gram
    epochs=15,
    workers=4
)

vocab_size = len(fasttext_model.wv)
print(f"\n✓ FastText model trained:")
print(f"  - Vocabulary size: {vocab_size:,} words")
print(f"  - Vector size: {fasttext_model.vector_size} dimensions")
print(f"  - Training epochs: 15")

# ====================================================================
# STEP 6: CREATE FASTTEXT AVERAGED VECTORS
# ====================================================================
print("\n" + "="*80)
print("STEP 6: CREATING FASTTEXT AVERAGED VECTORS")
print("="*80)

def get_fasttext_vector(text, model, vector_size=100):
    """Get averaged FastText vector for a text"""
    words = text.split()
    vectors = [model.wv[word] for word in words if word in model.wv]
    
    if len(vectors) == 0:
        return np.zeros(vector_size)
    
    return np.mean(vectors, axis=0)

print("\n✓ Converting texts to FastText vectors...")
X_train_ft = np.array([get_fasttext_vector(text, fasttext_model) for text in X_train])
X_test_ft = np.array([get_fasttext_vector(text, fasttext_model) for text in X_test])

print(f"  - Train vectors shape: {X_train_ft.shape}")
print(f"  - Test vectors shape: {X_test_ft.shape}")

# ====================================================================
# MODEL 1: TF-IDF + LOGISTIC REGRESSION
# ====================================================================
print("\n" + "="*80)
print("MODEL 1: TF-IDF + LOGISTIC REGRESSION")
print("="*80)

print("\n✓ Training TF-IDF + LogisticRegression...")
vectorizer = TfidfVectorizer(
    max_features=10000,
    min_df=5,
    max_df=0.8,
    ngram_range=(1, 2),
    sublinear_tf=True
)
X_train_tfidf = vectorizer.fit_transform(X_train)
X_test_tfidf = vectorizer.transform(X_test)

clf_tfidf = LogisticRegression(
    max_iter=1000,
    random_state=42,
    class_weight='balanced',
    n_jobs=-1
)
clf_tfidf.fit(X_train_tfidf, y_train)

y_pred_tfidf = clf_tfidf.predict(X_test_tfidf)
y_pred_tfidf_proba = clf_tfidf.predict_proba(X_test_tfidf)[:, 1]

acc_tfidf = accuracy_score(y_test, y_pred_tfidf)
prec_tfidf = precision_score(y_test, y_pred_tfidf)
rec_tfidf = recall_score(y_test, y_pred_tfidf)
f1_tfidf = f1_score(y_test, y_pred_tfidf)
auc_tfidf = roc_auc_score(y_test, y_pred_tfidf_proba)

print(f"\n✓ Results:")
print(f"  - Accuracy:  {acc_tfidf:.4f}")
print(f"  - Precision: {prec_tfidf:.4f}")
print(f"  - Recall:    {rec_tfidf:.4f}")
print(f"  - F1-Score:  {f1_tfidf:.4f}")
print(f"  - ROC-AUC:   {auc_tfidf:.4f}")

cm_tfidf = confusion_matrix(y_test, y_pred_tfidf)
print(f"\n  - Confusion Matrix:")
print(f"    True Negatives:  {cm_tfidf[0,0]}")
print(f"    False Positives: {cm_tfidf[0,1]}")
print(f"    False Negatives: {cm_tfidf[1,0]}")
print(f"    True Positives:  {cm_tfidf[1,1]}")

# Collect all confusion matrices in order (index matches results list)
all_cms = [cm_tfidf]

results = [{
    'Model': 'TF-IDF + Logistic Regression',
    'Accuracy': acc_tfidf,
    'Precision': prec_tfidf,
    'Recall': rec_tfidf,
    'F1-Score': f1_tfidf,
    'ROC-AUC': auc_tfidf
}]

# ====================================================================
# MODEL 2: TF-IDF + SVM
# ====================================================================
print("\n" + "="*80)
print("MODEL 2: TF-IDF + SUPPORT VECTOR MACHINE (SVM)")
print("="*80)

print("\n✓ Training TF-IDF + SVM...")
clf_svm = SVC(
    kernel='rbf',
    C=1.0,
    probability=True,
    class_weight='balanced',
    random_state=42
)
clf_svm.fit(X_train_tfidf, y_train)

y_pred_svm = clf_svm.predict(X_test_tfidf)
y_pred_svm_proba = clf_svm.predict_proba(X_test_tfidf)[:, 1]

acc_svm = accuracy_score(y_test, y_pred_svm)
prec_svm = precision_score(y_test, y_pred_svm)
rec_svm = recall_score(y_test, y_pred_svm)
f1_svm = f1_score(y_test, y_pred_svm)
auc_svm = roc_auc_score(y_test, y_pred_svm_proba)

print(f"\n✓ Results:")
print(f"  - Accuracy:  {acc_svm:.4f}")
print(f"  - Precision: {prec_svm:.4f}")
print(f"  - Recall:    {rec_svm:.4f}")
print(f"  - F1-Score:  {f1_svm:.4f}")
print(f"  - ROC-AUC:   {auc_svm:.4f}")

cm_svm = confusion_matrix(y_test, y_pred_svm)
all_cms.append(cm_svm)

results.append({
    'Model': 'TF-IDF + SVM',
    'Accuracy': acc_svm,
    'Precision': prec_svm,
    'Recall': rec_svm,
    'F1-Score': f1_svm,
    'ROC-AUC': auc_svm
})

# ====================================================================
# MODEL 3: TF-IDF + RANDOM FOREST
# ====================================================================
print("\n" + "="*80)
print("MODEL 3: TF-IDF + RANDOM FOREST")
print("="*80)

print("\n✓ Training TF-IDF + RandomForest...")
clf_rf = RandomForestClassifier(
    n_estimators=100,
    max_depth=20,
    class_weight='balanced',
    random_state=42,
    n_jobs=-1
)
clf_rf.fit(X_train_tfidf, y_train)

y_pred_rf = clf_rf.predict(X_test_tfidf)
y_pred_rf_proba = clf_rf.predict_proba(X_test_tfidf)[:, 1]

acc_rf = accuracy_score(y_test, y_pred_rf)
prec_rf = precision_score(y_test, y_pred_rf)
rec_rf = recall_score(y_test, y_pred_rf)
f1_rf = f1_score(y_test, y_pred_rf)
auc_rf = roc_auc_score(y_test, y_pred_rf_proba)

print(f"\n✓ Results:")
print(f"  - Accuracy:  {acc_rf:.4f}")
print(f"  - Precision: {prec_rf:.4f}")
print(f"  - Recall:    {rec_rf:.4f}")
print(f"  - F1-Score:  {f1_rf:.4f}")
print(f"  - ROC-AUC:   {auc_rf:.4f}")

cm_rf = confusion_matrix(y_test, y_pred_rf)
all_cms.append(cm_rf)

results.append({
    'Model': 'TF-IDF + Random Forest',
    'Accuracy': acc_rf,
    'Precision': prec_rf,
    'Recall': rec_rf,
    'F1-Score': f1_rf,
    'ROC-AUC': auc_rf
})

# ====================================================================
# MODEL 4: FastText + LOGISTIC REGRESSION
# ====================================================================
print("\n" + "="*80)
print("MODEL 4: FASTTEXT VECTORS + LOGISTIC REGRESSION")
print("="*80)

print("\n✓ Training FastText + LogisticRegression...")
clf_ft_lr = LogisticRegression(
    max_iter=1000,
    random_state=42,
    class_weight='balanced'
)
clf_ft_lr.fit(X_train_ft, y_train)

y_pred_ft_lr = clf_ft_lr.predict(X_test_ft)
y_pred_ft_lr_proba = clf_ft_lr.predict_proba(X_test_ft)[:, 1]

acc_ft_lr = accuracy_score(y_test, y_pred_ft_lr)
prec_ft_lr = precision_score(y_test, y_pred_ft_lr)
rec_ft_lr = recall_score(y_test, y_pred_ft_lr)
f1_ft_lr = f1_score(y_test, y_pred_ft_lr)
auc_ft_lr = roc_auc_score(y_test, y_pred_ft_lr_proba)

print(f"\n✓ Results:")
print(f"  - Accuracy:  {acc_ft_lr:.4f}")
print(f"  - Precision: {prec_ft_lr:.4f}")
print(f"  - Recall:    {rec_ft_lr:.4f}")
print(f"  - F1-Score:  {f1_ft_lr:.4f}")
print(f"  - ROC-AUC:   {auc_ft_lr:.4f}")

cm_ft_lr = confusion_matrix(y_test, y_pred_ft_lr)
all_cms.append(cm_ft_lr)

results.append({
    'Model': 'FastText + Logistic Regression',
    'Accuracy': acc_ft_lr,
    'Precision': prec_ft_lr,
    'Recall': rec_ft_lr,
    'F1-Score': f1_ft_lr,
    'ROC-AUC': auc_ft_lr
})

# ====================================================================
# MODEL 5: FastText + SVM
# ====================================================================
print("\n" + "="*80)
print("MODEL 5: FASTTEXT VECTORS + SVM")
print("="*80)

print("\n✓ Training FastText + SVM...")
clf_ft_svm = SVC(
    kernel='rbf',
    probability=True,
    class_weight='balanced',
    random_state=42
)
clf_ft_svm.fit(X_train_ft, y_train)

y_pred_ft_svm = clf_ft_svm.predict(X_test_ft)
y_pred_ft_svm_proba = clf_ft_svm.predict_proba(X_test_ft)[:, 1]

acc_ft_svm = accuracy_score(y_test, y_pred_ft_svm)
prec_ft_svm = precision_score(y_test, y_pred_ft_svm)
rec_ft_svm = recall_score(y_test, y_pred_ft_svm)
f1_ft_svm = f1_score(y_test, y_pred_ft_svm)
auc_ft_svm = roc_auc_score(y_test, y_pred_ft_svm_proba)

print(f"\n✓ Results:")
print(f"  - Accuracy:  {acc_ft_svm:.4f}")
print(f"  - Precision: {prec_ft_svm:.4f}")
print(f"  - Recall:    {rec_ft_svm:.4f}")
print(f"  - F1-Score:  {f1_ft_svm:.4f}")
print(f"  - ROC-AUC:   {auc_ft_svm:.4f}")

cm_ft_svm = confusion_matrix(y_test, y_pred_ft_svm)
all_cms.append(cm_ft_svm)

results.append({
    'Model': 'FastText + SVM',
    'Accuracy': acc_ft_svm,
    'Precision': prec_ft_svm,
    'Recall': rec_ft_svm,
    'F1-Score': f1_ft_svm,
    'ROC-AUC': auc_ft_svm
})

# ====================================================================
# RESULTS COMPARISON
# ====================================================================
print("\n" + "="*80)
print("COMPREHENSIVE RESULTS COMPARISON")
print("="*80)

results_df = pd.DataFrame(results)
print("\n" + results_df.to_string(index=False))

# Find best model
best_idx = results_df['Accuracy'].idxmax()
best_model = results_df.iloc[best_idx]
print(f"\n✓ BEST MODEL: {best_model['Model']}")
print(f"  - Accuracy: {best_model['Accuracy']:.4f}")

# Select the confusion matrix for the best model (safe regardless of which model wins)
cm_best = all_cms[best_idx]

results_df.to_csv('adhd_detection_results.csv', index=False)
print(f"\n✓ Results saved to: adhd_detection_results.csv")

# ====================================================================
# STEP 8: EXPORT BEST MODEL FOR API
# ====================================================================
print("\n" + "="*80)
print("STEP 8: EXPORTING BEST MODEL")
print("="*80)

export_dir = os.path.join('backend', 'model', 'text_model')
os.makedirs(export_dir, exist_ok=True)

# Determine best TF-IDF model among the first 3 (since FT models need FT vectors)
tfidf_results = results_df[results_df['Model'].str.contains('TF-IDF')]
best_tfidf_idx = tfidf_results['Accuracy'].idxmax()
best_tfidf_model_name = results_df.iloc[best_tfidf_idx]['Model']

print(f"\n✓ Exporting Best TF-IDF Model: {best_tfidf_model_name}")

if best_tfidf_idx == 0:
    joblib.dump(clf_tfidf, os.path.join(export_dir, 'adhd_classifier.pkl'))
elif best_tfidf_idx == 1:
    joblib.dump(clf_svm, os.path.join(export_dir, 'adhd_classifier.pkl'))
elif best_tfidf_idx == 2:
    joblib.dump(clf_rf, os.path.join(export_dir, 'adhd_classifier.pkl'))

joblib.dump(vectorizer, os.path.join(export_dir, 'tfidf_vectorizer.pkl'))

# Save metadata
metadata = {
    'model_name': best_tfidf_model_name,
    'accuracy': float(results_df.iloc[best_tfidf_idx]['Accuracy']),
    'type': 'classical_tfidf'
}
with open(os.path.join(export_dir, 'metadata.json'), 'w') as f:
    import json
    json.dump(metadata, f)

print(f"✓ Model and Vectorizer saved to {export_dir}")

# ====================================================================
# VISUALIZATIONS
# ====================================================================
print("\n" + "="*80)
print("GENERATING VISUALIZATIONS")
print("="*80)

fig, axes = plt.subplots(2, 2, figsize=(15, 12))

# Plot 1: Accuracy Comparison
ax1 = axes[0, 0]
colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#F8D62E']
bars = ax1.barh(results_df['Model'], results_df['Accuracy'], color=colors, alpha=0.8)
ax1.set_xlabel('Accuracy', fontweight='bold', fontsize=11)
ax1.set_title('Model Accuracy Comparison', fontweight='bold', fontsize=12)
ax1.set_xlim([0.85, 1.0])
for i, v in enumerate(results_df['Accuracy']):
    ax1.text(v + 0.003, i, f'{v:.4f}', va='center', fontweight='bold', fontsize=9)

# Plot 2: Comprehensive Metrics
ax2 = axes[0, 1]
x = np.arange(len(results_df))
width = 0.15
ax2.bar(x - 2*width, results_df['Accuracy'], width, label='Accuracy', alpha=0.8)
ax2.bar(x - width, results_df['Precision'], width, label='Precision', alpha=0.8)
ax2.bar(x, results_df['Recall'], width, label='Recall', alpha=0.8)
ax2.bar(x + width, results_df['F1-Score'], width, label='F1-Score', alpha=0.8)
ax2.bar(x + 2*width, results_df['ROC-AUC'], width, label='ROC-AUC', alpha=0.8)
ax2.set_ylabel('Score', fontweight='bold', fontsize=11)
ax2.set_title('All Metrics Comparison', fontweight='bold', fontsize=12)
ax2.set_xticks(x)
ax2.set_xticklabels([f'M{i+1}' for i in range(len(results_df))], fontsize=9)
ax2.legend(fontsize=8)
ax2.set_ylim([0.85, 1.0])
ax2.grid(axis='y', alpha=0.3)

# Plot 3: Confusion Matrix (Best Model)
ax3 = axes[1, 0]
sns.heatmap(cm_best, annot=True, fmt='d', cmap='Blues', ax=ax3, cbar=False,
            xticklabels=['Non-ADHD', 'ADHD'], yticklabels=['Non-ADHD', 'ADHD'])
ax3.set_title(f'Confusion Matrix - {best_model["Model"]}', fontweight='bold', fontsize=12)
ax3.set_ylabel('Actual', fontweight='bold', fontsize=11)
ax3.set_xlabel('Predicted', fontweight='bold', fontsize=11)

# Plot 4: ROC-AUC Comparison
ax4 = axes[1, 1]
bars = ax4.barh(results_df['Model'], results_df['ROC-AUC'], color=colors, alpha=0.8)
ax4.set_xlabel('ROC-AUC Score', fontweight='bold', fontsize=11)
ax4.set_title('ROC-AUC Comparison', fontweight='bold', fontsize=12)
ax4.set_xlim([0.85, 1.0])
for i, v in enumerate(results_df['ROC-AUC']):
    ax4.text(v + 0.003, i, f'{v:.4f}', va='center', fontweight='bold', fontsize=9)

plt.tight_layout()
plt.savefig('adhd_detection_comparison.png', dpi=300, bbox_inches='tight')
print("✓ Visualization saved: adhd_detection_comparison.png")

print("\n" + "="*80)
print("✓✓✓ ANALYSIS COMPLETE! ✓✓✓")
print("="*80)
print(f"\nOutput files:")
print(f"  1. adhd_detection_results.csv - Results table")
print(f"  2. adhd_detection_comparison.png - Comparison chart")
print("\nReady for research paper publication!")
