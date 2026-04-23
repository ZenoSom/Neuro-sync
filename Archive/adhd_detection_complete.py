# ============================================================
# DEPRECATED — use adhd_deeplearning.py instead
#
# This script has been superseded by adhd_deeplearning.py which
# consolidates all 3 old DL scripts into one clean canonical file.
# You can safely delete this file once adhd_deeplearning.py works.
# ============================================================

# ====================================================================
# ADHD DETECTION FROM SOCIAL MEDIA TEXT
# Complete Implementation with FastText + CNN + LSTM + Baselines
# ====================================================================

# ==== STEP 1: Import Libraries ====
import pandas as pd
import numpy as np
import re
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score, f1_score, confusion_matrix, classification_report,
    precision_score, recall_score, roc_auc_score, roc_curve
)

import nltk
nltk.download('stopwords')
nltk.download('wordnet')
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer

from tensorflow.keras.preprocessing.text import Tokenizer
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.models import Sequential, Model
from tensorflow.keras.layers import (
    Embedding, Conv1D, MaxPooling1D, LSTM, Dense, Dropout, 
    Input, concatenate, Flatten, Bidirectional
)
from tensorflow.keras.callbacks import EarlyStopping
from tensorflow.keras.optimizers import Adam
from gensim.models import FastText, Word2Vec
from gensim.models.callbacks import CallbackAny2Vec
import warnings
warnings.filterwarnings('ignore')

# ====================================================================
# ==== STEP 2: Load Data ====
# ====================================================================
df = pd.read_csv('adhd_vs_nonadhd_18+combined.csv')
print("=" * 70)
print("DATASET LOADING")
print("=" * 70)
print(f"Original dataset size: {len(df)}")
print(f"Dataset shape: {df.shape}")
print(f"\nLabel distribution:\n{df['label'].value_counts()}")
print(f"\nData sample:\n{df.head()}")

# ====================================================================
# ==== STEP 3: Text Preprocessing Pipeline ====
# ====================================================================
print("\n" + "=" * 70)
print("TEXT PREPROCESSING")
print("=" * 70)

stop_words = set(stopwords.words('english'))
lemmatizer = WordNetLemmatizer()

def clean_text(text):
    """
    Comprehensive text cleaning:
    1. Lowercase conversion
    2. Remove punctuation and special characters
    3. Tokenization
    4. Stop words removal
    5. Lemmatization
    """
    if pd.isna(text):
        return ""
    
    text = str(text).lower()
    text = re.sub(r'http\S+|www\S+|https\S+', '', text)  # Remove URLs
    text = re.sub(r'@\w+|#\w+', '', text)                # Remove mentions/hashtags
    text = re.sub(r'\W', ' ', text)                       # Remove punctuation
    text = re.sub(r'\d+', '', text)                       # Remove numbers
    text = re.sub(r'\s+', ' ', text).strip()              # Remove extra whitespace
    
    tokens = text.split()
    tokens = [w for w in tokens if w not in stop_words and len(w) > 2]
    tokens = [lemmatizer.lemmatize(w) for w in tokens]
    
    return ' '.join(tokens)

# Apply cleaning
df['clean_text'] = df['text'].apply(clean_text)

# Remove duplicates and empty texts
initial_size = len(df)
df = df.drop_duplicates(subset=['clean_text'])
df = df[df['clean_text'].str.strip() != '']
print(f"After cleaning: {len(df)} samples (removed {initial_size - len(df)} duplicates/empty)")

# ====================================================================
# ==== STEP 4: Encode Labels ====
# ====================================================================
label_map = {'ADHD': 1, 'Non-ADHD': 0}
df['label_enc'] = df['label'].map(label_map)
df = df.dropna(subset=['label_enc'])

X = df['clean_text'].values
y = df['label_enc'].values
print(f"\nFinal dataset: {len(df)} samples")
print(f"Class distribution - ADHD: {np.sum(y)}, Non-ADHD: {len(y) - np.sum(y)}")

# ====================================================================
# ==== STEP 5: Train-Test-Validation Split ====
# ====================================================================
print("\n" + "=" * 70)
print("DATA SPLITTING (80-10-10)")
print("=" * 70)

X_train, X_temp, y_train, y_temp = train_test_split(
    X, y, test_size=0.2, stratify=y, random_state=42
)

X_val, X_test, y_val, y_test = train_test_split(
    X_temp, y_temp, test_size=0.5, stratify=y_temp, random_state=42
)

