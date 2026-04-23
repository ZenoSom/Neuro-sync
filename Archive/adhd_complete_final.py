# ============================================================
# DEPRECATED — use adhd_deeplearning.py instead
#
# This script has been superseded by adhd_deeplearning.py which
# consolidates all 3 old DL scripts into one clean canonical file.
# You can safely delete this file once adhd_deeplearning.py works.
# ============================================================

# ====================================================================
# ADHD DETECTION - COMPLETE SOLUTION
# CNN + LSTM + FastText Embeddings
# ====================================================================

import pandas as pd
import numpy as np
import re
import matplotlib.pyplot as plt
import seaborn as sns
import warnings
warnings.filterwarnings('ignore')

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score, f1_score, confusion_matrix, classification_report,
    precision_score, recall_score, roc_auc_score
)

import nltk
nltk.download('stopwords', quiet=True)
nltk.download('wordnet', quiet=True)
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer

from gensim.models import FastText

print("\n" + "="*80)
print("ADHD DETECTION - COMPLETE DEEP LEARNING SOLUTION")
print("="*80 + "\n")

# ==== STEP 1: Load Data ====
print("STEP 1: LOADING DATASET")
print("-" * 80)
df = pd.read_csv('adhd_vs_nonadhd_18+combined.csv')
print(f"✓ Dataset loaded: {len(df):,} samples")
print(f"  Labels: {df['label'].value_counts().to_dict()}\n")

# ==== STEP 2: Text Preprocessing ====
print("STEP 2: TEXT PREPROCESSING")
print("-" * 80)
stop_words = set(stopwords.words('english'))
lemmatizer = WordNetLemmatizer()

def clean_text(text):
    if pd.isna(text):
        return ""
    text = str(text).lower()
    text = re.sub(r'http\S+|www\S+|https\S+', '', text)
    text = re.sub(r'@\w+|#\w+|r/\w+|u/\w+', '', text)
    text = re.sub(r'\W', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    tokens = text.split()
    tokens = [w for w in tokens if w not in stop_words and len(w) > 2]
    tokens = [lemmatizer.lemmatize(w) for w in tokens]
    return ' '.join(tokens)

df['clean_text'] = df['text'].apply(clean_text)
initial = len(df)
df = df.drop_duplicates(subset=['clean_text'])
df = df[df['clean_text'].str.strip() != '']
print(f"✓ Removed {initial - len(df):,} duplicates/empty samples")
print(f"✓ Final dataset: {len(df):,} samples\n")

# ==== STEP 3: Label Encoding ====
print("STEP 3: LABEL ENCODING")
print("-" * 80)
label_map = {'ADHD': 1, 'Non-ADHD': 0}
df['label_enc'] = df['label'].map(label_map)
df = df.dropna(subset=['label_enc'])
X = df['clean_text'].values
y = df['label_enc'].values
print(f"✓ ADHD samples: {np.sum(y):,}")
print(f"✓ Non-ADHD samples: {len(y) - np.sum(y):,}\n")

# ==== STEP 4: Train-Test Split ====
print("STEP 4: DATA SPLITTING (80:20)")
print("-" * 80)
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, stratify=y, random_state=42
)
print(f"✓ Train: {len(X_train):,} | Test: {len(X_test):,}\n")

# ==== STEP 5: FastText Embeddings ====
print("STEP 5: TRAINING FASTTEXT EMBEDDINGS")
print("-" * 80)
sentences = [text.split() for text in X_train]
ft_model = FastText(
    sentences=sentences,
    vector_size=128,
    window=5,
    min_count=2,
    sg=1,
    epochs=20,
    workers=4
)
print(f"✓ FastText trained:")
print(f"  - Vocabulary: {len(ft_model.wv):,} words")
print(f"  - Vector size: 128 dimensions\n")

