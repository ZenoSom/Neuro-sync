# ============================================================
# DEPRECATED — use adhd_deeplearning.py instead
#
# This was an early prototype with only 5 training epochs and
# no early stopping. It has been superseded by adhd_deeplearning.py.
# You can safely delete this file once adhd_deeplearning.py works.
# ============================================================

# REQUIRED: pip install gensim tensorflow pandas scikit-learn nltk
import pandas as pd
import numpy as np
import re
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import nltk
nltk.download('stopwords')
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from gensim.models import FastText
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Embedding, Conv1D, MaxPooling1D, LSTM, Dense, Dropout
from tensorflow.keras.preprocessing.text import Tokenizer
from tensorflow.keras.preprocessing.sequence import pad_sequences

# 1. Load your dataset (edit filename as needed):
df = pd.read_csv('ADHD_VS_NON-ADHD(18+).csv')

# 2. Clean text function
stop_words = set(stopwords.words('english'))
lemmatizer = WordNetLemmatizer()
def clean_text(text):
    text = str(text).lower()
    text = re.sub(r'http\S+|www\S+', '', text)
    text = re.sub(r'\W', ' ', text)
    tokens = text.split()
    tokens = [lemmatizer.lemmatize(w) for w in tokens if w not in stop_words]
    return ' '.join(tokens)

# 3. Clean the dataset
#   Remove empty, duplicate, and weird row labels
if 'text' in df.columns:
    df['clean_text'] = df['text'].apply(clean_text)
else:
    raise ValueError("Your CSV must have a 'text' column.")
df = df.drop_duplicates(subset=['clean_text'])
df = df[df['clean_text'].str.strip() != '']

# Remove rows that aren't 'ADHD' or 'Non-ADHD'
df['label_num'] = df['label'].map({'ADHD': 1, 'Non-ADHD': 0})
df = df[~df['label_num'].isna()].copy()
X = df['clean_text'].values
y = df['label_num'].astype(int).values

print("Final dataset size:", len(X))
print("Label distribution:", pd.Series(y).value_counts().to_dict())

# 4. Train-test split ( safe from NaN!)
X_train, X_test, y_train, y_test = train_test_split(
    X, y, stratify=y, test_size=0.2, random_state=42
)

# 5. Train FastText (unsupervised) embeddings
train_sentences = [text.split() for text in X_train]
fasttext_model = FastText(train_sentences, vector_size=100, window=5, min_count=2, sg=1, epochs=15)

# 6. Tokenize and pad
max_features = 10000  # max vocab size
maxlen = 100          # max sequence length

# Tokenizer for index mapping
tokenizer = Tokenizer(num_words=max_features)
tokenizer.fit_on_texts(X_train)
X_train_seq = tokenizer.texts_to_sequences(X_train)
X_test_seq = tokenizer.texts_to_sequences(X_test)
X_train_pad = pad_sequences(X_train_seq, maxlen=maxlen)
X_test_pad = pad_sequences(X_test_seq, maxlen=maxlen)

# 7. Create FastText embedding matrix for Keras
embedding_dim = 100
embedding_matrix = np.zeros((max_features, embedding_dim))
for word, i in tokenizer.word_index.items():
    if i < max_features:
        if word in fasttext_model.wv:
            embedding_matrix[i] = fasttext_model.wv[word]
        else:
            embedding_matrix[i] = np.random.normal(size=(embedding_dim,))

# 8. Build CNN-LSTM model
model = Sequential([
    Embedding(input_dim=max_features,
              output_dim=embedding_dim,
              weights=[embedding_matrix],
              input_length=maxlen,
              trainable=False),
    Conv1D(128, kernel_size=5, activation='relu'),
    MaxPooling1D(pool_size=2),
    LSTM(64, dropout=0.2, recurrent_dropout=0.2),
    Dense(1, activation='sigmoid')
])
model.compile(loss='binary_crossentropy', optimizer='adam', metrics=['accuracy'])
model.summary()

# 9. Train model
model.fit(X_train_pad, y_train, epochs=5, batch_size=64, validation_split=0.2)

# 10. Evaluate
loss, accuracy = model.evaluate(X_test_pad, y_test)
print(f"Test accuracy: {accuracy:.4f}")

# 11. Classification report
preds = model.predict(X_test_pad)
print(classification_report(y_test, (preds > 0.5).astype(int)))
