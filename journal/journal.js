// Set today's date dynamically
const today = new Date();
const options = { year: 'numeric', month: 'long', day: 'numeric' };
document.getElementById('date-heading').textContent = today.toLocaleDateString(undefined, options) + " entry";

// Handle submit
const form = document.getElementById('journal-form');
const textarea = form.querySelector('textarea');

// Assume email is saved in localStorage after login/signup
const userEmail = localStorage.getItem('user_email');

//Insert journal entry in Mongo DB
document.addEventListener("DOMContentLoaded", function () {
    const dateHeading = document.getElementById("date-heading");
    const submitBtn = document.getElementById("submit-btn");
    const journalInput = document.getElementById("journal-entry");
    const successMsg = document.getElementById("success-message");
    const analysing = document.getElementById("analysing-message");
    const emptyMsg = document.getElementById("empty-message");

    // Set date on screen
    const today = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = today.toLocaleDateString(undefined, options);
    dateHeading.textContent = formattedDate + " entry";
    const isoDate = today.toISOString().slice(0, 10);

    // Word count
    const wordCountEl = document.getElementById("word-count");
    journalInput.addEventListener("input", function () {
        const words = journalInput.value.trim().split(/\s+/).filter(Boolean).length;
        wordCountEl.textContent = words === 0 ? "0 words" : `${words} word${words === 1 ? "" : "s"}`;
    });

    // Voice recording
    const voiceBtn = document.getElementById("voice-btn");
    const recordingIndicator = document.getElementById("recording-indicator");
    let mediaRecorder = null;
    let audioChunks = [];
    let isRecording = false;

    voiceBtn.addEventListener("click", async function () {
        if (!isRecording) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                audioChunks = [];
                mediaRecorder = new MediaRecorder(stream);
                mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
                mediaRecorder.onstop = async () => {
                    const blob = new Blob(audioChunks, { type: "audio/webm" });
                    stream.getTracks().forEach(t => t.stop());
                    recordingIndicator.classList.remove("show");
                    voiceBtn.classList.remove("recording");
                    analysing.classList.add("show");

                    const formData = new FormData();
                    formData.append("audio", blob, "recording.webm");
                    formData.append("email", userEmail);

                    try {
                        const res = await fetch("http://localhost:5001/voice_journal", {
                            method: "POST",
                            body: formData,
                        });
                        const data = await res.json();
                        analysing.classList.remove("show");
                        if (data.transcript) {
                            journalInput.value = data.transcript;
                            const words = journalInput.value.trim().split(/\s+/).filter(Boolean).length;
                            wordCountEl.textContent = `${words} word${words === 1 ? "" : "s"}`;
                            showVoiceResultCard(data);
                        }
                    } catch (err) {
                        analysing.classList.remove("show");
                        console.error("Voice journal error:", err);
                    }
                };
                mediaRecorder.start();
                isRecording = true;
                voiceBtn.classList.add("recording");
                recordingIndicator.classList.add("show");
            } catch (err) {
                console.error("Mic access denied:", err);
            }
        } else {
            mediaRecorder.stop();
            isRecording = false;
        }
    });

    function showVoiceResultCard(data) {
        const existing = document.getElementById("voice-result-card");
        if (existing) existing.remove();

        const conflictSection = data.conflict ? `
            <div class="vr-section vr-conflict">
                <span class="vr-label">signal mismatch</span>
                <p class="vr-text">${data.conflict}</p>
            </div>` : "";

        const ollamaSection = data.ollama_response ? `
            <div class="vr-section vr-sage-response">
                <span class="vr-label">sage says</span>
                <p class="vr-text">${data.ollama_response}</p>
            </div>` : "";

        const promptSection = data.suggested_prompt ? `
            <div class="vr-section vr-prompt">
                <span class="vr-label">reflect on this</span>
                <p class="vr-text vr-italic">${data.suggested_prompt}</p>
            </div>` : "";

        const card = document.createElement("div");
        card.id = "voice-result-card";
        card.className = "voice-result-card";
        card.innerHTML = `
            <div class="vr-header">
                <div class="sage-avatar">S</div>
                <div>
                    <span class="sage-who">Sage · voice journal</span>
                    <div class="vr-tags">
                        <span class="vr-tag">text: <strong>${data.text_emotion}</strong></span>
                        <span class="vr-tag-dot"></span>
                        <span class="vr-tag">voice: <strong>${data.audio_emotion}</strong></span>
                    </div>
                </div>
            </div>
            ${conflictSection}
            ${ollamaSection}
            ${promptSection}
        `;
        document.querySelector(".container").appendChild(card);
    }

    // Submit handler
    submitBtn.addEventListener("click", function (e) {
        e.preventDefault();

        const entry = journalInput.value.trim();

        if (entry === "") {
            emptyMsg.classList.add("show");
            setTimeout(() => {
                emptyMsg.classList.remove("show");
            }, 3000);
            return;
        }

        analysing.classList.add("show");

        fetch("http://localhost:5001/submit_journal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                entry: entry,
                date: isoDate,
                email: userEmail
            })
        })
        .then(res => res.json())
        .then(data => {
            analysing.classList.remove("show");
            successMsg.classList.add("show");
            journalInput.value = "";
            setTimeout(() => {
                successMsg.classList.remove("show");
            }, 3000);
            if (data.suggested_prompt) {
                showReflectionCard(data.suggested_prompt);
            }
        })
        .catch(err => {
            analysing.classList.remove("show");
            console.error("Error submitting journal:", err);
        });
    });

    function showReflectionCard(prompt) {
        const existing = document.getElementById("reflection-card");
        if (existing) existing.remove();

        const card = document.createElement("div");
        card.id = "reflection-card";
        card.className = "reflection-card";
        card.innerHTML = `
            <div class="sage-avatar">S</div>
            <div class="sage-bubble-content">
                <span class="sage-who">Sage · reflect on this</span>
                <p class="sage-prompt-text">${prompt}</p>
            </div>
        `;
        document.querySelector(".container").appendChild(card);
    }
});
