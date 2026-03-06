export const config = { api: { bodyParser: { sizeLimit: "10mb" } } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_KEY) return res.status(500).json({ error: "No API key" });

  try {
    const { audio } = req.body;
    if (!audio) return res.status(400).json({ error: "No audio" });

    const base64Data = audio.replace(/^data:audio\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const formData = new FormData();
    formData.append("file", new Blob([buffer], { type: "audio/webm" }), "recording.webm");
    formData.append("model", "whisper-1");
    formData.append("language", "ru");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_KEY}` },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Whisper error: ${response.status} — ${err}`);
    }

    const data = await response.json();
    return res.status(200).json({ ok: true, text: data.text });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
