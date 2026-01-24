import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ===============================
// SETUP BASE
// ===============================
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Serve per usare __dirname con ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===============================
// MEMORIA CONVERSAZIONALE (RAM)
// ===============================
const conversations = {};

// ===============================
// MANUTENZIONE (FILE DINAMICI)
// ===============================
const MANUTENZIONE_DIR = path.join(__dirname, "manutenzione");

function loadManutenzioneFile(filename) {
  try {
    const filePath = path.join(MANUTENZIONE_DIR, filename);
    return fs.readFileSync(filePath, "utf-8");
  } catch (err) {
    console.error("Errore lettura file manutenzione:", filename);
    return null;
  }
}

function detectManutenzioneTopic(message) {
  const text = message.toLowerCase();

  if (text.includes("acqua") || text.includes("innaffi")) return "acqua.md";
  if (text.includes("luce") || text.includes("illumin")) return "luce.md";
  if (text.includes("condensa")) return "condensa.md";
  if (text.includes("aprire") || text.includes("apertura")) return "apertura.md";
  if (text.includes("pulizia") || text.includes("pulire")) return "pulizia.md";
  if (text.includes("potatura") || text.includes("potare")) return "potatura.md";
  if (text.includes("microfauna") || text.includes("insetti")) return "microfauna.md";
  if (text.includes("temperatura") || text.includes("caldo") || text.includes("freddo")) return "temperatura.md";
  if (
    text.includes("problemi") ||
    text.includes("muffa") ||
    text.includes("odore") ||
    text.includes("marcio")
  ) return "problemi_comuni.md";

  return null;
}

// ===============================
// WIDGET CALENDIR (HTML)
// ===============================
app.get("/widget", (req, res) => {
  res.sendFile(path.join(__dirname, "widget.html"));
});

// ===============================
// ENDPOINT ROOT
// ===============================
app.get("/", (req, res) => {
  res.json({ status: "Calendir backend attivo" });
});

// ===============================
// ENDPOINT CHAT
// ===============================
app.post("/chat", async (req, res) => {
  try {
    const { message, userId } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Messaggio mancante" });
    }

    // Fallback sicuro per Wix
    const sessionId = userId || "wix-default";

    // Inizializza la conversazione se non esiste
    if (!conversations[sessionId]) {
      const systemPrompt = fs.readFileSync(
        path.join(__dirname, "prompts", "system_prompt.txt"),
        "utf-8"
      );

      conversations[sessionId] = [
        { role: "system", content: systemPrompt }
      ];
    }

    // ===============================
    // MESSAGGIO UTENTE
    // ===============================
    conversations[sessionId].push({
      role: "user",
      content: message
    });

    // ===============================
    // CONTESTO MANUTENZIONE DINAMICO
    // ===============================
    const manutenzioneFile = detectManutenzioneTopic(message);

    if (manutenzioneFile) {
      const manutenzioneContent = loadManutenzioneFile(manutenzioneFile);

      if (manutenzioneContent) {
        conversations[sessionId].push({
          role: "system",
          content: `
Contesto tecnico di manutenzione Shi.Ku.Dama.
Usa queste informazioni SOLO se pertinenti alla domanda.
Non riportare il testo integralmente.
Mantieni il tono di Calendir.

${manutenzioneContent}
`
        });
      }
    }

    // ===============================
    // CHIAMATA OPENAI
    // ===============================
    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.4,
          messages: conversations[sessionId]
        })
      }
    );

    const data = await response.json();

    const reply =
      data.choices?.[0]?.message?.content ||
      "Non ho una risposta utile in questo momento.";

    // Salva risposta nella memoria
    conversations[sessionId].push({
      role: "assistant",
      content: reply
    });

    res.json({ reply });

  } catch (error) {
    console.error("Errore Calendir:", error);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// ===============================
// AVVIO SERVER
// ===============================
app.listen(PORT, () => {
  console.log(`Calendir attivo sulla porta ${PORT}`);
});
