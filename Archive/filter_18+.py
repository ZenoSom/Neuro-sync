import pandas as pd
import re

# Load raw dataset
df = pd.read_csv("adhd_dataset_raw.csv")

# Expanded function to detect 18–26 posts
def is_age_18_26(text):
    text = str(text).lower()

    # 1️⃣ Explicit numeric age mentions (18–26)
    explicit_pattern = r"\b(i'?m|i am|age|years old|yo|y/o)?\s*(1[8-9]|2[0-6])\b"
    if re.search(explicit_pattern, text):
        return True

    # 2️⃣ Context clues for college / early career
    context_keywords = [
        "college", "university", "undergrad", "student", "freshman", "sophomore",
        "junior", "senior", "grad school", "dorm", "campus", "bachelor's degree",
        "graduation", "internship", "intern", "entry level", "first job", "recent grad",
        "in my 20s", "early 20s", "mid 20s", "young adult", "20something", "twenties"
    ]
    if any(kw in text for kw in context_keywords):
        return True

    # 3️⃣ Vague phrases like "in my early/mid 20s" or "mid twenties"
    vague_pattern = r"\b(in my (late|early|mid) 20s|mid twenties|early twenties|late twenties)\b"
    if re.search(vague_pattern, text):
        return True

    # 4️⃣ Emojis or slang sometimes used by younger adults
    emoji_keywords = ["🎓", "🧑‍🎓", "📚", "🛏️ dorm", "☕ coffee", "🎮 gamer", "🎶 music"]
    if any(kw in text for kw in emoji_keywords):
        return True

    return False

# Apply filter to title + text
df["is_18_26"] = df.apply(lambda x: is_age_18_26(f"{x['title']} {x['text']}"), axis=1)

# Keep only likely 18–26 posts
df_age = df[df["is_18_26"] == True]

# Save filtered dataset
df_age.to_csv("adhd_dataset_18__expanded.csv", index=False, encoding="utf-8")

print(f"✅ Saved {len(df_age)} posts for age 18 as 'adhd_dataset_18_expanded.csv'.")
