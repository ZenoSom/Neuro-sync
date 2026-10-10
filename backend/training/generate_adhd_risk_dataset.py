import csv
import os
import random
from pathlib import Path
from typing import List, Dict

import numpy as np

BASE_DIR = Path(__file__).resolve().parent
FULL_OUTPUT = BASE_DIR / "adhd_risk_dataset_full.csv"
PREVIEW_OUTPUT = BASE_DIR / "adhd_risk_dataset_preview.csv"

LABELS = ["Low Risk", "Moderate Risk", "High Risk ADHD"]
LABEL_DISTRIBUTION = {
    "Low Risk": 0.35,
    "Moderate Risk": 0.35,
    "High Risk ADHD": 0.30,
}

SYNONYMS = {
    "distracted": ["distracted", "sidetracked", "pulled away", "easily drifted"],
    "impulsive": ["impulsive", "rash", "quick to react", "sudden"],
    "restless": ["restless", "jittery", "uneasy", "antsy"],
    "focus": ["focus", "concentration", "attention", "mental clarity"],
    "productive": ["productive", "effective", "steady", "high-performing"],
    "calm": ["calm", "steady", "collected", "composed"],
    "complete": ["finish", "complete", "wrap up", "carry through"],
    "task": ["task", "assignment", "project", "work"],
    "message": ["message", "note", "entry", "thought"],
    "today": ["today", "this morning", "this afternoon", "this evening"],
    "often": ["often", "frequently", "regularly", "many times"],
    "struggle": ["struggle", "have trouble", "find it hard", "fight"],
}

ADHD_PATTERNS = [
    "I got distracted by small noises and bounced around from one thing to the next.",
    "My mind was racing and I kept interrupting myself before finishing the first sentence.",
    "I felt impulsive and spent too much time on random ideas without completing the task.",
    "It is hard to stay still; I paced around the room while trying to work.",
    "I started ten things, but only a couple actually got finished.",
    "My thoughts kept shifting, and I became restless after only a few minutes.",
    "I lost my train of thought a lot and could not keep my attention on the task.",
    "Even though I wanted to focus, I got drawn into scrolling and could not stop.",
]

NON_ADHD_PATTERNS = [
    "I felt calm and clear-headed while I worked through my schedule.",
    "Today I finished most of my list and I stayed focused on one project at a time.",
    "I kept a steady pace and completed the work without getting distracted.",
    "I could concentrate for a long stretch and my productivity felt strong.",
    "I planned my day, followed through, and still had energy left to relax.",
    "It was easy to stay organized and I did not feel restless today.",
    "I maintained good attention and wrapped up each task with a sense of completion.",
    "I felt grounded and managed my priorities without feeling scattered.",
]

MIXED_PATTERNS = [
    "Some parts of the day were smooth, but I still had moments where I drifted off-task.",
    "I was productive in short bursts, then my focus faded and I had to start again.",
    "I can do well with structure, although I occasionally get restless and jump between ideas.",
    "I notice I finish the important stuff, but smaller details often slip away.",
    "I had productive stretches mixed with periods where I felt distracted and uneasy.",
    "My attention was decent, yet I felt a little impulsive and impatient at times.",
    "I completed most of my work, but I still struggled with tiny interruptions.",
    "I was mostly calm, but there were a few moments of racing thoughts.",
]

REALISTIC_TEMPLATES = [
    "I meant to answer emails first, but thoughts kept popping in and I ended up changing tasks.",
    "When the room got noisy, I drifted away from my work and could not get back quickly.",
    "I made a list and followed it, yet I still let small distractions slow me down.",
    "There were times I felt collected, but I also had a short fuse and weak attention.",
    "I noticed I can stay focused if the environment is quiet, otherwise I move too fast.",
    "My energy was all over the place: calm one moment and restless the next.",
    "I finished the important work, but I did not fully complete the minor details.",
    "I saw my own impulsiveness today when I decided to switch tasks without thinking.",
    "I could feel the urge to do something else even while I was already working.",
    "I felt productive during the morning, then by afternoon I was easily distracted.",
]

REALISTIC_CONTINUATIONS = [
    "I want to get better at tracking time and not bouncing between tabs.",
    "I am trying to break the day into clearer blocks so I do not lose momentum.",
    "I know the finish line is there, but I keep wandering before I get there.",
    "I can sense the difference when I am calm versus when I am rushed.",
    "I have low patience for long tasks, and it makes completion harder.",
    "I am aware that the quiet moments help me stay on task.",
    "I feel more productive when I set boundaries around my work sessions.",
    "I would like to reduce the impulsive breaks and stay with one thing longer.",
]

CONNECTORS = ["Also", "Then", "Still", "After that", "In the afternoon", "By evening", "However", "Even so", "For the most part"]


def weighted_choice(distribution: Dict[str, float]) -> str:
    labels = list(distribution.keys())
    weights = list(distribution.values())
    return random.choices(labels, weights=weights, k=1)[0]


def substitute_synonyms(text: str) -> str:
    tokens = text.split()
    new_tokens = []
    for token in tokens:
        key = token.lower().strip(".,?")
        if key in SYNONYMS and random.random() < 0.35:
            variant = random.choice(SYNONYMS[key])
            if token[0].isupper():
                variant = variant.capitalize()
            new_tokens.append(variant)
        else:
            new_tokens.append(token)
    return " ".join(new_tokens)


