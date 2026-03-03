import React, { useMemo, useRef, useState } from "react";

export default function AiAssistantWidget({ month }) {
  const [input, setInput] = useState("");
  const [items, setItems] = useState([]); // {role, content}
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // voice record
  const [recording, setRecording] = useState(false);
  const mediaRecRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  // conversation mode
  const [convOn, setConvOn] = useState(false);
  const convOnRef = useRef(false);

  // audio playback
  const audioRef = useRef(null);

  const canSend = useMemo(() => !!month && input.trim().length > 0 && !loading, [month, input, loading]);

  function pushMessage(role, content) {
    setItems((prev) => [...prev, { role, content }]);
  }

  function stopPlayback() {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    } catch {}
  }

  function playMp3Base64(b64, { onEnded } = {}) {
    if (!b64) {
      onEnded && onEnded();
      return;
    }
    try {
      const audio = new Audio(`data:audio/mpeg;base64,${b64}`);
      audioRef.current = audio;
      audio.onended = () => {
        onEnded && onEnded();
      };
      audio.play().catch(() => {
        onEnded && onEnded();
      });
    } catch {
      onEnded && onEnded();
    }
  }

  async function sendText() {
    if (!canSend) return;

    const question = input.trim();
    setInput("");
    setErr("");

    const next = [...items, { role: "user", content: question }];
    setItems(next);
    setLoading(true);

    try {
      const resp = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          question,
          messages: next.slice(-8),
        }),
      });

      const text = await resp.text();
      let json = null;
      try { json = JSON.parse(text); } catch {}

      if (!resp.ok || !json?.ok) {
        setErr((json?.error || text || "Ошибка").slice(0, 800));
        pushMessage("assistant", "Не получилось получить ответ. Попробуй задать вопрос иначе.");
        return;
      }

      pushMessage("assistant", String(json.answer || ""));
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function startRecording() {
    setErr("");
    if (recording) return;

    if (!navigator?.mediaDevices?.getUserMedia) {
      setErr("Запись недоступна: браузер не поддерживает микрофон (getUserMedia).");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const opts = {};
      if (window.MediaRecorder && MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        opts.mimeType = "audio/webm;codecs=opus";
      } else if (window.MediaRecorder && MediaRecorder.isTypeSupported("audio/webm")) {
        opts.mimeType = "audio/webm";
      }

      const mr = new MediaRecorder(stream, opts);
      mediaRecRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        // stop mic tracks
        try {
          const s = streamRef.current;
          if (s) s.getTracks().forEach((t) => t.stop());
        } catch {}
        streamRef.current = null;

        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        chunksRef.current = [];

        // IMPORTANT: if conversation OFF meanwhile -> do nothing
        if (!convOnRef.current) return;

        await sendVoiceBlob(blob, mr.mimeType || blob.type || "audio/webm");
      };

      mr.start();
      setRecording(true);
    } catch (e) {
      setErr("Не удалось включить микрофон: " + String(e?.message || e));
    }
  }

  function stopRecording() {
    if (!recording) return;
    setRecording(false);
    try { mediaRecRef.current && mediaRecRef.current.stop(); } catch {}
  }

  function stopAll() {
    // stop conversation, record, and playback
    convOnRef.current = false;
    setConvOn(false);

    setRecording(false);
    try { mediaRecRef.current && mediaRecRef.current.stop(); } catch {}

    try {
      const s = streamRef.current;
      if (s) s.getTracks().forEach((t) => t.stop());
    } catch {}
    streamRef.current = null;

    stopPlayback();
  }

  async function sendVoiceBlob(blob, mimeType) {
    if (!month) {
      setErr("Сначала выбери месяц.");
      return;
    }

    setLoading(true);
    setErr("");

    try {
      const arrayBuf = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuf);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const audioBase64 = btoa(binary);

      const next = items.slice(-8);

      const resp = await fetch("/api/assistant_voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          audioBase64,
          mimeType,
          messages: next,
        }),
      });

      const text = await resp.text();
      let json = null;
      try { json = JSON.parse(text); } catch {}

      if (!resp.ok || !json?.ok) {
        setErr((json?.error || text || "Ошибка").slice(0, 900));
        return;
      }

      const transcript = String(json.transcript || "").trim();
      const answer = String(json.answer || "").trim();

      if (transcript) pushMessage("user", transcript);
      if (answer) pushMessage("assistant", answer);

      // play TTS, then auto-start recording again if conversation still ON
      playMp3Base64(json.audioMp3Base64, {
        onEnded: async () => {
          if (!convOnRef.current) return;
          // small pause so it feels natural
          setTimeout(() => {
            if (convOnRef.current) startRecording();
          }, 300);
        },
      });
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
      setRecording(false);
    }
  }

  async function toggleConversation() {
    if (!convOn) {
      // turn ON
      if (!month) {
        setErr("Сначала выбери месяц.");
        return;
      }
      setErr("");
      convOnRef.current = true;
      setConvOn(true);
      stopPlayback(); // just in case
      await startRecording();
      return;
    }

    // turn OFF
    stopAll();
  }

  return (
    <div className="ai-widget">
      <div className="ai-title">
        <div style={{ fontWeight: 900, fontSize: 16 }}>AI помощник</div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span className="ai-badge">
            <span className="ai-dot" />
            LIVE • <span className="mono">{month || ""}</span>
          </span>

          {recording ? (
            <span className="voice-indicator">
              <span className="voice-dot" />
              Запись...
            </span>
          ) : null}

          {!recording && loading ? (
            <span className="ai-processing">
              <span className="ai-spinner" />
              AI думает...
            </span>
          ) : null}
        </div>
      </div>

      <div style={{ marginTop: 8, opacity: 0.8, fontSize: 12 }}>
        Conversation Mode: включи и говори — после ответа AI снова начнёт слушать автоматически.
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        <div className="ai-chat" style={{ maxHeight: 260, overflow: "auto" }}>
          {items.length === 0 ? (
            <div style={{ opacity: 0.75 }}>Нажми “Conversation ON” и говори.</div>
          ) : (
            items.map((m, i) => (
              <div key={i} className={`ai-msg ${m.role === "user" ? "user" : "assistant"}`}>
                <div className="ai-meta">{m.role === "user" ? "Ты" : "AI"}</div>
                <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.35 }}>{m.content}</div>
              </div>
            ))
          )}
        </div>

        {/* Controls */}
        <div className="ai-compose">
          <textarea
            className="input"
            rows={3}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Можно и текстом: напиши вопрос…"
            disabled={convOn || loading}
          />

          <button
            className={`btn ${convOn ? "primary" : "ai-ghost"}`}
            onClick={toggleConversation}
            disabled={loading && !convOn}
            title="Один клик: голосовой диалог циклом"
          >
            {convOn ? "🛑 Conversation OFF" : "🎧 Conversation ON"}
          </button>

          <button className="btn ai-primary" disabled={!canSend || convOn} onClick={sendText}>
            {loading ? "Думаю…" : "Спросить"}
          </button>
        </div>

        {convOn ? (
          <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ opacity: 0.7, fontSize: 12 }}>
              Подсказка: когда ты закончил говорить — нажми “Stop” (или выключи режим).
            </div>

            <button className="btn ai-ghost" onClick={recording ? stopRecording : startRecording} disabled={loading}>
              {recording ? "⏹️ Stop (завершить фразу)" : "🎤 Start (говорить)"}
            </button>
          </div>
        ) : null}

        {err ? (
          <div style={{ color: "rgba(239,68,68,.95)", fontWeight: 800, fontSize: 12 }}>
            {err}
          </div>
        ) : null}
      </div>
    </div>
  );
}