print(f"Train set: {len(X_train)} samples")
print(f"Validation set: {len(X_val)} samples")
print(f"Test set: {len(X_test)} samples")

# ====================================================================
# ==== STEP 6: Baseline Model 1 - TF-IDF + Logistic Regression ====
# ====================================================================
print("\n" + "=" * 70)
print("BASELINE 1: TF-IDF + LOGISTIC REGRESSION")
print("=" * 70)

vectorizer = TfidfVectorizer(
    max_features=10000,
    min_df=5,
    max_df=0.8,
    ngram_range=(1, 2),
    sublinear_tf=True
)
X_train_tfidf = vectorizer.fit_transform(X_train)
X_val_tfidf = vectorizer.transform(X_val)
X_test_tfidf = vectorizer.transform(X_test)

clf_lr = LogisticRegression(max_iter=1000, random_state=42, class_weight='balanced')
clf_lr.fit(X_train_tfidf, y_train)

y_pred_lr = clf_lr.predict(X_test_tfidf)
y_pred_lr_proba = clf_lr.predict_proba(X_test_tfidf)[:, 1]

print('\n--- TF-IDF + Logistic Regression Results ---')
print(f'Accuracy: {accuracy_score(y_test, y_pred_lr):.4f}')
print(f'Precision: {precision_score(y_test, y_pred_lr):.4f}')
print(f'Recall: {recall_score(y_test, y_pred_lr):.4f}')
print(f'F1 Score: {f1_score(y_test, y_pred_lr):.4f}')
print(f'ROC-AUC: {roc_auc_score(y_test, y_pred_lr_proba):.4f}')
print(f'\nConfusion Matrix:\n{confusion_matrix(y_test, y_pred_lr)}')
print(f'\nClassification Report:\n{classification_report(y_test, y_pred_lr, target_names=["Non-ADHD", "ADHD"])}')

# Store results
baseline1_results = {
    'model': 'TF-IDF + Logistic Regression',
    'accuracy': accuracy_score(y_test, y_pred_lr),
    'precision': precision_score(y_test, y_pred_lr),
    'recall': recall_score(y_test, y_pred_lr),
    'f1': f1_score(y_test, y_pred_lr),
    'roc_auc': roc_auc_score(y_test, y_pred_lr_proba)
}

# ====================================================================
# ==== STEP 7: Prepare FastText Embeddings ====
# ====================================================================
print("\n" + "=" * 70)
print("TRAINING FASTTEXT EMBEDDINGS")
print("=" * 70)

# Prepare sentences for FastText
sentences_train = [text.split() for text in X_train]

# Train FastText model
fasttext_model = FastText(
    sentences=sentences_train,
    vector_size=100,
    window=5,
    min_count=2,
    sg=1,  # Skip-gram model
    epochs=20,
    workers=4
)

print(f"FastText model trained: vocabulary size = {len(fasttext_model.wv)}")

# ====================================================================
# ==== STEP 8: Prepare Data for Deep Learning Models ====
# ====================================================================
print("\n" + "=" * 70)
print("PREPARING DATA FOR DEEP LEARNING")
print("=" * 70)

max_features = 10000
maxlen = 100
embedding_dim = 100

# Tokenization
tokenizer = Tokenizer(num_words=max_features)
tokenizer.fit_on_texts(X_train)

X_train_seq = tokenizer.texts_to_sequences(X_train)
X_val_seq = tokenizer.texts_to_sequences(X_val)
X_test_seq = tokenizer.texts_to_sequences(X_test)

# Padding
X_train_pad = pad_sequences(X_train_seq, maxlen=maxlen, padding='post')
X_val_pad = pad_sequences(X_val_seq, maxlen=maxlen, padding='post')
X_test_pad = pad_sequences(X_test_seq, maxlen=maxlen, padding='post')

print(f"Padded sequences shape: {X_train_pad.shape}")

# Create FastText embedding matrix
embedding_matrix = np.zeros((max_features, embedding_dim))
for word, idx in tokenizer.word_index.items():
    if idx < max_features:
        if word in fasttext_model.wv:
            embedding_matrix[idx] = fasttext_model.wv[word]
        else:
            # Random initialization for OOV words
            embedding_matrix[idx] = np.random.randn(embedding_dim)

print(f"Embedding matrix created: {embedding_matrix.shape}")

