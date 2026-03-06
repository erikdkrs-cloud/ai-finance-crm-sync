export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_KEY) return res.status(500).json({ error: "No API key" });

  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "No text" });

    // Убираем markdown и сокращаем для быстрого TTS
    const clean = text
      .replace(/[#*`_]/g, "")
      .replace(/\n{2,}/g, ". ")
      .replace(/<[^>]*>/g, "")
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, 2000);

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: "tts-1",
        voice: "onyx",
        input: clean,
        speed: 1.15,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`TTS error: ${response.status} — ${err}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    return res.status(200).json({ ok: true, audio: `data:audio/mp3;base64,${base64}` });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
