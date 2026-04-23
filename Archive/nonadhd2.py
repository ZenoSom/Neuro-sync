import pandas as pd

# Load your filtered dataset (8.5k posts)
df = pd.read_csv("non_adhd_18plus_6500_filled.csv")

# Randomly sample 6509 posts
df_sampled = df.sample(n=6509, random_state=42).reset_index(drop=True)

# Save the sampled dataset
df_sampled.to_csv("non_adhd_dataset_18plus_6509_sampled.csv", index=False, encoding="utf-8")

print(f"Sampled and saved exactly {len(df_sampled)} posts as 'non_adhd_dataset_18plus_6509_sampled.csv'.")