# ====================================================================
# ==== STEP 9: Model 1 - CNN + LSTM (Improved) ====
# ====================================================================
print("\n" + "=" * 70)
print("MODEL 1: IMPROVED CNN + LSTM HYBRID")
print("=" * 70)

model1 = Sequential([
    Embedding(
        input_dim=max_features,
        output_dim=embedding_dim,
        weights=[embedding_matrix],
        input_length=maxlen,
        trainable=False
    ),
    Dropout(0.25),
    Conv1D(128, 5, activation='relu'),
    MaxPooling1D(pool_size=2),
    Dropout(0.25),
    Conv1D(128, 5, activation='relu'),
    MaxPooling1D(pool_size=2),
    Dropout(0.25),
    LSTM(64, dropout=0.2, recurrent_dropout=0.2),
    Dense(32, activation='relu'),
    Dropout(0.25),
    Dense(1, activation='sigmoid')
])

model1.compile(
    loss='binary_crossentropy',
    optimizer=Adam(learning_rate=0.001),
    metrics=['accuracy']
)

print(model1.summary())

# Define early stopping
early_stop = EarlyStopping(
    monitor='val_loss',
    patience=3,
    restore_best_weights=True,
    verbose=1
)

history1 = model1.fit(
    X_train_pad, y_train,
    epochs=20,
    batch_size=32,
    validation_data=(X_val_pad, y_val),
    callbacks=[early_stop],
    verbose=1
)

# Evaluate Model 1
score1 = model1.evaluate(X_test_pad, y_test, verbose=0)
y_pred1 = model1.predict(X_test_pad, verbose=0)
y_pred1_class = (y_pred1 > 0.5).astype(int).flatten()

print('\n--- CNN + LSTM Hybrid Results ---')
print(f'Test Loss: {score1[0]:.4f}')
print(f'Test Accuracy: {score1[1]:.4f}')
print(f'Precision: {precision_score(y_test, y_pred1_class):.4f}')
print(f'Recall: {recall_score(y_test, y_pred1_class):.4f}')
print(f'F1 Score: {f1_score(y_test, y_pred1_class):.4f}')
print(f'ROC-AUC: {roc_auc_score(y_test, y_pred1.flatten()):.4f}')
print(f'\nConfusion Matrix:\n{confusion_matrix(y_test, y_pred1_class)}')
print(f'\nClassification Report:\n{classification_report(y_test, y_pred1_class, target_names=["Non-ADHD", "ADHD"])}')

model1_results = {
    'model': 'CNN + LSTM (Hybrid)',
    'accuracy': score1[1],
    'precision': precision_score(y_test, y_pred1_class),
    'recall': recall_score(y_test, y_pred1_class),
    'f1': f1_score(y_test, y_pred1_class),
    'roc_auc': roc_auc_score(y_test, y_pred1.flatten())
}

# ====================================================================
# ==== STEP 10: Model 2 - Bidirectional LSTM ====
# ====================================================================
print("\n" + "=" * 70)
print("MODEL 2: BIDIRECTIONAL LSTM")
print("=" * 70)

model2 = Sequential([
    Embedding(
        input_dim=max_features,
        output_dim=embedding_dim,
        weights=[embedding_matrix],
        input_length=maxlen,
        trainable=False
    ),
    Dropout(0.25),
    Bidirectional(LSTM(64, dropout=0.2, recurrent_dropout=0.2)),
    Dense(32, activation='relu'),
    Dropout(0.25),
    Dense(1, activation='sigmoid')
])

model2.compile(
    loss='binary_crossentropy',
    optimizer=Adam(learning_rate=0.001),
    metrics=['accuracy']
)

history2 = model2.fit(
    X_train_pad, y_train,
    epochs=20,
    batch_size=32,
    validation_data=(X_val_pad, y_val),
    callbacks=[early_stop],
    verbose=1
)

score2 = model2.evaluate(X_test_pad, y_test, verbose=0)
y_pred2 = model2.predict(X_test_pad, verbose=0)
y_pred2_class = (y_pred2 > 0.5).astype(int).flatten()

print('\n--- Bidirectional LSTM Results ---')
print(f'Test Accuracy: {score2[1]:.4f}')
print(f'Precision: {precision_score(y_test, y_pred2_class):.4f}')
print(f'Recall: {recall_score(y_test, y_pred2_class):.4f}')
print(f'F1 Score: {f1_score(y_test, y_pred2_class):.4f}')
print(f'ROC-AUC: {roc_auc_score(y_test, y_pred2.flatten()):.4f}')

