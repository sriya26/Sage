from bson import Binary
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from datetime import datetime, timedelta
from transformers import pipeline
from werkzeug.utils import secure_filename
import ollama
import bcrypt
import base64
import os
import json
import tempfile
from rag.rag_prompts import get_prompt_for_emotion
from analysis.pattern_analysis import generate_insights
from voice_pipeline import process_voice_entry

app = Flask(__name__)
CORS(app)  # Enable CORS to connect frontend to backend
app.config['UPLOAD_FOLDER'] = 'uploads/'

SYSTEM_PROMPT = (
    "You are Sage, a warm and empathetic mental wellness companion. "
    "Your role is to help users reflect on their emotions, feel heard, and find calm. "
    "Keep responses concise — 2 to 3 sentences. Be gentle, supportive, and non-clinical. "
    "Never diagnose or prescribe. If someone seems in crisis, encourage them to reach out "
    "to a mental health professional or a crisis line. Avoid bullet points — speak naturally. "
    "When a user seems sad or low, naturally mention 'calming music' or an 'uplifting video' as a suggestion. "
    "When a user seems anxious or stressed, naturally mention a 'breathing exercise' or 'grounding technique'. "
    "When a user seems happy or positive, naturally mention 'upbeat music' or suggest they 'write in your journal'."
)

# session_id -> list of {role, content} message dicts
chat_sessions = {}


#load the ml model pipeline
emotion_prediction = pipeline(
    "text-classification",
    model="j-hartmann/emotion-english-distilroberta-base",#for longer texts
    top_k=1  # top prediction only
)

# Connect to MongoDB
client = MongoClient("mongodb://localhost:27017/")
db = client["sage_db"]
journal_collection = db["journal_entries"]
user_details = db["user_details"]

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data['email']
    password = data['password']
    user = user_details.find_one({"email": email})
    if user and bcrypt.checkpw(password.encode(), user["password"]):
        return jsonify({'success': True})
    else:
        return jsonify({'success': False})

@app.route('/signup', methods=['POST'])
def signup():
    name = request.form['name']
    email = request.form['email']
    password = bcrypt.hashpw(request.form['password'].encode(), bcrypt.gensalt())
    gender = request.form['gender']
    picture = request.files.get('picture')
    picture_data = None

    if picture:
        picture_data = Binary(picture.read())

    user_details.insert_one({
        'name': name,
        'email': email,
        'password': password,
        'gender': gender,
        'picture': picture_data
    })

    return jsonify({'success': True})


@app.route("/submit_journal", methods=["POST"])
def submit_journal():
    data = request.get_json()
    entry_text = data.get("entry")
    date = data.get("date") or datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    user_email = data.get("email") 

    if not entry_text:
        return jsonify({"error": "Entry text is required"}), 400

    # Get emotion from model
    try:
        result = emotion_prediction(entry_text)[0]
        emotion = result[0]['label']
    except Exception as e:
        print("Model error:", e)
        emotion = "unknown"

    journal_collection.insert_one({
        "user_email": user_email,
        "entry": entry_text,
        "date": date,
        "emotion": emotion
    })

    suggested_prompt = get_prompt_for_emotion(emotion)

    return jsonify({
        "message": f"Journal entry saved with emotion: {emotion}",
        "suggested_prompt": suggested_prompt,
    }), 200

@app.route("/get_journals", methods=["POST"])
def get_journals():
    data = request.get_json()
    user_email = data.get("email")
    if not user_email:
        return jsonify({"error": "User email required"}), 400

    entries = list(journal_collection.find({"user_email": user_email}, {"_id": 0}))
    return jsonify(entries), 200


