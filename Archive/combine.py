import pandas as pd

# Load ADHD posts and add label
adhd_df = pd.read_csv('adhd1.csv')
adhd_df['label'] = 'ADHD'

# Load Non-ADHD posts and add label
nonadhd_df = pd.read_csv('non-adhd1.csv')
nonadhd_df['label'] = 'Non-ADHD'

# Combine into one DataFrame
combined_df = pd.concat([adhd_df, nonadhd_df], ignore_index=True)
print(combined_df['label'].value_counts())  # Should show counts for ADHD and Non-ADHD

# (Optional) Save combined dataset for future use
combined_df.to_csv('adhd_vs_nonadhd_18+combined.csv', index=False)