# ==== STEP 6: Baseline Model ====
print("STEP 6: BASELINE MODEL (TF-IDF + LogReg)")
print("-" * 80)
vectorizer = TfidfVectorizer(max_features=10000, min_df=5, max_df=0.8, ngram_range=(1, 2))
X_train_tfidf = vectorizer.fit_transform(X_train)
X_test_tfidf = vectorizer.transform(X_test)

clf = LogisticRegression(max_iter=1000, random_state=42, class_weight='balanced')
clf.fit(X_train_tfidf, y_train)
y_pred_base = clf.predict(X_test_tfidf)
y_pred_base_proba = clf.predict_proba(X_test_tfidf)[:, 1]

acc_base = accuracy_score(y_test, y_pred_base)
prec_base = precision_score(y_test, y_pred_base)
rec_base = recall_score(y_test, y_pred_base)
f1_base = f1_score(y_test, y_pred_base)
auc_base = roc_auc_score(y_test, y_pred_base_proba)

print(f"✓ Baseline Results:")
print(f"  Accuracy:  {acc_base:.4f}")
print(f"  Precision: {prec_base:.4f}")
print(f"  Recall:    {rec_base:.4f}")
print(f"  F1-Score:  {f1_base:.4f}")
print(f"  ROC-AUC:   {auc_base:.4f}\n")

baseline_res = {
    'model': 'TF-IDF + LogReg',
    'accuracy': acc_base,
    'precision': prec_base,
    'recall': rec_base,
    'f1': f1_base,
    'roc_auc': auc_base
}

# ==== STEP 7: Deep Learning Setup ====
print("STEP 7: PREPARING DEEP LEARNING DATA")
print("-" * 80)

import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

try:
    from keras.preprocessing.text import Tokenizer
    from keras.preprocessing.sequence import pad_sequences
    from keras.models import Sequential
    from keras.layers import Embedding, Conv1D, MaxPooling1D, LSTM, Dense, Dropout, Bidirectional
    from keras.optimizers import Adam
    from keras.callbacks import EarlyStopping
    print("✓ Keras imported successfully")
except:
    try:
        from tensorflow.keras.preprocessing.text import Tokenizer
        from tensorflow.keras.preprocessing.sequence import pad_sequences
        from tensorflow.keras.models import Sequential
        from tensorflow.keras.layers import Embedding, Conv1D, MaxPooling1D, LSTM, Dense, Dropout, Bidirectional
        from tensorflow.keras.optimizers import Adam
        from tensorflow.keras.callbacks import EarlyStopping
        print("✓ TensorFlow.Keras imported successfully")
    except Exception as e:
        print(f"✗ Error importing Keras: {e}")
        print("  Please install: pip install tensorflow")
        exit(1)

max_features = 10000
maxlen = 100
embedding_dim = 128

# Tokenization and padding
tokenizer = Tokenizer(num_words=max_features)
tokenizer.fit_on_texts(X_train)

X_train_seq = tokenizer.texts_to_sequences(X_train)
X_test_seq = tokenizer.texts_to_sequences(X_test)

X_train_pad = pad_sequences(X_train_seq, maxlen=maxlen)
X_test_pad = pad_sequences(X_test_seq, maxlen=maxlen)

print(f"✓ Sequences prepared: {X_train_pad.shape}\n")

# Create FastText embedding matrix
print("STEP 8: CREATING FASTTEXT EMBEDDING MATRIX")
print("-" * 80)
embedding_matrix = np.zeros((max_features, embedding_dim))

for word, idx in tokenizer.word_index.items():
    if idx < max_features:
        if word in ft_model.wv:
            embedding_matrix[idx] = ft_model.wv[word]
        else:
            embedding_matrix[idx] = np.random.randn(embedding_dim) * 0.01

print(f"✓ Embedding matrix created: {embedding_matrix.shape}\n")

# ==== STEP 9: CNN + LSTM Model ====
print("STEP 9: BUILDING CNN + LSTM MODEL")
print("-" * 80)

