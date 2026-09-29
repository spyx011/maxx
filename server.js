require("dotenv").config();

const express = require("express");
const Groq = require("groq-sdk");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname));

const MAX_HISTORY = 20;

// ==========================================
// FILE UPLOAD CONFIG
// ==========================================

const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const allowedExtensions = new Set([
  ".txt",
  ".js",
  ".py",
  ".cs",
  ".html",
  ".css",
  ".json",
  ".md",
  ".xml",
  ".csv",
  ".java",
  ".cpp",
  ".c",
  ".h",
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const safeName =
      Date.now() + "-" + file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");

    cb(null, safeName);
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },

  fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();

    if (!allowedExtensions.has(extension)) {
      return cb(
        new Error(
          "Unsupported file type. MAXX currently supports text and code files.",
        ),
      );
    }

    cb(null, true);
  },
});

// ==========================================
// MAXX PERSONALITY
// ==========================================

const MAXX_SYSTEM = `
You are MAXX, a personal AI assistant created by WNXVRA.

IDENTITY
- Your name is MAXX.
- You are an intelligent, fast and friendly AI.
- You help with coding, technology, science, creativity, learning and problem solving.

PERSONALITY
- Be confident but never pretend to know something you don't.
- Be friendly and natural.
- Explain complicated things simply.
- Give practical solutions.
- When coding, provide working code and explain where it goes.
- Don't unnecessarily repeat information.
- Don't claim you performed actions you cannot actually perform.

FILE ANALYSIS
- When a user uploads a file, carefully analyze its contents.
- If they ask about the file, base your answer on the uploaded content.
- For code, identify bugs, errors, improvements and explain them clearly.
- Never claim that a file contains something that is not present.
- If the file is too large or incomplete, say so.

STYLE
- Keep normal answers concise.
- Use headings and bullet points when useful.
- For code, use proper code blocks.
- Match the user's level of knowledge.
`;

// ==========================================
// NORMAL CHAT
// ==========================================

app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "Please enter a message.",
      });
    }

    const safeHistory = Array.isArray(history)
      ? history
          .filter(
            (item) =>
              item &&
              (item.role === "user" || item.role === "assistant") &&
              typeof item.content === "string",
          )
          .slice(-MAX_HISTORY)
      : [];

    const conversation = [
      ...safeHistory,
      {
        role: "user",
        content: message.trim(),
      },
    ];

    const response = await client.chat.completions.create({
      model: "llama-3.1-70b-versatile",
      messages: [
        {
          role: "system",
          content: MAXX_SYSTEM,
        },
        ...conversation,
      ],
    });

    const reply = response.choices[0]?.message?.content;

    if (!reply) {
      return res.status(500).json({
        error: "MAXX received an empty response.",
      });
    }

    res.json({
      reply,
    });
  } catch (error) {
    console.error("MAXX ERROR:", error);

    res.status(500).json({
      error: "MAXX couldn't process that request.",
    });
  }
});

// ==========================================
// FILE ANALYSIS
// ==========================================

app.post("/api/upload", upload.single("file"), async (req, res) => {
  let uploadedPath = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        error: "No file uploaded.",
      });
    }

    uploadedPath = req.file.path;

    const fileContent = fs.readFileSync(uploadedPath, "utf8");

    const fileName = req.file.originalname;

    // Prevent extremely large text from being sent to the model
    const MAX_FILE_CHARS = 100000;

    const trimmedContent = fileContent.slice(0, MAX_FILE_CHARS);

    const response = await client.responses.create({
      model: "gpt-5-mini",

      instructions: MAXX_SYSTEM,

      input: [
        {
          role: "user",
          content: `
The user uploaded this file:

Filename:
${fileName}

File contents:
--------------------
${trimmedContent}
--------------------

Analyze this file and be ready to answer questions about it.
If the content was truncated, mention that when relevant.
`,
        },
      ],
    });

    const reply = response.output_text;

    if (!reply) {
      return res.status(500).json({
        error: "MAXX could not analyze the file.",
      });
    }

    res.json({
      success: true,
      filename: fileName,
      reply,
    });
  } catch (error) {
    console.error("UPLOAD ERROR:", error);

    res.status(500).json({
      error: error.message || "MAXX couldn't process the uploaded file.",
    });
  } finally {
    // Delete temporary file
    if (uploadedPath && fs.existsSync(uploadedPath)) {
      try {
        fs.unlinkSync(uploadedPath);
      } catch (deleteError) {
        console.error("Could not delete temporary file:", deleteError);
      }
    }
  }
});

// ==========================================
// ERROR HANDLER
// ==========================================

app.use((error, req, res, next) => {
  console.error("SERVER ERROR:", error);

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: "File is too large. Maximum size is 10 MB.",
      });
    }
  }

  res.status(400).json({
    error: error.message || "Something went wrong.",
  });
});

// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════╗
║        MAXX AI ONLINE        ║
╠══════════════════════════════╣
║ Status: ONLINE               ║
║ Model:  GPT-5-mini           ║
║ File Tool: ENABLED           ║
║ Max File: 10 MB              ║
╚══════════════════════════════╝
`);
});
