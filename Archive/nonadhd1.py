import pandas as pd
import re


# Load dataset
df = pd.read_csv("non_adhd_dataset_raw.csv")


# Function to extract ages (18 and above)
def extract_age(text):
    # Extract any age number 18 or above (up to 99 for safety)
    matches = re.findall(r"\b(1[8-9]|[2-9][0-9])\b", str(text))
    if matches:
        return int(matches[0])
    return None


# Function to infer age from keywords
def infer_age(text):
    keywords = ["college", "university", "freshman", "sophomore", "junior", "senior", "student"]
    for kw in keywords:
        if kw.lower() in str(text).lower():
            return 20  # approximate age
    return None


# Extract explicit ages
df["age"] = df["title"].apply(extract_age)
df["age"] = df["age"].combine_first(df["text"].apply(extract_age))


# Infer ages
df["age"] = df["age"].combine_first(df["title"].apply(infer_age))
df["age"] = df["age"].combine_first(df["text"].apply(infer_age))


# 1️⃣ People with age 18 and above
df_18_plus = df[df["age"].apply(lambda x: x is not None and x >= 18)]


# 2️⃣ If still less than 6500, fill with random posts from same subreddits
needed = 6500 - len(df_18_plus)
if needed > 0:
    remaining = df[~df.index.isin(df_18_plus.index)]
    filler = remaining.sample(n=needed, random_state=42)
    df_18_plus = pd.concat([df_18_plus, filler])


# Shuffle
df_18_plus = df_18_plus.sample(frac=1, random_state=42).reset_index(drop=True)


# Save
df_18_plus.to_csv("non_adhd_18plus_6500_filled.csv", index=False)
print(f"✅ Saved dataset with {len(df_18_plus)} rows as 'non_adhd_18plus_6500_filled.csv'")
