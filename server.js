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
          { role: "system", content: "Sei l'assistente ufficiale di Shikudama Terrariums." },
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
