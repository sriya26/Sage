import os
import subprocess
import numpy as np
import librosa
import ollama
from typing import Optional
from typing_extensions import TypedDict
from langgraph.graph import StateGraph, END

_whisper_model = None

def _get_whisper():
    global _whisper_model
    if _whisper_model is None:
        import whisper
        _whisper_model = whisper.load_model("base")
    return _whisper_model

_VOICE_SYSTEM_PROMPT = (
    "You are Sage, a warm and empathetic mental wellness companion. "
    "When a user's words and voice tone don't fully match, acknowledge both layers with care. "
    "Keep responses to 2-3 sentences. Be gentle, non-clinical, and validating."
)


# ── Audio → wav conversion ────────────────────────────────────────────────────

def _to_wav(audio_path: str) -> str:
    wav_path = audio_path + ".wav"
    subprocess.run(
        ["ffmpeg", "-i", audio_path, "-ar", "22050", "-ac", "1", wav_path, "-y"],
        capture_output=True,
        check=True,
    )
    return wav_path


# ── Transcription ─────────────────────────────────────────────────────────────

def transcribe(audio_path: str) -> str:
    model = _get_whisper()
    result = model.transcribe(audio_path)
    return result["text"].strip()


# ── Audio feature extraction ──────────────────────────────────────────────────

def extract_audio_features(wav_path: str) -> dict:
    y, sr = librosa.load(wav_path, sr=None, mono=True)
    duration = librosa.get_duration(y=y, sr=sr)

    onsets = librosa.onset.onset_detect(y=y, sr=sr, units="time")
    speech_rate = len(onsets) / duration if duration > 0 else 0.0

    pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
    threshold = np.percentile(magnitudes[magnitudes > 0], 75) if magnitudes.any() else 0
    voiced = pitches[magnitudes >= threshold]
    voiced = voiced[voiced > 50]
    pitch_mean     = float(np.mean(voiced)) if voiced.size else 0.0
    pitch_variance = float(np.var(voiced))  if voiced.size else 0.0

    rms = librosa.feature.rms(y=y)[0]
    energy_variance = float(np.var(rms))

    return {
        "speech_rate":     round(speech_rate, 3),
        "pitch_mean":      round(pitch_mean, 2),
        "pitch_variance":  round(pitch_variance, 2),
        "energy_variance": round(energy_variance, 6),
    }


# ── Rule-based audio emotion signal ──────────────────────────────────────────

def audio_emotion_signal(features: dict) -> str:
    rate = features["speech_rate"]
    pv   = features["pitch_variance"]
    ev   = features["energy_variance"]
    pm   = features["pitch_mean"]

    if pv > 3000 and ev > 0.004:
        return "anxious"
    if ev > 0.006 and rate > 4.5:
        return "angry"
    if pm < 165 and rate < 2.5:
        return "sad"
    return "calm"


# ── Conflict detection ────────────────────────────────────────────────────────

_TEXT_VALENCE = {
    "joy":      "positive",
    "surprise": "positive",
    "neutral":  "neutral",
    "sadness":  "negative",
    "fear":     "negative",
    "disgust":  "negative",
    "anger":    "negative",
}

_CONFLICT_MESSAGES = {
    ("positive", "anxious"): "Your words seemed positive but your voice suggested tension — it's okay to acknowledge both.",
    ("positive", "angry"):   "Your words sounded upbeat, but your voice carried some intensity — feelings can be more layered than words.",
    ("positive", "sad"):     "Your words seemed cheerful, but your voice had a quieter, heavier tone — both can be true at once.",
    ("negative", "calm"):    "Your words expressed difficulty, but your voice sounded steady — you might be carrying more than you're letting on.",
    ("neutral",  "anxious"): "Your words seemed measured, but your voice hinted at underlying tension — it's worth sitting with that.",
    ("neutral",  "angry"):   "Your words were even-keeled, but your voice carried some edge — something may be bothering you beneath the surface.",
    ("neutral",  "sad"):     "Your words seemed neutral, but your voice had a quieter, heavier quality — it's okay to feel more than you say.",
}

def detect_conflict(text_emotion: str, audio_emotion: str) -> Optional[str]:
    tv = _TEXT_VALENCE.get(text_emotion.lower(), "neutral")
    return _CONFLICT_MESSAGES.get((tv, audio_emotion.lower()))


# ── LangGraph state ───────────────────────────────────────────────────────────