model2_results = {
    'model': 'Bidirectional LSTM',
    'accuracy': score2[1],
    'precision': precision_score(y_test, y_pred2_class),
    'recall': recall_score(y_test, y_pred2_class),
    'f1': f1_score(y_test, y_pred2_class),
    'roc_auc': roc_auc_score(y_test, y_pred2.flatten())
}

# ====================================================================
# ==== STEP 11: Model 3 - Advanced FCL (FastText-CNN-LSTM) ====
# ====================================================================
print("\n" + "=" * 70)
print("MODEL 3: ADVANCED FCL (FASTTEXT-CNN-LSTM)")
print("=" * 70)

model3 = Sequential([
    Embedding(
        input_dim=max_features,
        output_dim=embedding_dim,
        weights=[embedding_matrix],
        input_length=maxlen,
        trainable=False
    ),
    Dropout(0.25),
    Conv1D(256, 3, activation='relu', padding='same'),
    Conv1D(256, 5, activation='relu', padding='same'),
    MaxPooling1D(pool_size=2),
    Dropout(0.25),
    Conv1D(128, 3, activation='relu', padding='same'),
    Conv1D(128, 5, activation='relu', padding='same'),
    MaxPooling1D(pool_size=2),
    Dropout(0.25),
    Bidirectional(LSTM(64, dropout=0.2, recurrent_dropout=0.2)),
    Dense(64, activation='relu'),
    Dropout(0.3),
    Dense(32, activation='relu'),
    Dropout(0.2),
    Dense(1, activation='sigmoid')
])

model3.compile(
    loss='binary_crossentropy',
    optimizer=Adam(learning_rate=0.001),
    metrics=['accuracy']
)

print(model3.summary())

history3 = model3.fit(
    X_train_pad, y_train,
    epochs=20,
    batch_size=32,
    validation_data=(X_val_pad, y_val),
    callbacks=[early_stop],
    verbose=1
)

score3 = model3.evaluate(X_test_pad, y_test, verbose=0)
y_pred3 = model3.predict(X_test_pad, verbose=0)
y_pred3_class = (y_pred3 > 0.5).astype(int).flatten()

print('\n--- Advanced FCL (FastText-CNN-LSTM) Results ---')
print(f'Test Accuracy: {score3[1]:.4f}')
print(f'Precision: {precision_score(y_test, y_pred3_class):.4f}')
print(f'Recall: {recall_score(y_test, y_pred3_class):.4f}')
print(f'F1 Score: {f1_score(y_test, y_pred3_class):.4f}')
print(f'ROC-AUC: {roc_auc_score(y_test, y_pred3.flatten()):.4f}')
print(f'\nConfusion Matrix:\n{confusion_matrix(y_test, y_pred3_class)}')
print(f'\nClassification Report:\n{classification_report(y_test, y_pred3_class, target_names=["Non-ADHD", "ADHD"])}')

model3_results = {
    'model': 'Advanced FCL (FastText-CNN-LSTM)',
    'accuracy': score3[1],
    'precision': precision_score(y_test, y_pred3_class),
    'recall': recall_score(y_test, y_pred3_class),
    'f1': f1_score(y_test, y_pred3_class),
    'roc_auc': roc_auc_score(y_test, y_pred3.flatten())
}

# ====================================================================
# ==== STEP 12: Results Comparison ====
# ====================================================================
print("\n" + "=" * 70)
print("COMPREHENSIVE RESULTS COMPARISON")
print("=" * 70)

results_df = pd.DataFrame([
    baseline1_results,
    model1_results,
    model2_results,
    model3_results
])

print("\n" + results_df.to_string(index=False))

# Export results to CSV
results_df.to_csv('adhd_detection_results.csv', index=False)
print("\nResults saved to: adhd_detection_results.csv")

# ====================================================================
# ==== STEP 13: Visualizations ====
# ====================================================================
print("\n" + "=" * 70)
print("GENERATING VISUALIZATIONS")
print("=" * 70)

fig, axes = plt.subplots(2, 2, figsize=(15, 12))

