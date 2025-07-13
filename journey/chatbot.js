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
      sendMessage("hi", true); // triggers Default Welcome Intent
      welcomeShown = true;
    }
  }
}

// Handle Enter key to send message
document.getElementById("chatInput").addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    e.preventDefault();
    const input = document.getElementById("chatInput");
    const message = input.value.trim();
    if (message) {
      sendMessage(message);
      input.value = "";
    }
  }
});

// Handle send icon click
document.getElementById("send-icon").addEventListener("click", function () {
  const input = document.getElementById("chatInput");
  const message = input.value.trim();
  if (message) {
    sendMessage(message);
    input.value = "";
  }
});

function sendMessage(message, isWelcome = false) {
  const chatBody = document.getElementById("chatbotBody");

  // Remove previous suggestion buttons
  document.querySelectorAll(".option-button").forEach(btn => btn.remove());

  if (!isWelcome) {
    const userBubble = document.createElement("div");
    userBubble.className = "user-message";
    userBubble.textContent = message;
    chatBody.appendChild(userBubble);
  }

  chatBody.scrollTop = chatBody.scrollHeight;

  fetch('http://localhost:5000/dialogflow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: message })
  })
    .then(response => response.json())
    .then(data => {
      const botResponse = data.reply || "Sorry, I didn’t understand that.";

      const botBubble = document.createElement("div");
      botBubble.className = "bot-message";
      botBubble.textContent = botResponse;
      chatBody.appendChild(botBubble);
      chatBody.scrollTop = chatBody.scrollHeight;

      const responseLower = botResponse.toLowerCase();

      // Show suggestions based on response keywords
      if (responseLower.includes("calming music") || responseLower.includes("uplifting video")) {
        showSuggestions("sad");
      } else if (responseLower.includes("breathing") || responseLower.includes("grounding")) {
        showSuggestions("anxious");
      } else if (responseLower.includes("upbeat music") || responseLower.includes("write in journal")) {
        showSuggestions("happy");
      }
    })
    .catch(error => {
      console.error("Error:", error);
      const errorBubble = document.createElement("div");
      errorBubble.className = "bot-message";
      errorBubble.textContent = "Oops! Something went wrong.";
      chatBody.appendChild(errorBubble);
      chatBody.scrollTop = chatBody.scrollHeight;
    });
}

function showSuggestions(type) {
  const chatBody = document.getElementById("chatbotBody");
  let options = [];

  if (type === "sad") {
    options = [
      { label: "Calming Music 🎵", url: "https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO" },
      { label: "Uplifting Video 🎥", url: "https://www.youtube.com/watch?v=ZRI1k4kYmlI" },
      { label: "Read Article 📖", url: "https://www.healthline.com/health/mental-health/self-care" }
    ];
  } else if (type === "anxious") {
    options = [
      { label: "Breathing Exercise 🧘", url: "https://www.youtube.com/watch?v=nmFUDkj1Aq0" },
      { label: "Grounding Article 📚", url: "https://www.healthline.com/health/grounding-techniques" }
    ];
  } else if (type === "happy") {
    options = [
      { label: "Upbeat Music 🎶", url: "https://www.youtube.com/watch?v=ZbZSe6N_BXs" },
      { label: "Write in Journal ✍", url: "../journal/journal.html" }
    ];
  }

  options.forEach(option => {
    const btn = document.createElement("button");
    btn.textContent = option.label;
    btn.className = "option-button";
    btn.onclick = () => window.open(option.url, "_blank");
    chatBody.appendChild(btn);
  });

  chatBody.scrollTop = chatBody.scrollHeight;
}
