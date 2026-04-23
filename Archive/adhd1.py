import pandas as pd

# Load your raw dataset
df = pd.read_csv("adhd_dataset_raw.csv")

# List of ADHD-related subreddits
adhd_subreddits = [
    "ADHD", "AdultADHD", "ADHDWomen", "ADHD_Community", "ADHDSupport",
    "adhd_anxiety", "adhd_tips", "adhd_irl", "ADHDmemes", "ADHDStudents",
    "ADHDFamily", "adhd_artists", "adhd_help", "Neurodivergent", "Neurodiversity"
]

# Keywords to exclude (minors)
exclude_keywords = [
    "teen", "high school", "my child", "kids", "children",
    "school age", "middle school", "elementary", "daughter", "son"
]

def does_not_refer_to_minors(text):
    if pd.isna(text):
        return True
    text_lower = text.lower()
    return not any(k in text_lower for k in exclude_keywords)

# Filter for ADHD subreddits only
df_adhd = df[df['subreddit'].isin(adhd_subreddits)].copy()

# Combine title and text for filtering
df_adhd['combined_text'] = df_adhd['title'].fillna('') + ' ' + df_adhd['text'].fillna('')

# Filter out posts referring to minors
df_filtered = df_adhd[df_adhd['combined_text'].apply(does_not_refer_to_minors)].copy()

# Convert created_utc to datetime
df_filtered.loc[:, 'created_date'] = pd.to_datetime(df_filtered['created_utc'], unit='s')

# Save to Excel file
df_filtered.to_excel('adhd_dataset_filtered_18plus_exclusion.xlsx', index=False)

print(f"Filtered dataset saved with {len(df_filtered)} posts as 'adhd_dataset_filtered_18plus_exclusion.xlsx'.")
