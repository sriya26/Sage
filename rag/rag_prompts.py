# ChromaDB collection is built on first run and persists locally to rag/chroma_db/.
# On subsequent restarts the collection is loaded directly — no re-embedding needed.

import os
import chromadb
from sentence_transformers import SentenceTransformer

PROMPTS = [
    # Joy
    {"emotion": "joy", "text": "What specific moments today made you feel joyful? What values were being honored in those moments?"},
    {"emotion": "joy", "text": "How can you build on this positive feeling to strengthen a relationship or work toward a meaningful goal?"},
    {"emotion": "joy", "text": "What personal strengths did you use today that contributed to this feeling of joy?"},
    {"emotion": "joy", "text": "What does this joy tell you about what matters most to you in life?"},
    {"emotion": "joy", "text": "How might you carry this positive energy into a challenge you have been putting off?"},

    # Sadness
    {"emotion": "sadness", "text": "What thought is contributing most to your sadness right now? Is there evidence that challenges or complicates that thought?"},
    {"emotion": "sadness", "text": "What would you say to a close friend who was feeling exactly the way you feel right now?"},
    {"emotion": "sadness", "text": "What have you lost or what are you grieving? What did it mean to you, and how can you honor that meaning?"},
    {"emotion": "sadness", "text": "Is there an unmet need underneath this sadness? What would it look like to gently meet that need today?"},
    {"emotion": "sadness", "text": "What is one small, compassionate act you can do for yourself in the next hour?"},
    {"emotion": "sadness", "text": "What is one thing, however small, that brought you even a moment of comfort or connection today?"},

    # Anger
    {"emotion": "anger", "text": "What triggered your anger? What need or boundary do you feel was violated?"},
    {"emotion": "anger", "text": "What story are you telling yourself about this situation? What is another plausible way to interpret it?"},
    {"emotion": "anger", "text": "How will this situation likely feel in five years? What does that perspective change for you right now?"},
    {"emotion": "anger", "text": "What would a calm, wise version of yourself do or say in this situation?"},
    {"emotion": "anger", "text": "Beneath the anger, is there hurt, fear, or disappointment? Can you describe what that deeper feeling is?"},
    {"emotion": "anger", "text": "What is within your control in this situation, and what is not? What would letting go of the rest feel like?"},

    # Fear
    {"emotion": "fear", "text": "What specifically are you afraid of? What is the worst realistic outcome, and what would you do if it happened?"},
    {"emotion": "fear", "text": "What evidence do you have that the feared outcome will actually come true? What evidence suggests it might not?"},
    {"emotion": "fear", "text": "What has helped you move through a frightening situation in the past? What strengths did you draw on?"},
    {"emotion": "fear", "text": "If the thing you fear came true, what internal or external resources would you draw on to cope?"},
    {"emotion": "fear", "text": "What is this fear preventing you from doing that matters deeply to you? Is the cost worth it?"},
    {"emotion": "fear", "text": "What would you do differently today if you were just ten percent less afraid?"},

    # Disgust
    {"emotion": "disgust", "text": "What values are behind your feeling of disgust? What does this reaction reveal about what you believe is right?"},
    {"emotion": "disgust", "text": "Is your reaction proportionate to the situation, or could something else be amplifying its intensity?"},
    {"emotion": "disgust", "text": "What boundary do you need to set or reinforce to protect your values and wellbeing?"},
    {"emotion": "disgust", "text": "Can you separate the action or behavior from the person involved? What does making that distinction shift for you?"},
    {"emotion": "disgust", "text": "How does holding onto this feeling serve you — or does it? What would it mean to release some of it?"},

    # Surprise
    {"emotion": "surprise", "text": "Were you surprised in a positive or negative way? What did you expect instead, and why?"},
    {"emotion": "surprise", "text": "What does this unexpected event reveal about your assumptions or your mental model of the situation?"},
    {"emotion": "surprise", "text": "How can you use this surprise as useful information about yourself, others, or the world around you?"},
    {"emotion": "surprise", "text": "What opportunity might be hidden within this unexpected situation, even if it feels uncomfortable?"},
    {"emotion": "surprise", "text": "What would it look like to approach this new situation with curiosity and openness rather than judgment?"},

    # Neutral
    {"emotion": "neutral", "text": "Even on a quiet day, what is one thing you can genuinely appreciate about yourself or your life?"},
    {"emotion": "neutral", "text": "What would make tomorrow feel more meaningful, energizing, or connected?"},
    {"emotion": "neutral", "text": "Is there something you have been putting off thinking about? What is one small, manageable step you could take toward it?"},
    {"emotion": "neutral", "text": "What are three things — however small — that went okay or better than expected today?"},
    {"emotion": "neutral", "text": "What are you looking forward to, and is there anything standing in the way? How might you address it?"},
]

_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_model = SentenceTransformer("all-MiniLM-L6-v2")
_client = chromadb.PersistentClient(path=os.path.join(_BASE_DIR, "chroma_db"))
_collection = _client.get_or_create_collection("cbt_prompts")

if _collection.count() == 0:
    texts = [p["text"] for p in PROMPTS]
    embeddings = _model.encode(texts).tolist()
    _collection.add(
        ids=[str(i) for i in range(len(PROMPTS))],
        embeddings=embeddings,
        documents=texts,
        metadatas=[{"emotion": p["emotion"]} for p in PROMPTS],
    )


def get_prompt_for_emotion(emotion: str) -> str:
    query_embedding = _model.encode([emotion]).tolist()
    results = _collection.query(query_embeddings=query_embedding, n_results=1)
    return results["documents"][0][0]