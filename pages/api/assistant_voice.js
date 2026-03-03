// pages/api/assistant_voice.js
// Voice pipeline: Browser audio -> OpenAI STT -> /api/assistant -> OpenAI TTS -> mp3(base64)

const OPENAI_BASE = "https://api.openai.com/v1";

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function getBaseUrl(req) {
  const proto = (req.headers["x-forwarded-proto"] || "https").toString();
  const host = (req.headers["x-forwarded-host"] || req.headers.host || "").toString();
  return `${proto}://${host}`;
}

function b64ToBuffer(b64) {
  // b64 может быть как "data:audio/webm;base64,AAA..." так и просто "AAA..."
  const cleaned = String(b64 || "").includes(",") ? String(b64).split(",").pop() : String(b64 || "");
  return Buffer.from(cleaned, "base64");
}

function bufferToBase64(buf) {
  return Buffer.from(buf).toString("base64");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { ok: false, error: "Method not allowed" });

  const apiKey = process.env.OPENAI_API_KEY || "";
  if (!apiKey) return json(res, 500, { ok: false, error: "OPENAI_API_KEY is not set" });

  try {
    const { month, audioBase64, mimeType, messages } = req.body || {};

    if (!month || !/^\d{4}-\d{2}$/.test(String(month))) {
      return json(res, 400, { ok: false, error: "month must be YYYY-MM" });
    }

    if (!audioBase64) {
      return json(res, 400, { ok: false, error: "audioBase64 is required" });
    }

    const mt = String(mimeType || "audio/webm");
    const audioBuf = b64ToBuffer(audioBase64);

    // защитимся от слишком больших запросов (Vercel/функции)
    const MAX = 4 * 1024 * 1024; // 4MB
    if (audioBuf.length > MAX) {
      return json(res, 413, { ok: false, error: `Audio too large (${audioBuf.length} bytes). Please record a shorter clip.` });
    }

    // ---------- 1) OpenAI STT ----------
    // Используем gpt-4o-mini-transcribe (современный STT). :contentReference[oaicite:1]{index=1}
    const sttForm = new FormData();
    sttForm.append("model", "gpt-4o-mini-transcribe");
    sttForm.append("response_format", "json");

    // имя файла важно для корректного распознавания формата
    const filename = mt.includes("wav") ? "audio.wav"
      : mt.includes("mpeg") || mt.includes("mp3") ? "audio.mp3"
      : mt.includes("ogg") ? "audio.ogg"
      : "audio.webm";

    sttForm.append("file", new Blob([audioBuf], { type: mt }), filename);

    const sttResp = await fetch(`${OPENAI_BASE}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: sttForm,
    });

    const sttText = await sttResp.text();
    let sttJson = null;
    try { sttJson = JSON.parse(sttText); } catch {}

    if (!sttResp.ok) {
      return json(res, 500, { ok: false, error: `STT failed: ${sttText.slice(0, 500)}` });
    }

    const transcript =
      sttJson?.text ||
      sttJson?.transcript ||
      "";

    if (!transcript.trim()) {
      return json(res, 200, { ok: true, transcript: "", answer: "", audioMp3Base64: "" });
    }

    // ---------- 2) Call your existing /api/assistant ----------
    const baseUrl = getBaseUrl(req);
    const assistantResp = await fetch(`${baseUrl}/api/assistant`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        month,
        question: transcript,
        messages: Array.isArray(messages) ? messages : [],
      }),
    });

    const assistantText = await assistantResp.text();
    let assistantJson = null;
    try { assistantJson = JSON.parse(assistantText); } catch {}

    if (!assistantResp.ok || !assistantJson?.ok) {
      return json(res, 500, {
        ok: false,
        error: `Assistant failed: ${(assistantJson?.error || assistantText || "").slice(0, 700)}`,
        transcript,
      });
    }

    const answer = String(assistantJson.answer || "");

    // ---------- 3) OpenAI TTS ----------
    // TTS модели включают gpt-4o-mini-tts. :contentReference[oaicite:2]{index=2}
    const ttsModel = process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts";

    // Голос можно поменять (если захочешь) — я оставляю "alloy" как самый нейтральный.
    // Если у тебя в кабинете доступны другие voices — подстроим.
    const ttsPayload = {
      model: ttsModel,
      voice: "alloy",
      input: answer,
      format: "mp3",
    };

    const ttsResp = await fetch(`${OPENAI_BASE}/audio/speech`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(ttsPayload),
    });

    if (!ttsResp.ok) {
      const t = await ttsResp.text();
      return json(res, 500, { ok: false, error: `TTS failed: ${t.slice(0, 500)}`, transcript, answer });
    }

    const audioArrayBuf = await ttsResp.arrayBuffer();
    const audioMp3Base64 = bufferToBase64(Buffer.from(audioArrayBuf));

    return json(res, 200, {
      ok: true,
      transcript,
      answer,
      audioMp3Base64,
    });
  } catch (e) {
    return json(res, 500, { ok: false, error: String(e?.message || e) });
  }
}
