import fetch from "node-fetch";

export async function analyzeTerrariumImage(imageBase64) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: `
Sei un osservatore visivo neutro.
Descrivi SOLO ciò che è visivamente osservabile in un terrarium.
Non interpretare, non consigliare, non diagnosticare.

Usa ESCLUSIVAMENTE questo formato JSON:

{
  "vegetazione": {
    "colore": "",
    "uniformità": "",
    "densità": ""
  },
  "umidità": {
    "condensa": "",
    "distribuzione": ""
  },
  "substrato": {
    "colore": "",
    "aspetto": ""
  },
  "anomalie": ""
}
`
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Osserva questa immagine." },
            {
              type: "image_url",
              image_url: { url: imageBase64 }
            }
          ]
        }
      ]
    })
  });

  const data = await response.json();
  return data.choices[0].message.content;
}
