from bson import Binary
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from datetime import datetime, timedelta
from transformers import pipeline
from werkzeug.utils import secure_filename
from google.cloud import dialogflow_v2 as dialogflow
import bcrypt
import os
import json

app = Flask(__name__)
CORS(app)  # Enable CORS to connect frontend to backend
app.config['UPLOAD_FOLDER'] = 'uploads/'

#dialogflow key
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "sagebot-service.json"


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

    return jsonify({"message": f"Journal entry saved with emotion: {emotion}"}), 200

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


@app.route("/dialogflow", methods=["POST"])
def dialogflow_webhook():
    data = request.json
    user_input = data.get("message", "")
    session_id = data.get("session", "test-session")

    project_id = "sage-bot-465718"  # 👈 Replace this with your actual Dialogflow project ID

    try:
        session_client = dialogflow.SessionsClient()
        session = session_client.session_path(project_id, session_id)
        text_input = dialogflow.TextInput(text=user_input, language_code="en")
        query_input = dialogflow.QueryInput(text=text_input)
        response = session_client.detect_intent(
            request={"session": session, "query_input": query_input}
        )
        return jsonify({"reply": response.query_result.fulfillment_text})
    except Exception as e:
        print("Dialogflow error:", e)
        return jsonify({"reply": "I'm having trouble connecting right now. Please try again later."}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5001)