@app.route("/mood_history", methods=["POST"])
def mood_history():
    data = request.get_json()
    user_email = data.get("email")
    if not user_email:
        return jsonify({"error": "User email required"}), 400

    cutoff = datetime.now() - timedelta(days=30)
    all_entries = list(journal_collection.find(
        {"user_email": user_email},
        {"_id": 0, "date": 1, "emotion": 1}
    ))

    DATE_FORMATS = ["%B %d, %Y", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"]
    filtered = []
    for entry in all_entries:
        for fmt in DATE_FORMATS:
            try:
                if datetime.strptime(entry["date"], fmt) >= cutoff:
                    filtered.append(entry)
                break
            except ValueError:
                continue

    filtered.sort(key=lambda e: e["date"])
    return jsonify(filtered), 200


@app.route("/weekly_report", methods=["POST"])
def weekly_report():
    data = request.get_json()
    user_email = data.get("email")
    if not user_email:
        return jsonify({"error": "User email required"}), 400

    cutoff = datetime.now() - timedelta(days=7)
    all_entries = list(journal_collection.find(
        {"user_email": user_email},
        {"_id": 0, "date": 1, "emotion": 1}
    ))

    DATE_FORMATS = ["%Y-%m-%d", "%B %d, %Y", "%Y-%m-%d %H:%M:%S"]
    week_entries = []
    for entry in all_entries:
        for fmt in DATE_FORMATS:
            try:
                if datetime.strptime(entry["date"], fmt) >= cutoff:
                    week_entries.append(entry)
                break
            except ValueError:
                continue

    total = len(week_entries)
    if total == 0:
        return jsonify({"total": 0, "summary": "No entries this week. Start journaling to see your report.", "counts": {}, "percentages": {}, "dominant": None})

    counts = {}
    for entry in week_entries:
        e = entry["emotion"].lower()
        counts[e] = counts.get(e, 0) + 1

    dominant = max(counts, key=counts.get)
    pct = round(counts[dominant] / total * 100)

    tone_map = {
        "joy":     "a positive week",
        "surprise":"an eventful week",
        "neutral": "a steady week",
        "sadness": "a tough week",
        "fear":    "an anxious week",
        "anger":   "a challenging week",
        "disgust": "a difficult week",
    }
    tone = tone_map.get(dominant, "an interesting week")
    word = "time" if total == 1 else "times"
    summary = (
        f"You journaled {total} {word} this week — {tone}. "
        f"{dominant.capitalize()} was your most common mood ({pct}%)."
    )

    percentages = {e: round(c / total * 100) for e, c in counts.items()}

    return jsonify({
        "total": total,
        "dominant": dominant,
        "counts": counts,
        "percentages": percentages,
        "summary": summary,
    })


@app.route("/profile", methods=["POST"])
def profile():
    data = request.get_json()
    user_email = data.get("email")
    if not user_email:
        return jsonify({"error": "Email required"}), 400

    user = user_details.find_one({"email": user_email}, {"_id": 0, "password": 0})
    if not user:
        return jsonify({"error": "User not found"}), 404

    entries = list(journal_collection.find({"user_email": user_email}, {"_id": 0}))

    DATE_FORMATS = ["%Y-%m-%d", "%B %d, %Y", "%Y-%m-%d %H:%M:%S"]
    def parse_date(s):
        for fmt in DATE_FORMATS:
            try:
                return datetime.strptime(s, fmt)
            except ValueError:
                continue
        return None

    now = datetime.now()
    emotion_counts = {}
    month_count = 0
    date_set = set()

    for entry in entries:
        em = entry.get("emotion", "unknown").lower()
        emotion_counts[em] = emotion_counts.get(em, 0) + 1
        d = parse_date(entry.get("date", ""))
        if d:
            if d.year == now.year and d.month == now.month:
                month_count += 1
            date_set.add(d.date())

    # Streak: consecutive days ending today or yesterday
    streak = 0
    check = now.date()
    if check not in date_set:
        check -= timedelta(days=1)
    while check in date_set:
        streak += 1
        check -= timedelta(days=1)

    dominant = max(emotion_counts, key=emotion_counts.get) if emotion_counts else None

    picture_url = None
    if user.get("picture"):
        picture_url = "data:image/jpeg;base64," + base64.b64encode(bytes(user["picture"])).decode()

    recent = sorted(
        [e for e in entries if parse_date(e.get("date", ""))],
        key=lambda e: parse_date(e["date"]),
        reverse=True
    )[:5]

    return jsonify({
        "name": user.get("name"),
        "email": user.get("email"),
        "gender": user.get("gender"),
        "picture": picture_url,
        "stats": {
            "total": len(entries),
            "this_month": month_count,
            "streak": streak,
            "dominant_emotion": dominant,
            "emotion_counts": emotion_counts,
        },
        "recent_entries": recent,
    })


# Ollama setup (required before running this route):
#   1. Install Ollama: https://ollama.com/download  OR  brew install ollama
#   2. Start the service: brew services start ollama
#   3. Pull the model:    ollama pull llama3.2
@app.route("/chat", methods=["POST"])
def chat_with_sage():
    data = request.json
    user_input = data.get("message", "").strip()
    session_id = data.get("session", "default")

    if not user_input:
        return jsonify({"reply": ""}), 200

    history = chat_sessions.setdefault(session_id, [])
    history.append({"role": "user", "content": user_input})

    try:
        response = ollama.chat(
            model="llama3.2",
            messages=[{"role": "system", "content": SYSTEM_PROMPT}] + history,
        )
        reply = response["message"]["content"]
        history.append({"role": "assistant", "content": reply})

        # Keep history bounded to last 20 turns
        if len(history) > 20:
            chat_sessions[session_id] = history[-20:]

        return jsonify({"reply": reply})
    except Exception as e:
        print("Ollama error:", e)
        history.pop()  # remove the user message we optimistically added
        return jsonify({"reply": "I'm having trouble connecting right now. Please try again shortly."}), 500


@app.route("/insights", methods=["POST"])
def insights():
    data = request.get_json()
    user_email = data.get("email")
    if not user_email:
        return jsonify({"error": "Email required"}), 400
    return jsonify(generate_insights(user_email))


@app.route("/voice_journal", methods=["POST"])
def voice_journal():
    if "audio" not in request.files:
        return jsonify({"error": "No audio file"}), 400

    audio_file = request.files["audio"]
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
        audio_file.save(tmp.name)
        tmp_path = tmp.name

    try:
        result = process_voice_entry(tmp_path, emotion_prediction)
        return jsonify(result)
    except Exception as e:
        print("Voice pipeline error:", e)
        return jsonify({"error": str(e)}), 500
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


if __name__ == "__main__":
    app.run(debug=True, port=5001)