def build_sentences(label: str, style: str) -> List[str]:
    sentences = []
    chosen = set()
    mix = []

    if label == "High Risk ADHD":
        mix = ADHD_PATTERNS.copy() + MIXED_PATTERNS
    elif label == "Moderate Risk":
        mix = ADHD_PATTERNS + NON_ADHD_PATTERNS + MIXED_PATTERNS
    else:
        mix = NON_ADHD_PATTERNS.copy() + MIXED_PATTERNS

    if style == "realistic":
        mix += REALISTIC_TEMPLATES

    sentence_count = random.randint(3, 5)
    for i in range(sentence_count):
        pool = mix
        if style == "synthetic" and random.random() < 0.20:
            pool = pool + REALISTIC_CONTINUATIONS
        sentence = random.choice(pool)
        sentence = substitute_synonyms(sentence)

        if sentence in chosen:
            sentence = random.choice(pool)
        chosen.add(sentence)
        if i > 0 and random.random() < 0.35:
            sentence = f"{random.choice(CONNECTORS)}, {sentence[0].lower()}{sentence[1:]}"

        sentences.append(sentence)

    if style == "realistic" and random.random() < 0.65:
        sentences.append(random.choice(REALISTIC_CONTINUATIONS))

    return sentences


def sample_behavioral_values(label: str) -> Dict[str, int]:
    if label == "High Risk ADHD":
        focus = int(np.clip(np.random.normal(3.5, 1.4), 1, 10))
        hyperactivity = int(np.clip(np.random.normal(8.0, 1.2), 1, 10))
        completion = int(np.clip(np.random.normal(3.8, 1.3), 1, 10))
    elif label == "Moderate Risk":
        focus = int(np.clip(np.random.normal(5.8, 1.5), 1, 10))
        hyperactivity = int(np.clip(np.random.normal(5.2, 1.4), 1, 10))
        completion = int(np.clip(np.random.normal(5.8, 1.5), 1, 10))
    else:
        focus = int(np.clip(np.random.normal(8.1, 1.1), 1, 10))
        hyperactivity = int(np.clip(np.random.normal(2.8, 1.0), 1, 10))
        completion = int(np.clip(np.random.normal(8.3, 1.1), 1, 10))

    return {
        "focus": focus,
        "hyperactivity": hyperactivity,
        "completion": completion,
    }


def generate_text_entry(label: str, style: str) -> str:
    sentences = build_sentences(label, style)
    return " ".join(sentences).strip()


def build_dataset(num_rows: int = 8000, preview_rows: int = 50) -> List[Dict[str, object]]:
    if num_rows < preview_rows:
        raise ValueError("num_rows must be greater than preview_rows")

    rows = []
    seen_texts = set()
    styles = ["synthetic"] * int(num_rows * 0.70) + ["realistic"] * int(num_rows * 0.30)
    random.shuffle(styles)

    target_counts = {
        label: int(num_rows * LABEL_DISTRIBUTION[label]) for label in LABELS
    }
    remainder = num_rows - sum(target_counts.values())
    for i in range(remainder):
        target_counts[LABELS[i % len(LABELS)]] += 1

    label_pool = []
    for label, count in target_counts.items():
        label_pool.extend([label] * count)
    random.shuffle(label_pool)

    for idx in range(num_rows):
        label = label_pool[idx]
        style = styles[idx]
        text = generate_text_entry(label, style)

        attempts = 0
        while text in seen_texts and attempts < 6:
            text = generate_text_entry(label, style)
            attempts += 1
        if text in seen_texts:
            text = f"{text} " + random.choice(["I am aware of this pattern.", "I notice this often."])

        seen_texts.add(text)
        record = sample_behavioral_values(label)
        record["text"] = text
        record["label"] = label
        rows.append(record)

    random.Random(42).shuffle(rows)
    return rows


def save_dataset(rows: List[Dict[str, object]], path: Path) -> None:
    fieldnames = ["text", "focus", "hyperactivity", "completion", "label"]
    with path.open("w", encoding="utf-8", newline="") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames, quoting=csv.QUOTE_MINIMAL)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)
    print(f"Saved dataset to {path}")


def create_previews(rows: List[Dict[str, object]], path: Path, preview_size: int = 50) -> None:
    save_dataset(rows[:preview_size], path)
    print(f"Saved preview dataset to {path}")


def summarize_dataset(rows: List[Dict[str, object]]) -> None:
    counts = {label: 0 for label in LABELS}
    for row in rows:
        counts[row["label"]] += 1

    print("\nDataset summary:")
    total = len(rows)
    for label in LABELS:
        pct = counts[label] / total * 100
        print(f"- {label}: {counts[label]} rows ({pct:.1f}%)")

    focus_vals = [row["focus"] for row in rows]
    hyper_vals = [row["hyperactivity"] for row in rows]
    completion_vals = [row["completion"] for row in rows]
    print("\nBehavioral ranges:")
    print(f"- focus: {min(focus_vals)} to {max(focus_vals)}")
    print(f"- hyperactivity: {min(hyper_vals)} to {max(hyper_vals)}")
    print(f"- completion: {min(completion_vals)} to {max(completion_vals)}")


def main():
    random.seed(42)
    np.random.seed(42)

    dataset = build_dataset(num_rows=8000, preview_rows=50)
    save_dataset(dataset, FULL_OUTPUT)
    create_previews(dataset, PREVIEW_OUTPUT, preview_size=50)
    summarize_dataset(dataset)


if __name__ == "__main__":
    main()
