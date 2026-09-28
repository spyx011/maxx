const chat = document.getElementById("chat");
const messageInput = document.getElementById("message");
const sendBtn = document.getElementById("sendBtn");
const clearBtn = document.getElementById("clearBtn");
const clock = document.getElementById("clock");

let history = [];

/* CLOCK */

function updateClock() {
  clock.textContent = new Date().toLocaleTimeString();
}

setInterval(updateClock, 1000);
updateClock();

/* MESSAGE */

function addMessage(text, type) {
  const wrapper = document.createElement("div");
  wrapper.className = `message ${type}`;

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  bubble.textContent = text;

  wrapper.appendChild(bubble);
  chat.appendChild(wrapper);

  chat.scrollTop = chat.scrollHeight;

  return bubble;
}

/* SEND */

async function sendMessage() {
  const message = messageInput.value.trim();

  if (!message) return;

  messageInput.value = "";

  const welcome = document.querySelector(".welcome");

  if (welcome) {
    welcome.remove();
  }

  addMessage(message, "user");

  const typing = addMessage("MAXX is thinking...", "ai");

  typing.classList.add("typing");

  sendBtn.disabled = true;

  try {
    const response = await fetch("/api/chat", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        message,
        history,
      }),
    });

    const data = await response.json();

    typing.parentElement.remove();

    if (!response.ok) {
      throw new Error(data.error || "AI request failed.");
    }

    addMessage(data.reply, "ai");

    history.push({
      role: "user",
      content: message,
    });

    history.push({
      role: "assistant",
      content: data.reply,
    });
  } catch (error) {
    typing.parentElement.remove();

    addMessage("⚠ MAXX connection error\n\n" + error.message, "ai");
  } finally {
    sendBtn.disabled = false;

    messageInput.focus();
  }
}

/* ENTER */

messageInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();

    sendMessage();
  }
});

/* SEND BUTTON */

sendBtn.addEventListener("click", sendMessage);

/* CLEAR */

clearBtn.addEventListener("click", () => {
  history = [];

  chat.innerHTML = `
            <div class="welcome">

                <div class="welcome-title">
                    What are we building?
                </div>

                <p>
                    I'm MAXX — your AI intelligence system.
                </p>

                <div class="suggestions">
                    <button>Explain quantum physics</button>
                    <button>Give me a coding idea</button>
                    <button>Help me build something</button>
                </div>

            </div>
        `;

  activateSuggestions();
});

/* SUGGESTIONS */

function activateSuggestions() {
  document.querySelectorAll(".suggestions button").forEach((button) => {
    button.addEventListener("click", () => {
      messageInput.value = button.textContent;

      messageInput.focus();
    });
  });
}

activateSuggestions();
