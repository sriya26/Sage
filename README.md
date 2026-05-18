# 🌿 Sage: Your Mindful Companion

Sage is a web-based mental wellness companion designed to help users track emotions, reflect through journaling, and engage in light therapy using calming content. With AI-powered conversational support using a local LLM via Ollama, Sage provides a safe space to express feelings and find suitable coping tools.

---

## 💡 Features

- 🤖 **AI Chatbot**: Conversational interface powered by a local Llama 3.2 model via Ollama — empathetic, context-aware, and fully offline. Conversation history is persisted to MongoDB so sessions survive server restarts. Offers smart action chips to continue the chat, navigate the app, or access resources.
- 📝 **Emotion-Based Journaling**: Write journal entries with automatic emotion tagging using a DistilRoBERTa model. After each submission, a RAG pipeline (sentence-transformers + ChromaDB) retrieves a personalised CBT reflection prompt matched to the detected emotion. Supports photo attachments and bookmarking entries.
- 🗑️ **Delete Entries**: Hover over any entry on the home page to reveal a trash icon, or use the delete button inside the entry detail view. A styled in-app confirmation modal prevents accidental deletions.
- 🔍 **Entry Search**: Real-time search bar on the home page filters entries by text content, working in combination with the emotion filter chips.
- 🎛️ **Dynamic Emotion Filter**: Home page entry list includes filter chips derived only from emotions actually present in the user's data — chips appear and disappear as new emotions are detected.
- 📊 **Mood Timeline**: Line chart of the last 30 days of emotion data, with each point coloured by emotion and a labelled y-axis mapping emotions to a mood valence scale.
- 📋 **Weekly Mood Report**: Auto-generated end-of-week summary showing emotion distribution bars and a natural-language sentence describing the week's emotional tone.
- 👤 **Profile & Dashboard**: Personal profile page showing your photo, name, and stat cards (total entries, this month, day streak, top emotion), a mood breakdown donut chart, recent entries, and a dedicated Saved Entries section for bookmarked journal entries. Supports profile photo and name updates.
- 📖 **Entry Detail View**: Tap any journal entry to open the full text, emotion badge, attached photo, and bookmark status in a dedicated page. Includes a delete button.
- 🔎 **Pattern Insights**: Pandas-powered analysis of the last 90 days surfaces four personal insights — peak anxiety day/time, longest low-mood streak, dominant emotion this week, and week-over-week mood trend.
- 🎙️ **Voice Journaling**: Record a voice entry directly in the journal page. A LangGraph pipeline transcribes it with Whisper (local, no API key), classifies the text emotion with DistilRoBERTa, and extracts audio features (speech rate, pitch, energy) with librosa to infer a separate voice-tone emotion. When the two signals disagree, a conflict is detected and Ollama generates a nuanced, empathetic response acknowledging both layers. All results appear in a structured voice journal card below the text box.
- 🎶 **Therapy Recommendations**: Contextual resource suggestions (calming music, breathing exercises, grounding articles, uplifting videos) surfaced automatically based on detected emotion.
- 🔑 **Forgot Password**: Users can reset their password directly from the login page by entering their email and a new password — no email required.
- 🔒 **Secure Authentication**: bcrypt-hashed passwords, email-based user identity stored in MongoDB.

---

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- Flask
- MongoDB (running as a background service)
- Ollama with the `llama3.2` model
- ffmpeg (for voice audio conversion)

### Installation

```bash
git clone https://github.com/sriya26/Sage.git
cd Sage
pyenv virtualenv 3.11.7 sage-env
pyenv local sage-env
pip install -r requirements.txt
```

### ffmpeg Setup

```bash
brew install ffmpeg
```

### Ollama Setup

```bash
# Install Ollama
brew install ollama

# Start as a background service (auto-restarts on login)
brew services start ollama

# Pull the model (~2 GB, one-time download)
ollama pull llama3.2
```

### MongoDB Setup

```bash
# Install and start MongoDB (auto-restarts on login)
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb/brew/mongodb-community
```

### Run the App

```bash
python app.py
```

Then open `index.html` in your browser. Flask runs on `http://localhost:5001`.

---

## 🧠 Local LLM (Ollama)

Sage uses a locally running Llama 3.2 model via Ollama for the chatbot — no API key or internet connection required. The `/chat` route loads and saves per-user conversation history (up to 20 turns) from MongoDB, so context persists across page reloads and server restarts. A system prompt gives the model the Sage wellness persona.

