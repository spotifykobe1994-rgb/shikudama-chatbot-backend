import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const app = express();

app.use(cors());
app.use(express.json());

const conversations = {};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =========================
   SYSTEM PROMPT – CALENDIR
========================= */
const SYSTEM_PROMPT = fs.readFileSync(
  path.join(__dirname, "system_prompt.txt"),
  "utf-8"
);

/* =============================
   TEST ENDPOINT
   ============================= */

app.get("/", (req, res) => {
  res.json({ status: "shikudama chatbot backend attivo" });
});

/* =============================
   WIDGET ENDPOINT
   ============================= */

app.get("/widget", (req, res) => {
  res.sendFile(path.join(__dirname, "widget.html"));
});
/* =========================
   CHAT ENDPOINT
========================= */
app.post("/chat", async (req, res) => {
  const { message, sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: "sessionId mancante" });
  }

  // Se è la prima volta che vediamo questa sessione, la inizializziamo
  if (!conversations[sessionId]) {
    conversations[sessionId] = [
      {
        role: "system",
        content: SYSTEM_PROMPT
      }
    ];
  }

  // Aggiungiamo il messaggio dell’utente alla memoria
  conversations[sessionId].push({
    role: "user",
    content: message
  });

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: conversations[sessionId]
      })
    });

    const data = await response.json();
    const reply = data.choices[0].message.content;

    // Salviamo anche la risposta di Calendir
    conversations[sessionId].push({
      role: "assistant",
      content: reply
    });

    res.json({ reply });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Errore nel server" });
  }
});
