const SESSION_ID = 'sage-' + (localStorage.getItem('user_email') || Date.now());
let welcomeShown = false;

function toggleModal() {
  const modal = document.getElementById("chatbotModal");
  const isVisible = modal.classList.contains("show");

  if (isVisible) {
    modal.classList.remove("show");
    modal.style.display = "none";
  } else {
    modal.classList.add("show");
    modal.style.display = "flex";
    if (!welcomeShown) {
      showWelcome();
      welcomeShown = true;
    }
  }
}

function showWelcome() {
  appendBotMessage(
    "Hi, I'm Sage 🌿 I'm here to listen and support you. How are you feeling today?",
    false
  );
  showChips([
    { label: "😔 Feeling sad",     action: 'send',     value: "I'm feeling sad" },
    { label: "😰 Feeling anxious", action: 'send',     value: "I'm feeling anxious" },
    { label: "😊 Feeling good",    action: 'send',     value: "I'm feeling good" },
    { label: "🗺️ Explore Sage",    action: 'features' },
  ]);
}

function showFeatureGuide() {
  appendBotMessage(
    "Here's a quick tour of everything Sage offers — tap any feature to get started:",
    true
  );
  setTimeout(() => showChips([
    { label: "✍️ Write in journal",  action: 'navigate', value: '../journal/journal.html' },
    { label: "🎙️ Voice journaling",  action: 'send',     value: "How does voice journaling work?" },
    { label: "📊 Mood & patterns",   action: 'navigate', value: '../journey/journey.html' },
    { label: "👤 Profile & stats",   action: 'navigate', value: '../profile/profile.html' },
    { label: "🎵 Calming playlist",  action: 'open',     value: 'https://open.spotify.com/playlist/2pf4W9bfzSnbxqjaXEQUQy' },
  ]), 900);
}

// ── Message helpers ────────────────────────────────────────────────────────

function appendBotMessage(text, animate = true) {
  const chatBody = document.getElementById("chatbotBody");

  const row = document.createElement("div");
  row.className = "bot-message-row";

  const avatar = document.createElement("span");
  avatar.className = "bot-avatar";
  avatar.textContent = "🌿";

  const bubble = document.createElement("div");
  bubble.className = "bot-message";

  row.appendChild(avatar);
  row.appendChild(bubble);
  chatBody.appendChild(row);
  chatBody.scrollTop = chatBody.scrollHeight;

  if (animate) {
    typewriter(bubble, text);
  } else {
    bubble.textContent = text;
  }

  return { bubble, length: text.length };
}

function typewriter(el, text, speed = 16) {
  const chatBody = document.getElementById("chatbotBody");
  let i = 0;
  const tick = setInterval(() => {
    el.textContent += text[i++];
    chatBody.scrollTop = chatBody.scrollHeight;
    if (i >= text.length) clearInterval(tick);
  }, speed);
}

function showTypingIndicator() {
  const chatBody = document.getElementById("chatbotBody");
  const row = document.createElement("div");
  row.className = "bot-message-row";
  row.id = "typing-row";

  const avatar = document.createElement("span");
  avatar.className = "bot-avatar";
  avatar.textContent = "🌿";

  const indicator = document.createElement("div");
  indicator.className = "bot-message typing-indicator";
  indicator.innerHTML = "<span></span><span></span><span></span>";

  row.appendChild(avatar);
  row.appendChild(indicator);
  chatBody.appendChild(row);
  chatBody.scrollTop = chatBody.scrollHeight;
}

function hideTypingIndicator() {
  const row = document.getElementById("typing-row");
  if (row) row.remove();
}

// ── Chips ──────────────────────────────────────────────────────────────────

