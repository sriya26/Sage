import re
import pandas as pd
from datetime import datetime, timedelta
from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017/")
db = client["sage_db"]
journal_collection = db["journal_entries"]

DATE_FORMATS = ["%Y-%m-%d", "%Y-%m-%d %H:%M:%S", "%B %d, %Y"]

MOOD_SCORE = {
    "joy": 7, "surprise": 6, "neutral": 5,
    "sadness": 4, "fear": 3, "disgust": 2, "anger": 1,
}

LOW_MOOD         = {"sadness", "anger", "disgust", "fear"}
ANXIETY_EMOTIONS = {"fear", "anger", "disgust"}


def _parse_dt(date_str):
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    return None


def _time_of_day(hour):
    if 6  <= hour < 12: return "morning"
    if 12 <= hour < 17: return "afternoon"
    if 17 <= hour < 21: return "evening"
    return "night"


def peak_anxiety_time(df):
    """Day of week (and time of day when available) that anxiety emotions peak."""
    anx = df[df["emotion"].isin(ANXIETY_EMOTIONS)].copy()
    if anx.empty:
        return None

    anx["day_name"] = anx["dt"].dt.strftime("%A")
    timed = anx[anx["has_time"]].copy()

    if not timed.empty:
        timed["time_bucket"] = timed["dt"].dt.hour.apply(_time_of_day)
        combined = timed["day_name"] + "|" + timed["time_bucket"]
        top = combined.value_counts().idxmax()
        day, tod = top.split("|")
        return {"day": day, "time_of_day": tod}

    day = anx["day_name"].value_counts().idxmax()
    return {"day": day, "time_of_day": None}


def longest_low_mood_streak(df):
    """Longest consecutive calendar-day run of low-mood emotions."""
    low = df[df["emotion"].isin(LOW_MOOD)]
    if low.empty:
        return {"length": 0, "start": None}

    dates = sorted(low["dt"].dt.date.unique())

    best_len, best_start = 1, dates[0]
    cur_len,  cur_start  = 1, dates[0]

    for i in range(1, len(dates)):
        if (dates[i] - dates[i - 1]).days == 1:
            cur_len += 1
            if cur_len > best_len:
                best_len, best_start = cur_len, cur_start
        else:
            cur_len, cur_start = 1, dates[i]

    return {"length": best_len, "start": str(best_start)}


def dominant_emotion_this_week(df):
    """Most frequent emotion in the last 7 days."""
    cutoff = datetime.now() - timedelta(days=7)
    week = df[df["dt"] >= cutoff]
    if week.empty:
        return None
    return week["emotion"].value_counts().idxmax()


def mood_trend(df):
    """'improving', 'declining', or 'stable' based on week-over-week average score."""
    now = datetime.now()
    this_week = df[df["dt"] >= now - timedelta(days=7)]
    last_week = df[
        (df["dt"] >= now - timedelta(days=14)) &
        (df["dt"] <  now - timedelta(days=7))
    ]

    if this_week.empty or last_week.empty:
        return None

    diff = this_week["score"].mean() - last_week["score"].mean()
    if diff > 0.5:
        return "improving"
    if diff < -0.5:
        return "declining"
    return "stable"


def generate_insights(user_email):
    cutoff = datetime.now() - timedelta(days=90)

    raw = list(journal_collection.find(
        {"user_email": user_email},
        {"_id": 0, "date": 1, "emotion": 1},
    ))

    rows = []
    for e in raw:
        dt = _parse_dt(e.get("date", ""))
        if dt is None or dt < cutoff:
            continue
        emotion = (e.get("emotion") or "neutral").lower()
        rows.append({
            "dt":       dt,
            "has_time": bool(re.search(r"\d{1,2}:\d{2}", e.get("date", ""))),
            "emotion":  emotion,
            "score":    MOOD_SCORE.get(emotion, 5),
        })

    total = len(rows)
    if total < 7:
        return {"insufficient_data": True, "total": total}

    df = pd.DataFrame(rows)

    return {
        "insufficient_data":          False,
        "total":                      total,
        "peak_anxiety_time":          peak_anxiety_time(df),
        "longest_low_mood_streak":    longest_low_mood_streak(df),
        "dominant_emotion_this_week": dominant_emotion_this_week(df),
        "mood_trend":                 mood_trend(df),
    }