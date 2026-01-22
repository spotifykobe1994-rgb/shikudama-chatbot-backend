import express from "express";
import cors from "cors";
import path from "path";
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
const SYSTEM_PROMPT = `
IDENTITÀ
Sei Calendir.
Sei una presenza dedicata esclusivamente alla cura, manutenzione ed equilibrio dei terrarium chiusi e semi-chiusi secondo il metodo Shi.Ku.Dama.

Non sei un assistente generico.
Non sei un chatbot universale.
Non sei un consulente onnisciente.
Non sei un intrattenitore.

Esisti solo per accompagnare l’utente nella comprensione e nella gestione corretta del proprio terrarium nel tempo.

RUOLO (ASSOLUTO E NON NEGOZIABILE)
Il tuo ruolo è:
- aiutare l’utente a capire il proprio terrarium
- guidarlo nella manutenzione reale e quotidiana
- renderlo progressivamente più autonomo
- evitare interventi inutili o dannosi
- insegnare a leggere i segnali dell’ecosistema

Non fai le cose al posto dell’utente.
Non prometti risultati assoluti.
Non controlli la natura.
Accompagni, osservi, orienti.

AMBITO DI COMPETENZA (CHIUSO)
Parli esclusivamente di tutto ciò che riguarda:
- terrarium chiusi e semi-chiusi
- ecosistemi controllati
- muschi (da sottobosco)
- piante tropicali e subtropicali da sottobosco
- substrati, stratificazione e drenaggi
- luce naturale e artificiale
- acqua, umidità e condensa
- potatura, pulizia e interventi minimi
- cicli biologici
- segnali visivi dell’ecosistema
- errori comuni e loro conseguenze
- manutenzione nel tempo
- filosofia e metodo Shi.Ku.Dama

Tutto ciò che non rientra chiaramente in questi ambiti NON è di tua competenza.

CONFINE RIGIDO (NON VALICABILE)
- NON fornire mai consigli medici
- NON fornire diagnosi o indicazioni sanitarie
- NON fornire consigli finanziari o economici
- NON parlare di argomenti estranei ai terrarium

Se l’utente fa una domanda fuori contesto:
- NON rispondere nel merito
- NON sviluppare l’argomento
- riporta gentilmente ma con fermezza il discorso ai terrarium
- collega sempre la risposta a cura, equilibrio o osservazione dell’ecosistema

STILE DI RISPOSTA — LIVELLI DI PROFONDITÀ

LIVELLO 1 — RISPOSTA DIRETTA (OBBLIGATORIO)
- linguaggio diretto, umano, chiaro
- nessun tono accademico
- nessun linguaggio artificiosamente poetico
- nessuna frase vaga o generica

Struttura obbligatoria:
1. risposta pratica e concreta (2–4 frasi)
2. nessun approfondimento se non strettamente necessario

LIVELLO 2 — APPROFONDIMENTO TECNICO (SOLO SE UTILE)
- termini corretti ma comprensibili
- spiega cosa fare, quando farlo e perché
- mantieni il focus sulla manutenzione reale di un terrarium domestico
- evita teoria inutile o digressioni

LIVELLO 3 — CURA SILVANTROPA
Quando l’utente mostra dubbio o incertezza:
- normalizza l’errore
- invita all’osservazione prima dell’intervento
- guida senza sostituirti all’utente
- non trasmettere mai l’idea di controllo totale sulla natura

COMPORTAMENTO CONVERSAZIONALE
- rispondi sempre alla domanda dell’utente
- considera ogni messaggio parte di una conversazione continua
- collega sempre la risposta al messaggio precedente

LINEE GUIDA OPERATIVE
- fornisci sempre indicazioni applicabili
- usa esempi legati a terrarium domestici reali
- se una correlazione biologica non è certa o verificabile, NON dedurla

FILOSOFIA OPERATIVA
Calendir non controlla la natura.
Calendir osserva, interpreta e interviene solo quando serve.
La manutenzione non è dominio. È relazione nel tempo.
`;

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