model = Sequential([
    # Embedding layer with FastText
    Embedding(
        input_dim=max_features,
        output_dim=embedding_dim,
        weights=[embedding_matrix],
        input_length=maxlen,
        trainable=False
    ),
    Dropout(0.25),
    
    # First CNN block
    Conv1D(256, 3, activation='relu', padding='same'),
    Conv1D(256, 5, activation='relu', padding='same'),
    MaxPooling1D(pool_size=2),
    Dropout(0.25),
    
    # Second CNN block
    Conv1D(128, 3, activation='relu', padding='same'),
    Conv1D(128, 5, activation='relu', padding='same'),
    MaxPooling1D(pool_size=2),
    Dropout(0.25),
    
    # Bidirectional LSTM
    Bidirectional(LSTM(64, dropout=0.2, recurrent_dropout=0.2)),
    
    # Dense layers
    Dense(64, activation='relu'),
    Dropout(0.3),
    Dense(32, activation='relu'),
    Dropout(0.2),
    Dense(1, activation='sigmoid')
])

model.compile(
    loss='binary_crossentropy',
    optimizer=Adam(learning_rate=0.001),
    metrics=['accuracy']
)

print("✓ Model architecture:")
print(model.summary())

# ==== STEP 10: Train Model ====
print("\nSTEP 10: TRAINING CNN + LSTM MODEL")
print("-" * 80)

early_stop = EarlyStopping(
    monitor='val_loss',
    patience=3,
    restore_best_weights=True,
    verbose=0
)

history = model.fit(
    X_train_pad, y_train,
    epochs=20,
    batch_size=32,
    validation_split=0.2,
    callbacks=[early_stop],
    verbose=1
)

# ==== STEP 11: Evaluate Deep Learning Model ====
print("\nSTEP 11: EVALUATING CNN + LSTM MODEL")
print("-" * 80)

score = model.evaluate(X_test_pad, y_test, verbose=0)
y_pred_dl = model.predict(X_test_pad, verbose=0)
y_pred_dl_class = (y_pred_dl > 0.5).astype(int).flatten()

acc_dl = accuracy_score(y_test, y_pred_dl_class)
prec_dl = precision_score(y_test, y_pred_dl_class)
rec_dl = recall_score(y_test, y_pred_dl_class)
f1_dl = f1_score(y_test, y_pred_dl_class)
auc_dl = roc_auc_score(y_test, y_pred_dl.flatten())

print(f"✓ Deep Learning Results:")
print(f"  Test Loss:     {score[0]:.4f}")
print(f"  Accuracy:      {acc_dl:.4f}")
print(f"  Precision:     {prec_dl:.4f}")
print(f"  Recall:        {rec_dl:.4f}")
print(f"  F1-Score:      {f1_dl:.4f}")
print(f"  ROC-AUC:       {auc_dl:.4f}\n")

cm_dl = confusion_matrix(y_test, y_pred_dl_class)
print(f"✓ Confusion Matrix:\n{cm_dl}")
print(f"\n✓ Classification Report:")
print(classification_report(y_test, y_pred_dl_class, target_names=["Non-ADHD", "ADHD"]))

dl_res = {
    'model': 'CNN + LSTM (FastText)',
    'accuracy': acc_dl,
    'precision': prec_dl,
    'recall': rec_dl,
    'f1': f1_dl,
    'roc_auc': auc_dl
}

# ==== STEP 12: Results Comparison ====
print("\n" + "="*80)
print("FINAL RESULTS COMPARISON")
print("="*80 + "\n")

results_df = pd.DataFrame([baseline_res, dl_res])
print(results_df.to_string(index=False))

results_df.to_csv('adhd_detection_results_complete.csv', index=False)
print("\n✓ Results saved to: adhd_detection_results_complete.csv\n")

# ==== STEP 13: Visualizations ====
print("STEP 12: GENERATING VISUALIZATIONS")
print("-" * 80)

fig, axes = plt.subplots(2, 2, figsize=(15, 12))

