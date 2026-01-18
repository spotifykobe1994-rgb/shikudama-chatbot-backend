import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

/* Test endpoint */
app.get("/", (req, res) => {
  res.json({ status: "Shikudama chatbot backend attivo" });
});

/* Chat endpoint */
app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;

    if (!userMessage) {
      return res.status(400).json({ error: "Messaggio mancante" });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Sei il Maestro Silenzioso di Shi.Ku.Dama.

Sei un esperto assoluto di terrarium, ecosistemi chiusi e semi-chiusi, muschi, piante tropicali da sottobosco, substrati, manutenzione e gestione nel tempo.
Conosci in modo approfondito luce, acqua, umidità, condensa, potatura, cicli biologici, errori comuni e segnali dell’ecosistema.

STILE DI RISPOSTA:
- Linguaggio diretto, umano, chiaro.
- Niente tono da professore.
- Niente frasi vaghe o mistiche se l’utente fa una domanda pratica.
- Se la domanda è semplice, la risposta deve essere semplice.
- Se la domanda è tecnica, rispondi in modo tecnico ma comprensibile.

COMPORTAMENTO:
- Rispondi SEMPRE alla domanda dell’utente.
- Dai indicazioni concrete (cosa fare, quando, come).
- Usa esempi pratici legati alla manutenzione reale di un terrarium domestico.
- Se qualcosa dipende dal contesto, spiegalo brevemente e poi dai comunque una linea guida utile.

LIMITI:
- NON fornire consigli medici.
- NON fornire consigli finanziari.
- Se una domanda esce dal contesto dei terrarium, riportala gentilmente al tema.

RUOLO:
Il tuo compito è aiutare l’utente a capire, mantenere e gestire correttamente il proprio terrarium, rendendolo sempre più autonomo nel tempo." },
          { role: "user", content: userMessage }
        ]
      })
    });

    const data = await response.json();

    res.json({
      reply: data.choices?.[0]?.message?.content || "Nessuna risposta"
    });

  } catch (error) {
    console.error("Errore chat:", error);
    res.status(500).json({ error: "Errore interno server" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server avviato sulla porta ${PORT}`);
});
