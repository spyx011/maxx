const chatArea = document.getElementById("chatArea");
const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const welcome = document.getElementById("welcome");
const newChat = document.getElementById("newChat");

let history = [];

// ==========================================
// SEND MESSAGE
// ==========================================

async function sendMessage(text = null) {
  const message = (text || input.value).trim();

  if (!message) return;

  input.value = "";

  welcome.style.display = "none";

  addMessage("user", message);

  const loading = addMessage("ai", "MAXX is thinking...");

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

    if (!response.ok) {
      throw new Error(data.error || "Request failed");
    }

    loading.remove();

    addMessage("ai", data.reply);

    history.push({
      role: "user",
      content: message,
    });

    history.push({
      role: "assistant",
      content: data.reply,
    });
  } catch (error) {
    loading.remove();

    addMessage("ai", "⚠️ MAXX couldn't respond right now.");

    console.error(error);
  }
}

// ==========================================
// ADD MESSAGE
// ==========================================

function addMessage(type, text) {
  const message = document.createElement("div");

  message.className = `message ${type}`;

  const content = document.createElement("div");

  content.className = "message-content";

  content.textContent = text;

  message.appendChild(content);

  chatArea.appendChild(message);

  chatArea.scrollTop = chatArea.scrollHeight;

  return message;
}

// ==========================================
// FILE UPLOAD
// ==========================================

async function uploadFile(file) {
  if (!file) return;

  welcome.style.display = "none";

  addMessage("user", `📎 Uploaded: ${file.name}`);

  const loading = addMessage("ai", "MAXX is analyzing your file...");

  const formData = new FormData();

  formData.append("file", file);

  try {
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Upload failed");
    }

    loading.remove();

    addMessage("ai", data.reply);
  } catch (error) {
    loading.remove();

    addMessage("ai", `⚠️ MAXX couldn't analyze the file.\n\n${error.message}`);

    console.error(error);
  }
}

// ==========================================
// FILE PICKER
// ==========================================

const fileInput = document.createElement("input");

fileInput.type = "file";

fileInput.accept =
  ".txt,.js,.py,.cs,.html,.css,.json,.md,.xml,.csv,.java,.cpp,.c,.h";

fileInput.style.display = "none";

document.body.appendChild(fileInput);

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];

  if (file) {
    uploadFile(file);
  }

  fileInput.value = "";
});

// ==========================================
// CREATE UPLOAD BUTTON
// ==========================================

const uploadBtn = document.createElement("button");

uploadBtn.type = "button";

uploadBtn.textContent = "📎";

uploadBtn.title = "Upload a file";

uploadBtn.className = "upload-btn";

uploadBtn.addEventListener("click", () => {
  fileInput.click();
});

input.parentElement.insertBefore(uploadBtn, input);

// ==========================================
// SEND BUTTON
// ==========================================

sendBtn.addEventListener("click", () => {
  sendMessage();
});

// ==========================================
// ENTER
// ==========================================

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();

    sendMessage();
  }
});

// ==========================================
// AUTO RESIZE
// ==========================================

input.addEventListener("input", () => {
  input.style.height = "auto";

  input.style.height = Math.min(input.scrollHeight, 160) + "px";
});

// ==========================================
// SUGGESTIONS
// ==========================================

document.querySelectorAll("[data-prompt]").forEach((button) => {
  button.addEventListener("click", () => {
    sendMessage(button.dataset.prompt);
  });
});

// ==========================================
// NEW CHAT
// ==========================================

newChat.addEventListener("click", () => {
  history = [];

  chatArea.innerHTML = "";

  chatArea.appendChild(welcome);

  welcome.style.display = "block";

  input.value = "";
});