# Plot 1: Accuracy Comparison
ax1 = axes[0, 0]
models = results_df['model'].values
accuracies = results_df['accuracy'].values
colors = ['#FF6B6B', '#4ECDC4']
bars = ax1.bar(range(len(models)), accuracies, color=colors, alpha=0.8)
ax1.set_ylabel('Accuracy', fontweight='bold', fontsize=11)
ax1.set_title('Model Accuracy Comparison', fontweight='bold', fontsize=12)
ax1.set_xticks(range(len(models)))
ax1.set_xticklabels(models, rotation=45, ha='right')
ax1.set_ylim([0.85, 1.0])
for i, v in enumerate(accuracies):
    ax1.text(i, v + 0.005, f'{v:.4f}', ha='center', fontweight='bold', fontsize=10)

# Plot 2: All Metrics
ax2 = axes[0, 1]
x = np.arange(len(models))
width = 0.2
ax2.bar(x - 1.5*width, results_df['accuracy'], width, label='Accuracy', alpha=0.8, color='#FF6B6B')
ax2.bar(x - 0.5*width, results_df['precision'], width, label='Precision', alpha=0.8, color='#4ECDC4')
ax2.bar(x + 0.5*width, results_df['recall'], width, label='Recall', alpha=0.8, color='#45B7D1')
ax2.bar(x + 1.5*width, results_df['f1'], width, label='F1-Score', alpha=0.8, color='#96CEB4')
ax2.set_ylabel('Score', fontweight='bold', fontsize=11)
ax2.set_title('Comprehensive Metrics Comparison', fontweight='bold', fontsize=12)
ax2.set_xticks(x)
ax2.set_xticklabels(models, rotation=45, ha='right', fontsize=9)
ax2.legend(fontsize=9)
ax2.set_ylim([0.85, 1.0])

# Plot 3: Confusion Matrix
ax3 = axes[1, 0]
sns.heatmap(cm_dl, annot=True, fmt='d', cmap='Blues', ax=ax3, cbar=False,
            xticklabels=['Non-ADHD', 'ADHD'], yticklabels=['Non-ADHD', 'ADHD'])
ax3.set_title('Confusion Matrix - CNN+LSTM (FastText)', fontweight='bold', fontsize=12)
ax3.set_ylabel('Actual', fontweight='bold')
ax3.set_xlabel('Predicted', fontweight='bold')

# Plot 4: Training History
ax4 = axes[1, 1]
ax4.plot(history.history['accuracy'], label='Train Accuracy', linewidth=2, color='#FF6B6B')
ax4.plot(history.history['val_accuracy'], label='Validation Accuracy', linewidth=2, color='#4ECDC4')
ax4.set_xlabel('Epoch', fontweight='bold', fontsize=11)
ax4.set_ylabel('Accuracy', fontweight='bold', fontsize=11)
ax4.set_title('CNN+LSTM Training History', fontweight='bold', fontsize=12)
ax4.legend(fontsize=10)
ax4.grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig('adhd_detection_complete.png', dpi=300, bbox_inches='tight')
print("✓ Visualization saved: adhd_detection_complete.png\n")

# ==== FINAL SUMMARY ====
print("="*80)
print("✓✓✓ ANALYSIS COMPLETE! ✓✓✓")
print("="*80)
print(f"\n📊 KEY RESULTS:")
print(f"  Baseline (TF-IDF + LogReg):    {acc_base:.4f}")
print(f"  Deep Learning (CNN+LSTM):      {acc_dl:.4f}")
print(f"  Improvement:                   {(acc_dl - acc_base)*100:+.2f}%")
print(f"\n📁 OUTPUT FILES CREATED:")
print(f"  ✓ adhd_detection_results_complete.csv")
print(f"  ✓ adhd_detection_complete.png")
print(f"\n🎯 YOUR RESEARCH PAPER IS READY!")
print(f"   Use these results for publication ✨")
print("="*80 + "\n")