class VoiceState(TypedDict):
    audio_path:       str
    wav_path:         str
    transcript:       str
    text_emotion:     str
    features:         dict
    audio_emotion:    str
    conflict:         Optional[str]
    suggested_prompt: str
    ollama_response:  Optional[str]


# ── Graph factory ─────────────────────────────────────────────────────────────

_compiled_graph = None

def _build_graph(emotion_classifier):
    from rag.rag_prompts import get_prompt_for_emotion

    def transcribe_node(state: VoiceState) -> dict:
        wav_path   = _to_wav(state["audio_path"])
        transcript = transcribe(state["audio_path"])
        return {"wav_path": wav_path, "transcript": transcript}

    def classify_text_node(state: VoiceState) -> dict:
        transcript = state["transcript"]
        text_emotion = "neutral"
        if transcript:
            result = emotion_classifier(transcript)[0]
            text_emotion = result[0]["label"].lower()
        return {"text_emotion": text_emotion}

    def extract_audio_node(state: VoiceState) -> dict:
        features      = extract_audio_features(state["wav_path"])
        audio_emotion = audio_emotion_signal(features)
        return {"features": features, "audio_emotion": audio_emotion}

    def detect_conflict_node(state: VoiceState) -> dict:
        conflict = detect_conflict(state["text_emotion"], state["audio_emotion"])
        return {"conflict": conflict}

    def rag_prompt_node(state: VoiceState) -> dict:
        suggested_prompt = get_prompt_for_emotion(state["text_emotion"])
        return {"suggested_prompt": suggested_prompt}

    def ollama_node(state: VoiceState) -> dict:
        prompt = (
            f"The user journaled: \"{state['transcript']}\"\n"
            f"Their words convey {state['text_emotion']}, but their voice tone was {state['audio_emotion']}.\n"
            f"Conflict signal: {state['conflict']}\n"
            f"Gently acknowledge both layers of what they've expressed. "
            f"You may weave in this reflection: \"{state['suggested_prompt']}\"\n"
            f"Respond in 2-3 warm, non-clinical sentences."
        )
        try:
            response = ollama.chat(
                model="llama3.2",
                messages=[
                    {"role": "system", "content": _VOICE_SYSTEM_PROMPT},
                    {"role": "user",   "content": prompt},
                ],
            )
            return {"ollama_response": response["message"]["content"]}
        except Exception as e:
            print("Ollama error in voice pipeline:", e)
            return {"ollama_response": None}

    def route_after_rag(state: VoiceState) -> str:
        return "ollama" if state["conflict"] else END

    g = StateGraph(VoiceState)
    g.add_node("transcribe",      transcribe_node)
    g.add_node("classify_text",   classify_text_node)
    g.add_node("extract_audio",   extract_audio_node)
    g.add_node("detect_conflict", detect_conflict_node)
    g.add_node("rag_prompt",      rag_prompt_node)
    g.add_node("ollama",          ollama_node)

    g.set_entry_point("transcribe")
    g.add_edge("transcribe",      "classify_text")
    g.add_edge("classify_text",   "extract_audio")
    g.add_edge("extract_audio",   "detect_conflict")
    g.add_edge("detect_conflict", "rag_prompt")
    g.add_conditional_edges(
        "rag_prompt",
        route_after_rag,
        {"ollama": "ollama", END: END},
    )
    g.add_edge("ollama", END)

    return g.compile()


def _get_graph(emotion_classifier):
    global _compiled_graph
    if _compiled_graph is None:
        _compiled_graph = _build_graph(emotion_classifier)
    return _compiled_graph


# ── Main entry point ──────────────────────────────────────────────────────────

def process_voice_entry(audio_path: str, emotion_classifier) -> dict:
    graph = _get_graph(emotion_classifier)

    final_state = graph.invoke({
        "audio_path":       audio_path,
        "wav_path":         "",
        "transcript":       "",
        "text_emotion":     "neutral",
        "features":         {},
        "audio_emotion":    "calm",
        "conflict":         None,
        "suggested_prompt": "",
        "ollama_response":  None,
    })

    wav_path = final_state.get("wav_path", "")
    if wav_path and os.path.exists(wav_path):
        os.unlink(wav_path)

    return {
        "transcript":       final_state["transcript"],
        "text_emotion":     final_state["text_emotion"],
        "audio_emotion":    final_state["audio_emotion"],
        "features":         final_state["features"],
        "conflict":         final_state["conflict"],
        "suggested_prompt": final_state["suggested_prompt"],
        "ollama_response":  final_state["ollama_response"],
    }