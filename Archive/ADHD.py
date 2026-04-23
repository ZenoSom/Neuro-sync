import praw
import pandas as pd
import time
from tqdm import tqdm

# -------- AUTHENTICATION (REMOVED SECRETS) --------
# NOTE: This script is archived. See research_adhd_pipeline/ for the updated version.
reddit = None # Removed for security

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

print(f"📥 Starting data fetch from {len(subreddits)} ADHD/neurodivergent subreddits...\n")

time_filters = ["day", "week", "month", "year", "all"]
categories = ["hot", "new", "rising", "top"]

for sub in tqdm(subreddits, desc="Subreddits scraping"):
    print(f"\n>>> Processing subreddit: {sub}")
    subreddit = reddit.subreddit(sub)

    for category in categories:
        for t in (time_filters if category == "top" else [None]):
            source = subreddit.top if category == "top" else getattr(subreddit, category)
            time_filter_arg = {'time_filter': t} if t else {}
            print(f"  Fetching {category}{' '+t if t else ''} posts in {sub}")

            try:
                posts = source(limit=1000, **time_filter_arg)
                for i, post in enumerate(posts):
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
                                "score": post.score,
                                "num_comments": post.num_comments,
                                "created_utc": post.created_utc,
                                "url": post.url,
                                "category": category,
                                "time_filter": t if t else "none"
                            })
                            authors_set.add(author)

                    if (i + 1) % 100 == 0:
                        print(f"    Processed {i + 1} posts in {sub} ({category} {t if t else 'none'})")

                time.sleep(2)
            except Exception as e:
                print(f"  [ERROR] Subreddit {sub}, Category {category}, TimeFilter {t}: {e}")
                continue

df_posts = pd.DataFrame(all_posts).drop_duplicates(subset="id")

print(f"\n✅ Collected {len(df_posts)} unique posts from {len(subreddits)} subreddits.")
print(f"👥 Estimated unique users: {len(authors_set)}")

df_posts.to_csv("adhd_dataset_18plus_posts.csv1", index=False, encoding="utf-8")

print("💾 Dataset saved as 'adhd_dataset_18plus_posts.csv1'.")