---

## 🔍 RAG Pipeline (Reflection Prompts)

After each journal submission, Sage surfaces a personalised CBT reflection prompt using a lightweight retrieval-augmented generation pipeline:

1. The DistilRoBERTa model detects the emotion in the entry (e.g. `sadness`, `anger`, `joy`).
2. The emotion label is embedded with `all-MiniLM-L6-v2` (sentence-transformers).
3. ChromaDB performs a nearest-neighbour search over a curated bank of 38 CBT-style prompts (5–6 per emotion), persisted locally to `rag/chroma_db/`.
4. The closest prompt is returned and displayed as a "Reflect on this" card below the journal entry box.

The vector store is built on first run and reloaded on subsequent restarts — no re-embedding needed.

---

## 🎙️ Voice Journaling Pipeline

`voice_pipeline.py` implements the full voice entry flow as a **LangGraph** state graph. Each step is a discrete node; the graph branches after conflict detection.

```
transcribe → classify_text → extract_audio → detect_conflict → rag_prompt ──┬──(conflict)──→ ollama → END
                                                                              └──(no conflict)──────────→ END
```

| Node | Tool | Output |
|---|---|---|
| `transcribe` | openai-whisper (base, local) | `transcript` |
| `classify_text` | DistilRoBERTa via HuggingFace | `text_emotion` |
| `extract_audio` | librosa onset/piptrack/RMS | `features`, `audio_emotion` |
| `detect_conflict` | Rule-based valence lookup | `conflict` message or `None` |
| `rag_prompt` | ChromaDB nearest-neighbour | `suggested_prompt` |
| `ollama` | Llama 3.2 (conditional) | `ollama_response` |

**Conflict detection** buckets the text emotion into `positive` / `neutral` / `negative` and compares it against the audio-inferred tone (`calm`, `anxious`, `angry`, `sad`). Disagreements produce a specific empathetic message and trigger the Ollama node for a deeper, personalised response.

The Whisper model and compiled graph are both lazy-loaded and cached — no reload cost after the first request.

---

## 📈 Pattern Analysis

`analysis/pattern_analysis.py` queries the last 90 days of journal entries and runs four functions over a pandas DataFrame:

| Function | What it finds |
|---|---|
| `peak_anxiety_time` | Day of week (and time of day when timestamps are present) when fear/anger/disgust cluster most |
| `longest_low_mood_streak` | Longest consecutive calendar-day run of sadness/anger/disgust/fear |
| `dominant_emotion_this_week` | Most frequent emotion in the last 7 days |
| `mood_trend` | Week-over-week shift in average mood score (joy = 7 … anger = 1); returns `improving`, `declining`, or `stable` |

Results are served by the `/insights` route and rendered on the journey dashboard. If the user has fewer than 7 entries, a friendly prompt is shown instead.

---

## 📁 Project Structure

```
Sage/
├── app.py
├── voice_pipeline.py       ← LangGraph voice journaling pipeline
├── requirements.txt
├── rag/
│   ├── rag_prompts.py
│   └── chroma_db/          ← persisted ChromaDB vector store (auto-created)
├── analysis/
│   └── pattern_analysis.py
├── assets/
│   └── favicon.svg
├── fonts/
├── journal/
│   ├── journal.html
│   ├── journal.css
│   └── journal.js
├── journey/
│   ├── journey.html
│   ├── journey.css
│   ├── journey.js
│   ├── chatbot.js
│   ├── chatbot.css
│   ├── entry-detail.html
│   ├── entry-detail.css
│   └── entry-detail.js
├── profile/
│   ├── profile.html
│   ├── profile.css
│   └── profile.js
├── index.html
├── styles.css
└── login.js
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## ✨ Acknowledgements

* Ollama & Meta Llama 3.2 for local LLM inference
* Hugging Face Transformers & j-hartmann/emotion-english-distilroberta-base for emotion recognition
* PyTorch for model inference
* sentence-transformers (all-MiniLM-L6-v2) & ChromaDB for RAG reflection prompts
* openai-whisper for local audio transcription
* librosa for audio feature extraction (speech rate, pitch, energy)
* LangGraph for orchestrating the voice journaling pipeline
* pandas for pattern analysis and mood trend computation
* Chart.js for mood visualisations
* MongoDB for local data storage
* Spotify & YouTube for therapeutic content
* Healthline articles for grounding and self-care references

---

## 🤍 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you'd like to change.

---

Stay mindful :)
