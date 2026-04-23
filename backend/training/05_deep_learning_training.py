# ====================================================================
# ADHD DETECTION - DEEP LEARNING TRAINING SCRIPT
# Models: CNN + LSTM Hybrid, Bidirectional LSTM, Advanced FCL
# ====================================================================

import os
import pandas as pd
import numpy as np
import re
import json
import joblib
import matplotlib.pyplot as plt
import seaborn as sns
import warnings
warnings.filterwarnings('ignore')
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

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

import tensorflow as tf
from tensorflow.keras.preprocessing.text import Tokenizer
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import (
    Embedding, Conv1D, MaxPooling1D, LSTM,
    Dense, Dropout, Bidirectional
)
from tensorflow.keras.callbacks import EarlyStopping
from tensorflow.keras.optimizers import Adam

# ====================================================================
# HYPERPARAMETERS
# ====================================================================
# Adjusted path for backend/training/ folder
DATA_FILE       = os.path.join(os.path.dirname(__file__), '..', '..', 'ADHD_VS_NON-ADHD(18+).csv')
TEST_SIZE       = 0.10
VAL_SIZE        = 0.10
RANDOM_STATE    = 42
TFIDF_MAX_FEAT  = 10_000
FT_VECTOR_SIZE  = 100
FT_WINDOW       = 5
FT_MIN_COUNT    = 2
FT_EPOCHS       = 20
MAX_SEQ_LEN     = 100
BATCH_SIZE      = 32
DL_EPOCHS       = 20
EARLY_STOP_PAT  = 3

# ====================================================================
# STEP 1: LOAD DATA
# ====================================================================
print("\n" + "="*70)
print("STEP 1: LOADING DATASET")
print("="*70)

if not os.path.exists(DATA_FILE):
    # Try alternate location
    DATA_FILE = os.path.join(os.path.dirname(__file__), '..', '..', 'Final_Cleaned_Dataset.csv')

df = pd.read_csv(DATA_FILE)
print(f"✓ Loaded {len(df):,} samples | columns: {list(df.columns)}")

# Handle potential missing columns in raw vs cleaned
text_col = 'text' if 'text' in df.columns else 'clean_text'
label_col = 'label'

# ====================================================================
# STEP 2: TEXT PREPROCESSING
# ====================================================================
print("\n" + "="*70)
print("STEP 2: TEXT PREPROCESSING")
print("="*70)

stop_words = set(stopwords.words('english'))
lemmatizer = WordNetLemmatizer()

def clean_text(text):
    if pd.isna(text):
        return ""
    text = str(text).lower()
    text = re.sub(r'http\S+|www\S+|https\S+', '', text)
    text = re.sub(r'@\w+|#\w+|r/\w+|u/\w+', '', text)
    text = re.sub(r'\W', ' ', text)
    text = re.sub(r'\d+', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    tokens = text.split()
    tokens = [w for w in tokens if w not in stop_words and len(w) > 2]
    tokens = [lemmatizer.lemmatize(w) for w in tokens]
    return ' '.join(tokens)

df['clean_text_processed'] = df[text_col].apply(clean_text)
initial = len(df)
df = df.drop_duplicates(subset=['clean_text_processed'])
df = df[df['clean_text_processed'].str.strip() != '']
print(f"✓ Cleaned: removed {initial - len(df):,} duplicates/empty | {len(df):,} remaining")

# ====================================================================
# STEP 3: LABEL ENCODING
# ====================================================================
label_map = {'ADHD': 1, 'Non-ADHD': 0}
df['label_enc'] = df[label_col].map(label_map)
df = df.dropna(subset=['label_enc'])

X = df['clean_text_processed'].values
y = df['label_enc'].values

# ====================================================================
# STEP 4: TRAIN / VAL / TEST SPLIT
# ====================================================================
X_train, X_temp, y_train, y_temp = train_test_split(
    X, y, test_size=(TEST_SIZE + VAL_SIZE), stratify=y, random_state=RANDOM_STATE
)
X_val, X_test, y_val, y_test = train_test_split(
    X_temp, y_temp, test_size=0.5, stratify=y_temp, random_state=RANDOM_STATE
)

# ====================================================================
# STEP 6: FASTTEXT EMBEDDINGS
# ====================================================================
print("\nSTEP 6: TRAINING FASTTEXT EMBEDDINGS")
sentences_train = [text.split() for text in X_train]
ft_model = FastText(
    sentences=sentences_train,
    vector_size=FT_VECTOR_SIZE,
    window=FT_WINDOW,
    min_count=FT_MIN_COUNT,
    sg=1,
    epochs=FT_EPOCHS,
    workers=4
)

# ====================================================================
# STEP 7: TOKENISE & PAD
# ====================================================================
tokenizer = Tokenizer(num_words=TFIDF_MAX_FEAT)
tokenizer.fit_on_texts(X_train)

X_train_pad = pad_sequences(tokenizer.texts_to_sequences(X_train), maxlen=MAX_SEQ_LEN, padding='post')
X_val_pad   = pad_sequences(tokenizer.texts_to_sequences(X_val),   maxlen=MAX_SEQ_LEN, padding='post')
X_test_pad  = pad_sequences(tokenizer.texts_to_sequences(X_test),  maxlen=MAX_SEQ_LEN, padding='post')

embedding_matrix = np.zeros((TFIDF_MAX_FEAT, FT_VECTOR_SIZE))
for word, idx in tokenizer.word_index.items():
    if idx < TFIDF_MAX_FEAT:
        embedding_matrix[idx] = ft_model.wv[word] if word in ft_model.wv else np.random.randn(FT_VECTOR_SIZE) * 0.01

# ====================================================================
# MODEL 1: CNN + LSTM HYBRID
# ====================================================================
def build_model():
    model = Sequential([
        Embedding(TFIDF_MAX_FEAT, FT_VECTOR_SIZE, weights=[embedding_matrix], input_length=MAX_SEQ_LEN, trainable=False),
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
    model.compile(loss='binary_crossentropy', optimizer=Adam(1e-3), metrics=['accuracy'])
    return model

print("\nTRAINING CNN + LSTM HYBRID...")
model = build_model()
early_stop = EarlyStopping(monitor='val_loss', patience=EARLY_STOP_PAT, restore_best_weights=True)

model.fit(
    X_train_pad, y_train,
    epochs=DL_EPOCHS, batch_size=BATCH_SIZE,
    validation_data=(X_val_pad, y_val),
    callbacks=[early_stop]
)

# ====================================================================
# STEP 9: EXPORT
# ====================================================================
export_dir = os.path.join(os.path.dirname(__file__), '..', 'model', 'dl_model')
os.makedirs(export_dir, exist_ok=True)

model.save(os.path.join(export_dir, 'adhd_dl_model.h5'))
joblib.dump(tokenizer, os.path.join(export_dir, 'tokenizer.pkl'))

metadata = {
    'model_name': 'CNN + LSTM Hybrid',
    'max_seq_len': MAX_SEQ_LEN,
    'type': 'deep_learning'
}
with open(os.path.join(export_dir, 'metadata.json'), 'w') as f:
    json.dump(metadata, f)

print(f"\n✓ DL Model and Tokenizer saved to {export_dir}")