# Plot 1: Accuracy Comparison
ax1 = axes[0, 0]
models = results_df['model'].values
accuracies = results_df['accuracy'].values
colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4']
bars1 = ax1.bar(range(len(models)), accuracies, color=colors, alpha=0.8)
ax1.set_ylabel('Accuracy', fontsize=12, fontweight='bold')
ax1.set_title('Model Accuracy Comparison', fontsize=13, fontweight='bold')
ax1.set_xticks(range(len(models)))
ax1.set_xticklabels(models, rotation=45, ha='right')
ax1.set_ylim([0.85, 1.0])
for i, v in enumerate(accuracies):
    ax1.text(i, v + 0.005, f'{v:.4f}', ha='center', fontweight='bold')

# Plot 2: All Metrics Comparison
ax2 = axes[0, 1]
x = np.arange(len(models))
width = 0.2
ax2.bar(x - 1.5*width, results_df['accuracy'], width, label='Accuracy', color='#FF6B6B', alpha=0.8)
ax2.bar(x - 0.5*width, results_df['precision'], width, label='Precision', color='#4ECDC4', alpha=0.8)
ax2.bar(x + 0.5*width, results_df['recall'], width, label='Recall', color='#45B7D1', alpha=0.8)
ax2.bar(x + 1.5*width, results_df['f1'], width, label='F1-Score', color='#96CEB4', alpha=0.8)
ax2.set_ylabel('Score', fontsize=12, fontweight='bold')
ax2.set_title('Comprehensive Metrics Comparison', fontsize=13, fontweight='bold')
ax2.set_xticks(x)
ax2.set_xticklabels(models, rotation=45, ha='right')
ax2.legend()
ax2.set_ylim([0.85, 1.0])

# Plot 3: Confusion Matrix for Best Model (Model 3)
ax3 = axes[1, 0]
cm_best = confusion_matrix(y_test, y_pred3_class)
sns.heatmap(cm_best, annot=True, fmt='d', cmap='Blues', ax=ax3, cbar=False)
ax3.set_title('Confusion Matrix - Advanced FCL (Best Model)', fontsize=13, fontweight='bold')
ax3.set_ylabel('Actual', fontsize=11)
ax3.set_xlabel('Predicted', fontsize=11)
ax3.set_xticklabels(['Non-ADHD', 'ADHD'])
ax3.set_yticklabels(['Non-ADHD', 'ADHD'])

# Plot 4: ROC-AUC Comparison
ax4 = axes[1, 1]
roc_aucs = results_df['roc_auc'].values
bars4 = ax4.bar(range(len(models)), roc_aucs, color=colors, alpha=0.8)
ax4.set_ylabel('ROC-AUC Score', fontsize=12, fontweight='bold')
ax4.set_title('ROC-AUC Comparison', fontsize=13, fontweight='bold')
ax4.set_xticks(range(len(models)))
ax4.set_xticklabels(models, rotation=45, ha='right')
ax4.set_ylim([0.85, 1.0])
for i, v in enumerate(roc_aucs):
    ax4.text(i, v + 0.005, f'{v:.4f}', ha='center', fontweight='bold')

plt.tight_layout()
plt.savefig('adhd_detection_comparison.png', dpi=300, bbox_inches='tight')
print("Visualization saved: adhd_detection_comparison.png")

# Training history visualization for best model
fig, axes = plt.subplots(1, 2, figsize=(14, 4))

# Accuracy
axes[0].plot(history3.history['accuracy'], label='Train Accuracy', linewidth=2)
axes[0].plot(history3.history['val_accuracy'], label='Validation Accuracy', linewidth=2)
axes[0].set_xlabel('Epoch', fontsize=11, fontweight='bold')
axes[0].set_ylabel('Accuracy', fontsize=11, fontweight='bold')
axes[0].set_title('FCL Model - Training Accuracy', fontsize=12, fontweight='bold')
axes[0].legend()
axes[0].grid(True, alpha=0.3)

# Loss
axes[1].plot(history3.history['loss'], label='Train Loss', linewidth=2)
axes[1].plot(history3.history['val_loss'], label='Validation Loss', linewidth=2)
axes[1].set_xlabel('Epoch', fontsize=11, fontweight='bold')
axes[1].set_ylabel('Loss', fontsize=11, fontweight='bold')
axes[1].set_title('FCL Model - Training Loss', fontsize=12, fontweight='bold')
axes[1].legend()
axes[1].grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig('fcl_training_history.png', dpi=300, bbox_inches='tight')
print("Training history saved: fcl_training_history.png")

print("\n" + "=" * 70)
print("ANALYSIS COMPLETE!")
print("=" * 70)
