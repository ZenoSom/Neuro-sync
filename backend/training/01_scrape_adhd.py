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

# -------- SUBREDDITS LIST --------
subreddits = [
    "ADHD", "ADHDWomen", "ADHD_Community", "ADHDHelp", "ADHD_Programmers",
    "adhd_anxiety", "adhd_tips", "Neurodivergent", "Neurodiversity"
]

# -------- KEYWORDS TO FILTER POSTS FOR ADULTS --------
adult_keywords = [
    "adult", "college", "university", "in my 20s", "in my 30s", "in my 40s", "in my 50s",
    "work", "job", "career", "as an adult", "i'm 18", "i'm 19", "grown-up", "grown up",
    "adult adhd", "adult diagnosis", "grownup", "diagnosed as adult", "late diagnosis",
    "recent diagnosis", "dx as adult", "struggle with adhd", "living with adhd",
    "adhd symptoms adult", "adhd in adults", "adhd adult life", "adult adhd life",
    "adult adhd brain", "adhd coping", "adhd challenges adult", "adhd treatment adult",
    "adhd medication adult", "diagnosed recently", "just diagnosed", "new diagnosis"
]

exclude_keywords = [
    "teen", "high school", "my child", "kids", "children", "my son", "my daughter",
    "school age", "middle school", "elementary"
]

def is_likely_adult(text):
    lower_text = text.lower()
    includes = any(k in lower_text for k in adult_keywords)
    excludes = any(k in lower_text for k in exclude_keywords)
    return includes and not excludes

all_posts = []
authors_set = set()

print(f"📥 Starting data fetch from {len(subreddits)} ADHD subreddits (SECURED)...\n")

time_filters = ["day", "week", "month", "year", "all"]
categories = ["hot", "new", "rising", "top"]

for sub in tqdm(subreddits, desc="Subreddits scraping"):
    print(f"\n>>> Processing subreddit: {sub}")
    subreddit = reddit.subreddit(sub)

    for category in categories:
        for t in (time_filters if category == "top" else [None]):
            source = subreddit.top if category == "top" else getattr(subreddit, category)
            time_filter_arg = {'time_filter': t} if t else {}
            
            try:
                # Limit sets to 10 for demonstration; original was 1000
                posts = source(limit=10, **time_filter_arg) 
                for post in posts:
                    combined_text = f"{post.title} {post.selftext}"
                    if is_likely_adult(combined_text):
                        author = post.author.name if post.author else "[deleted]"
                        if author != "[deleted]":
                            all_posts.append({
                                "subreddit": sub,
                                "id": post.id,
                                "title": post.title,
                                "text": post.selftext,
                                "author": author,
                                "label": "ADHD"
                            })
                            authors_set.add(author)
                time.sleep(1)
            except Exception as e:
                print(f"  [ERROR] {sub}: {e}")

# Determine the directory of the current script
script_dir = os.path.dirname(os.path.abspath(__file__))
output_path = os.path.join(script_dir, "adhd_posts_raw.csv")

# Save the CSV
df_posts = pd.DataFrame(all_posts).drop_duplicates(subset="id")
df_posts.to_csv(output_path, index=False, encoding="utf-8")

print(f"\n✅ Collected {len(df_posts)} unique ADHD posts.")
print(f"💾 Saved as '{output_path}'.")
