import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// 👁️ OCCHIO — IMPORT
import { analyzeTerrariumImage } from "./vision.js";

// ===============================
// SETUP BASE
// ===============================
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

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
    return fs.readFileSync(path.join(MANUTENZIONE_DIR, filename), "utf-8");
  } catch {
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
  )
    return "problemi_comuni.md";

  return null;
}

// ===============================
// WIDGET CALENDIR
// ===============================
app.get("/widget", (req, res) => {
  res.sendFile(path.join(__dirname, "widget.html"));
});

app.get("/", (req, res) => {
  res.json({ status: "Calendir backend attivo" });
});

// ===============================
// CHAT
// ===============================
app.post("/chat", async (req, res) => {
  try {
    const { message, userId, imageBase64 } = req.body;

    if (!message && !imageBase64) {
      return res.status(400).json({ error: "Messaggio mancante" });
    }

    const sessionId = userId || "wix-default";

    if (!conversations[sessionId]) {
      const systemPrompt = fs.readFileSync(
        path.join(__dirname, "prompts", "system_prompt.txt"),
        "utf-8"
      );

      conversations[sessionId] = [{ role: "system", content: systemPrompt }];
    }

    // ===============================
    // 👁️ OCCHIO — ANALISI IMMAGINE (AGGIUNTA)
    // ===============================
    let visualObservation = null;

    if (imageBase64) {
      visualObservation = await analyzeTerrariumImage(imageBase64);
    }

    // ===============================
    // MESSAGGIO UTENTE (INVARIATO)
    // ===============================
    if (imageBase64) {
      conversations[sessionId].push({
        role: "user",
        content: message || "Ho inviato un'immagine"
      });
    } else {
      conversations[sessionId].push({
        role: "user",
        content: message
      });
    }

    // ===============================
    // 👁️ OCCHIO — PASSAGGIO A CALENDIR (AGGIUNTA)
    // ===============================
    if (visualObservation) {
      conversations[sessionId].push({
        role: "system",
        content: `
OSSERVAZIONE VISIVA AFFIDABILE (DERIVATA DA ANALISI DELL'IMMAGINE):

${visualObservation}

Usa queste osservazioni come base per l’accompagnamento secondo Shi.Ku.Dama.
`
      });
    }

    // ===============================
    // CONTESTO MANUTENZIONE (INVARIATO)
    // ===============================
    if (message) {
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
    }

    // ===============================
    // CHIAMATA OPENAI (CALENDIR)
    // ===============================
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.4,
        messages: conversations[sessionId]
      })
    });

    const data = await response.json();
    const reply =
      data.choices?.[0]?.message?.content ||
      "Non ho una risposta utile in questo momento.";

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
app.listen(PORT, () => {
  console.log(`Calendir attivo sulla porta ${PORT}`);
});