function showChips(chips) {
  const chatBody = document.getElementById("chatbotBody");
  const container = document.createElement("div");
  container.className = "chat-chips";

  chips.forEach(chip => {
    const btn = document.createElement("button");
    btn.textContent = chip.label;
    btn.className = chip.action === 'open' ? "chip chip-resource" : "chip";
    btn.onclick = () => {
      document.querySelectorAll(".chat-chips").forEach(c => c.remove());
      if (chip.action === 'open') {
        window.open(chip.value, "_blank");
      } else if (chip.action === 'navigate') {
        window.location.href = chip.value;
      } else if (chip.action === 'features') {
        showFeatureGuide();
      } else {
        sendMessage(chip.value);
      }
    };
    container.appendChild(btn);
  });

  chatBody.appendChild(container);
  chatBody.scrollTop = chatBody.scrollHeight;
}

function chipsForEmotion(type) {
  if (type === 'sad') return [
    { label: "Tell me more 💬",      action: 'send', value: "I'd like to talk more about how I'm feeling" },
    { label: "Calming Music 🎵",     action: 'open', value: "https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO" },
    { label: "Uplifting Video 🎥",   action: 'open', value: "https://www.youtube.com/watch?v=ZRI1k4kYmlI" },
  ];
  if (type === 'anxious') return [
    { label: "Help me calm down 🌬️", action: 'send', value: "Can you help me calm down right now?" },
    { label: "Breathing Exercise 🧘",action: 'open', value: "https://www.youtube.com/watch?v=nmFUDkj1Aq0" },
    { label: "Grounding Tips 📚",    action: 'open', value: "https://www.healthline.com/health/grounding-techniques" },
  ];
  if (type === 'happy') return [
    { label: "Keep this going 🌟",   action: 'send', value: "How can I maintain this positive feeling?" },
    { label: "Journal it ✍",         action: 'navigate', value: "../journal/journal.html" },
    { label: "Upbeat Music 🎶",      action: 'open', value: "https://www.youtube.com/watch?v=ZbZSe6N_BXs" },
  ];
  return [
    { label: "Tell me more 💭",      action: 'send', value: "Tell me more" },
    { label: "I need support 🤝",    action: 'send', value: "I need some support today" },
  ];
}

function detectEmotion(text) {
  const t = text.toLowerCase();
  if (t.match(/sad|down|depress|lonely|grief|unhappy|calming music|uplifting video/))
    return 'sad';
  if (t.match(/anxi|stress|panic|worry|overwhelm|breathing|grounding/))
    return 'anxious';
  if (t.match(/happy|great|good|joy|excit|wonderful|upbeat|journal/))
    return 'happy';
  return 'default';
}

// ── Input handlers ─────────────────────────────────────────────────────────

document.getElementById("chatInput").addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    e.preventDefault();
    const input = document.getElementById("chatInput");
    const msg = input.value.trim();
    if (msg) { sendMessage(msg); input.value = ""; }
  }
});

document.getElementById("send-icon").addEventListener("click", function () {
  const input = document.getElementById("chatInput");
  const msg = input.value.trim();
  if (msg) { sendMessage(msg); input.value = ""; }
});

// ── Core send ──────────────────────────────────────────────────────────────

function sendMessage(message) {
  const chatBody = document.getElementById("chatbotBody");

  document.querySelectorAll(".chat-chips").forEach(c => c.remove());

  const userBubble = document.createElement("div");
  userBubble.className = "user-message";
  userBubble.textContent = message;
  chatBody.appendChild(userBubble);
  chatBody.scrollTop = chatBody.scrollHeight;

  showTypingIndicator();

  fetch('http://localhost:5001/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, session: SESSION_ID }),
  })
    .then(r => r.json())
    .then(data => {
      hideTypingIndicator();
      const reply = data.reply || "I'm here for you. Could you share a bit more?";
      const { length } = appendBotMessage(reply);

      const emotion = detectEmotion(message + ' ' + reply);
      // Show chips after typewriter finishes
      setTimeout(() => showChips(chipsForEmotion(emotion)), length * 16 + 150);
    })
    .catch(err => {
      hideTypingIndicator();
      console.error("Chat error:", err);
      appendBotMessage("Oops! Something went wrong. Please try again.", false);
    });
}