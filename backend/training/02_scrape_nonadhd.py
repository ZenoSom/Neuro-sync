import os
import praw
import pandas as pd
import time
from tqdm import tqdm
from dotenv import load_dotenv

# Load credentials from .env
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

# -------- AUTHENTICATION --------
reddit = praw.Reddit(
    client_id=os.getenv("REDDIT_CLIENT_ID"),
    client_secret=os.getenv("REDDIT_CLIENT_SECRET"),
    user_agent=os.getenv("REDDIT_USER_AGENT")
)

# -------- SUBREDDITS (General / Non-ADHD) --------
non_adhd_subreddits = [
    "AskReddit", "CasualConversation", "LifeProTips", "technology", "fitness"
]

all_posts = []
print(f"📥 Fetching posts from {len(non_adhd_subreddits)} NON-ADHD subreddits (SECURED)...\n")

for sub in tqdm(non_adhd_subreddits, desc="Scraping non-ADHD subreddits"):
    subreddit = reddit.subreddit(sub)
    try:
        # demonstration limit; original was 1000
        posts = subreddit.hot(limit=20) 
        for post in posts:
            all_posts.append({
                "subreddit": sub,
                "id": post.id,
                "title": post.title,
                "text": post.selftext,
                "author": post.author.name if post.author else "[deleted]",
                "label": "Non-ADHD"
            })
        time.sleep(1)
    except Exception as e:
        print(f"⚠️ Error in {sub}: {e}")

# Determine the directory of the current script
script_dir = os.path.dirname(os.path.abspath(__file__))
output_path = os.path.join(script_dir, "non_adhd_posts_raw.csv")

df = pd.DataFrame(all_posts).drop_duplicates(subset="id")
df.to_csv(output_path, index=False, encoding="utf-8")
print(f"\n✅ Collected {len(df)} unique NON-ADHD posts.")
print(f"💾 Saved as '{output_path}'.")
