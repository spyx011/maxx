require("doteenv").config();

const express = require("express");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.static(__dirname));

const PORT = 3000;

app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({
        error: "Message is required.",
      });
    }

    const messages = [
      {
        role: "system",
        content: `
You are MAXX, a fast, intelligent and friendly AI assistant.

Be useful, direct and conversational.
Give clear answers.
Do not unnecessarily repeat yourself.
When explaining technical things, make them easy to understand.
                `,
      },
      ...history.slice(-20),
      {
        role: "user",
        content: message,
      },
    ];

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openrouter/free",
          messages,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(data);

      return res.status(response.status).json({
        error: data.error?.message || "AI request failed.",
      });
    }

    const reply = data.choices?.[0]?.message?.content;

    res.json({
      reply: reply || "MAXX didn't receive a response.",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`MAXX is running at http://localhost:${PORT}`);
});
