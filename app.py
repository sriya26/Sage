from bson import Binary
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from datetime import datetime
from transformers import pipeline
from werkzeug.utils import secure_filename
from google.cloud import dialogflow_v2 as dialogflow
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
    user = user_details.find_one({"email": email, "password": password})
    if user:
        return jsonify({'success': True})
    else:
        return jsonify({'success': False})

@app.route('/signup', methods=['POST'])
def signup():
    name = request.form['name']
    email = request.form['email']
    password = request.form['password']
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


@app.route("/dialogflow", methods=["POST"])
def dialogflow_webhook():
    data = request.json
    user_input = data.get("message", "")
    session_id = data.get("session", "test-session")

    project_id = "sage-bot-465718"  # 👈 Replace this with your actual Dialogflow project ID

    session_client = dialogflow.SessionsClient()
    session = session_client.session_path(project_id, session_id)

    text_input = dialogflow.TextInput(text=user_input, language_code="en")
    query_input = dialogflow.QueryInput(text=text_input)

    try:
        response = session_client.detect_intent(
            request={"session": session, "query_input": query_input}
        )
        return jsonify({"reply": response.query_result.fulfillment_text})
    except Exception as e:
        return jsonify({"reply": f"Error: {str(e)}"}), 500


if __name__ == "__main__":
    app.run(debug=True)
