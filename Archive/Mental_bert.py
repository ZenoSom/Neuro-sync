import pandas as pd
import numpy as np
import re
import nltk
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from transformers import BertTokenizer, TFBertForSequenceClassification, XLNetTokenizer, TFXLNetForSequenceClassification
import tensorflow as tf

nltk.download('stopwords')
nltk.download('wordnet')
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer

# === Step 1: Load and clean data ===
df = pd.read_csv('adhd_vs_nonadhd_18+combined.csv')  # Change filename if needed

stop_words = set(stopwords.words('english'))
lemmatizer = WordNetLemmatizer()

def clean_text(text):
    text = str(text).lower()
    text = re.sub(r'\W', ' ', text)
    tokens = text.split()
    tokens = [w for w in tokens if w not in stop_words]
    tokens = [lemmatizer.lemmatize(w) for w in tokens]
    return ' '.join(tokens)

df['clean_text'] = df['text'].apply(clean_text)
df = df.drop_duplicates(subset=['clean_text'])
df = df[df['clean_text'].str.strip() != '']

label_map = {'ADHD': 1, 'Non-ADHD': 0}
df['label_enc'] = df['label'].map(label_map)
df = df.dropna(subset=['label_enc'])

X = df['clean_text'].tolist()
y = df['label_enc'].values

# === Step 2: Split data ===
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, stratify=y, random_state=42
)

# === Step 3: Prepare datasets for transformers ===
def prepare_tf_dataset(tokenizer, texts, labels, max_len=128, batch_size=16):
    encodings = tokenizer(texts, truncation=True, padding=True, max_length=max_len)
    dataset = tf.data.Dataset.from_tensor_slices((
        dict(encodings),
        labels
    ))
    return dataset.batch(batch_size)

# === Step 4: MentalBERT fine-tuning ===
print("\nStarting MentalBERT fine-tuning...")

# Official HuggingFace model ID for MentalBERT
mentalbert_model_name = "mental/mental-bert-base-uncased"

try:
    bert_tokenizer = BertTokenizer.from_pretrained(mentalbert_model_name)
    bert_model = TFBertForSequenceClassification.from_pretrained(
        mentalbert_model_name, num_labels=2
    )
except OSError as e:
    raise OSError(
        f"Could not load MentalBERT from '{mentalbert_model_name}'. "
        "Make sure you have an internet connection and huggingface_hub installed. "
        f"Original error: {e}"
    )

train_dataset_bert = prepare_tf_dataset(bert_tokenizer, X_train, y_train)
test_dataset_bert  = prepare_tf_dataset(bert_tokenizer, X_test,  y_test)

bert_model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=3e-5),
    loss=tf.keras.losses.SparseCategoricalCrossentropy(from_logits=True),
    metrics=['accuracy']
)

bert_model.fit(train_dataset_bert, epochs=3, validation_data=test_dataset_bert)
print("\nMentalBERT Evaluation:")
bert_model.evaluate(test_dataset_bert)

# === Step 5: MentalXLNet fine-tuning ===
print("\nStarting MentalXLNet fine-tuning...")

# Official HuggingFace model ID for MentalXLNet
mentalxlnet_model_name = "mental/mental-xlnet-base"

try:
    xlnet_tokenizer = XLNetTokenizer.from_pretrained(mentalxlnet_model_name)
    xlnet_model = TFXLNetForSequenceClassification.from_pretrained(
        mentalxlnet_model_name, num_labels=2
    )
except OSError as e:
    raise OSError(
        f"Could not load MentalXLNet from '{mentalxlnet_model_name}'. "
        "Make sure you have an internet connection and huggingface_hub installed. "
        f"Original error: {e}"
    )

train_dataset_xlnet = prepare_tf_dataset(xlnet_tokenizer, X_train, y_train)
test_dataset_xlnet  = prepare_tf_dataset(xlnet_tokenizer, X_test,  y_test)

xlnet_model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=3e-5),
    loss=tf.keras.losses.SparseCategoricalCrossentropy(from_logits=True),
    metrics=['accuracy']
)

xlnet_model.fit(train_dataset_xlnet, epochs=3, validation_data=test_dataset_xlnet)
print("\nMentalXLNet Evaluation:")
xlnet_model.evaluate(test_dataset_xlnet)
