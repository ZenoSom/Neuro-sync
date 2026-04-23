import praw
import pandas as pd
import time
from tqdm import tqdm

# -------- AUTHENTICATION (REMOVED SECRETS) --------
# NOTE: This script is archived. See research_adhd_pipeline/ for the updated version.
reddit = None # Removed for security

# -------- SUBREDDITS (General / Non-ADHD topics) --------
non_adhd_subreddits = [
    "AskReddit", "CasualConversation", "ExplainLikeImFive", "interestingasfuck",
    "LifeProTips", "technology", "GetMotivated", "fitness", "AskMen", "AskWomen",
    "travel", "movies", "television", "books", "sports", "gaming", "dataisbeautiful",
    "learnprogramming", "Python", "MachineLearning", "DIY", "food", "Cooking",
    "todayilearned", "history", "science", "space", "Art", "Music", "UpliftingNews",
    "NoStupidQuestions", "WholesomeMemes", "Jokes", "memes", "pics"
]

# -------- DATA COLLECTION --------
all_posts = []
print(f"📥 Fetching posts from {len(non_adhd_subreddits)} NON-ADHD subreddits...\n")

time_filters = ["day", "week", "month", "year", "all"]

for sub in tqdm(non_adhd_subreddits, desc="Scraping non-ADHD subreddits"):
    subreddit = reddit.subreddit(sub)

    # hot/new/rising first
    for category in ["hot", "new", "rising"]:
        try:
            posts = getattr(subreddit, category)(limit=1000)
            for post in posts:
                all_posts.append({
                    "subreddit": sub,
                    "title": post.title,
                    "text": post.selftext,
                    "score": post.score,
                    "id": post.id,
                    "num_comments": post.num_comments,
                    "created_utc": post.created_utc,
                    "url": post.url,
                    "category": category,
                    "time_filter": "none"
                })
            time.sleep(1)
        except Exception as e:
            print(f"⚠️ Error in {sub} ({category}): {e}")
            continue

    # now scrape top posts with time filters
    for t in time_filters:
        try:
            posts = subreddit.top(limit=1000, time_filter=t)
            for post in posts:
                all_posts.append({
                    "subreddit": sub,
                    "title": post.title,
                    "text": post.selftext,
                    "score": post.score,
                    "id": post.id,
                    "num_comments": post.num_comments,
                    "created_utc": post.created_utc,
                    "url": post.url,
                    "category": "top",
                    "time_filter": t
                })
            time.sleep(1)
        except Exception as e:
            print(f"⚠️ Error in {sub} (top-{t}): {e}")
            continue

# -------- SAVE RAW DATA --------
df = pd.DataFrame(all_posts)
df.drop_duplicates(subset="id", inplace=True)
print(f"\n✅ Collected {len(df)} unique NON-ADHD posts total.")

df.to_csv("non_adhd_dataset_raw.csv", index=False, encoding="utf-8")
print("💾 Saved dataset as 'non_adhd_dataset_raw.csv'.")
