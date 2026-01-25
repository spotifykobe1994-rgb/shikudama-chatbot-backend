import fs from "fs";
import path from "path";

const OBS_DIR = path.join(process.cwd(), "observations");

if (!fs.existsSync(OBS_DIR)) {
  fs.mkdirSync(OBS_DIR);
}

export async function analyzeTerrariumImage(imageBase64, sessionId) {
  const previousObservation = loadPreviousObservation(sessionId);

  // ===== OSSERVAZIONE VISIVA =====
  const observationResponse = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: `
Sei un osservatore visivo esperto di terrarium.
Descrivi SOLO ciò che è visivamente osservabile.
Non interpretare, non diagnosticare.
Se qualcosa non è chiaramente visibile, dichiaralo.
`
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Osserva questa immagine di un terrarium." },
            {
              type: "image_url",
              image_url: { url: imageBase64 }
            }
          ]
        }
      ]
    })
  });

  const observationData = await observationResponse.json();
  const currentObservation = observationData.choices?.[0]?.message?.content || "";

  // ===== CONFRONTO CON PRECEDENTE =====
  let comparison = null;

  if (previousObservation) {
    const comparisonResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0,
        messages: [
          {
            role: "system",
            content: `
Confronta due osservazioni visive dello stesso terrarium.
Segnala SOLO differenze visivamente osservabili.
`
          },
          {
            role: "user",
            content: `
OSSERVAZIONE PRECEDENTE:
${previousObservation}

OSSERVAZIONE ATTUALE:
${currentObservation}
`
          }
        ]
      })
    });

    const comparisonData = await comparisonResponse.json();
    comparison = comparisonData.choices?.[0]?.message?.content || null;
  }

  saveObservation(sessionId, currentObservation);

  return {
    current: currentObservation,
    comparison
  };
}

// ===== FILE SYSTEM =====

function getFilePath(sessionId) {
  return path.join(OBS_DIR, `${sessionId}.json`);
}

function loadPreviousObservation(sessionId) {
  const file = getFilePath(sessionId);
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, "utf-8");
}

function saveObservation(sessionId, observation) {
  fs.writeFileSync(getFilePath(sessionId), observation);
}
