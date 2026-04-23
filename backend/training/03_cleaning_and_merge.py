import pandas as pd
import os
import re
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer

nltk.download('stopwords', quiet=True)
nltk.download('wordnet', quiet=True)

# Determine the directory of the current script
script_dir = os.path.dirname(os.path.abspath(__file__))

# -------- STEP 1: MERGE --------
print("Merging datasets...")
try:
    adhd_path = os.path.join(script_dir, 'adhd_posts_raw.csv')
    non_adhd_path = os.path.join(script_dir, 'non_adhd_posts_raw.csv')
    
    adhd_df = pd.read_csv(adhd_path)
    non_adhd_df = pd.read_csv(non_adhd_path)
    combined_df = pd.concat([adhd_df, non_adhd_df], ignore_index=True)
    print(f"Combined size: {len(combined_df)} samples")
except Exception as e:
    print(f"Note: Ensure both raw CSVs exist. Error: {e}")
    # Fallback to the project's main dataset in the parent folder
    fallback_path = os.path.join(script_dir, '..', '..', 'ADHD_VS_NON-ADHD(18+).csv')
    combined_df = pd.read_csv(fallback_path) 
    print(f"Using project main dataset for demonstration: {len(combined_df)} samples")

# -------- STEP 2: CLEAN --------
print("\nCleaning text data...")
stop_words = set(stopwords.words('english'))
lemmatizer = WordNetLemmatizer()

def clean_text(text):
    if pd.isna(text): return ""
    text = str(text).lower()
    text = re.sub(r'http\S+', '', text)
    text = re.sub(r'\W', ' ', text)
    tokens = text.split()
    tokens = [lemmatizer.lemmatize(w) for w in tokens if w not in stop_words and len(w) > 2]
    return ' '.join(tokens)

combined_df['clean_text'] = combined_df['text'].apply(clean_text)
combined_df = combined_df.drop_duplicates(subset=['clean_text'])
combined_df = combined_df[combined_df['clean_text'].str.strip() != '']

# -------- STEP 3: SAVE --------
output_name = os.path.join(script_dir, "..", "..", "Final_Cleaned_Dataset.csv")
combined_df.to_csv(output_name, index=False)
print(f"\n✅ Success! Final dataset saved as '{output_name}'")
print(f"Final Count: {len(combined_df)} samples")
print(f"Distribution:\n{combined_df['label'].value_counts()}")
