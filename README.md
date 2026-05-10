# 🌿 Sage: Your Mindful Companion

Sage is a web-based mental wellness companion designed to help users track emotions, reflect through journaling, and engage in light therapy using calming content. With AI-powered conversational support using a local LLM via Ollama, Sage provides a safe space to express feelings and find suitable coping tools.

---

## 💡 Features

- 🤖 **AI Chatbot**: Conversational interface powered by a local Llama 3.2 model via Ollama — empathetic, context-aware, and fully offline. Remembers conversation history within a session and offers smart action chips to continue the chat or access resources.
- 📝 **Emotion-Based Journaling**: Users can write journal entries with automatic emotion tagging using a DistilRoBERTa emotion recognition model built with PyTorch and Hugging Face Transformers.
- 📊 **Mood Timeline**: Line chart of the last 30 days of emotion data, with each point coloured by emotion and a labelled y-axis mapping emotions to a mood valence scale.
- 📋 **Weekly Mood Report**: Auto-generated end-of-week summary showing emotion distribution bars and a natural-language sentence describing the week's emotional tone.
- 👤 **Profile & Dashboard**: Personal profile page showing your photo, name, and four stat cards (total entries, this month, day streak, top emotion), plus a mood breakdown donut chart and recent entries list.
- 📖 **Entry Detail View**: Tap any journal entry to open the full text in a dedicated page styled to match the journal page.
- 🎶 **Therapy Recommendations**: Contextual resource suggestions (calming music, breathing exercises, grounding articles, uplifting videos) surfaced automatically based on detected emotion.
- 🔒 **Secure Authentication**
- 💬 **Connect with a Therapist**: Suggests options to seek professional help based on user mood triggers (coming soon).

---

## 🖼️ Sample Screens

<img src="assets/sample1.PNG" width="400"/>
<img src="assets/sample2.png" width="400"/>
<img src="assets/sample3.PNG" height="400"/>

---

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- Flask
- MongoDB (running as a background service)
- Ollama with the `llama3.2` model

### Installation

```bash
git clone https://github.com/sriya26/Sage.git
cd Sage
pyenv virtualenv 3.11.7 sage-env
pyenv local sage-env
pip install -r requirements.txt
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

Sage uses a locally running Llama 3.2 model via Ollama for the chatbot — no API key or internet connection required. The `/chat` route maintains per-session conversation history (up to 20 turns) and uses a system prompt that gives the model the Sage wellness persona.

---

## 📁 Project Structure

```
Sage/
├── app.py
├── requirements.txt
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
* Chart.js for mood visualisations
* MongoDB for local data storage
* Spotify & YouTube for therapeutic content
* Healthline articles for grounding and self-care references

---

## 🤍 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you'd like to change.

---

Stay mindful :)