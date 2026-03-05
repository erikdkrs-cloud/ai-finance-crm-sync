import React, { useMemo, useRef, useState, useEffect } from "react";

function StatusBadge({ status }) {
  const map = {
    idle: { cls: "idle", text: "Готов" },
    listening: { cls: "listening", text: "Слушаю" },
    thinking: { cls: "thinking", text: "Думаю" },
    speaking: { cls: "speaking", text: "Говорю" },
  };
  const x = map[status] || map.idle;
  return (
    <span className={`assistant-status-badge ${x.cls}`}>
      <span className="dot" />
      {x.text}
    </span>
  );
}

function MessageBubble({ role, content }) {
  return (
    <div className={`assistant-message ${role}`}>
      <div className="assistant-message-bubble">
        <div className="assistant-message-header">
          <span className="assistant-message-role">{role === "user" ? "Ты" : "AI"}</span>
          <span className="assistant-message-label">{role === "user" ? "вопрос" : "ответ"}</span>
        </div>
        <div className="assistant-message-content">{content}</div>
      </div>
    </div>
  );
}

export default function AiAssistantWidget({ month, startMonth, endMonth }) {
  const effectiveMonth = endMonth || month || "";
  const [input, setInput] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [convOn, setConvOn] = useState(false);
  const convOnRef = useRef(false);
  const [recording, setRecording] = useState(false);
  const recordingRef = useRef(false);
  const [status, setStatus] = useState("idle");

  const mediaRecRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const audioRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const rafRef = useRef(null);
  const lastTRef = useRef(0);
  const silenceMsRef = useRef(0);
  const speechMsRef = useRef(0);
  const totalMsRef = useRef(0);
  const noiseRef = useRef(0);
  const thrRef = useRef(0.02);
  const calibMsRef = useRef(0);

  const VAD = {
    calibMs: 650,
    thresholdMult: 3.2,
    thresholdMin: 0.018,
    minSpeechMs: 320,
    stopAfterSilenceMs: 750,
    maxRecordMs: 14000,
    hardStopAfterSpeechMs: 7000,
  };

  const canSend = useMemo(() => {
    return !!effectiveMonth && input.trim().length > 0 && !loading && !convOn;
  }, [effectiveMonth, input, loading, convOn]);

  function pushMessage(role, content) {
    setItems((prev) => [...prev, { role, content }]);
  }

  function stopPlayback() {
    try {
      if (audioRef.current) {
        audioRef.current.onended = null;
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    } catch {}
    audioRef.current = null;
  }

  function playMp3Base64(b64, { onEnded } = {}) {
    if (!b64) { onEnded && onEnded(); return; }
    try {
      const a = new Audio(`data:audio/mpeg;base64,${b64}`);
      audioRef.current = a;
      setStatus("speaking");
      a.onended = () => { audioRef.current = null; onEnded && onEnded(); };
      a.play().catch(() => { audioRef.current = null; onEnded && onEnded(); });
    } catch { audioRef.current = null; onEnded && onEnded(); }
  }

  function cleanupVad() {
    try { if (rafRef.current) cancelAnimationFrame(rafRef.current); } catch {}
    rafRef.current = null;
    lastTRef.current = 0; silenceMsRef.current = 0; speechMsRef.current = 0; totalMsRef.current = 0;
    noiseRef.current = 0; thrRef.current = 0.02; calibMsRef.current = 0;
    try { if (sourceRef.current) sourceRef.current.disconnect(); } catch {}
    try { if (analyserRef.current) analyserRef.current.disconnect(); } catch {}
    sourceRef.current = null; analyserRef.current = null;
    try { if (audioCtxRef.current && audioCtxRef.current.state !== "closed") audioCtxRef.current.close(); } catch {}
    audioCtxRef.current = null;
  }

  function stopStream() {
    try { const s = streamRef.current; if (s) s.getTracks().forEach((t) => t.stop()); } catch {}
    streamRef.current = null;
  }

  function hardStopRecording() {
    recordingRef.current = false; setRecording(false);
    try { if (mediaRecRef.current && mediaRecRef.current.state !== "inactive") mediaRecRef.current.stop(); } catch {}
    cleanupVad(); stopStream();
  }

  function stopRecordingSoft() {
    if (!recordingRef.current) return;
    recordingRef.current = false; setRecording(false); setStatus("thinking");
    try {
      if (mediaRecRef.current && mediaRecRef.current.state !== "inactive") mediaRecRef.current.stop();
      else setStatus(convOnRef.current ? "thinking" : "idle");
    } catch { hardStopRecording(); setStatus("idle"); }
  }

  function startVadLoop() {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const buf = new Uint8Array(analyser.fftSize);
    const tick = (t) => {
      if (!recordingRef.current) return;
      if (!lastTRef.current) lastTRef.current = t;
      const dt = t - lastTRef.current; lastTRef.current = t;
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
      const rms = Math.sqrt(sum / buf.length);
      if (calibMsRef.current < VAD.calibMs) {
        calibMsRef.current += dt; totalMsRef.current += dt;
        const alpha = 0.10;
        noiseRef.current = noiseRef.current ? noiseRef.current * (1 - alpha) + rms * alpha : rms;
        thrRef.current = Math.max(VAD.thresholdMin, noiseRef.current * VAD.thresholdMult);
        if (totalMsRef.current >= VAD.maxRecordMs) stopRecordingSoft();
        else rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const thr = thrRef.current;
      if (rms > thr) { speechMsRef.current += dt; silenceMsRef.current = 0; }
      else silenceMsRef.current += dt;
      totalMsRef.current += dt;
      const hasSpeech = speechMsRef.current >= VAD.minSpeechMs;
      if (hasSpeech && status !== "listening") setStatus("listening");
      if (hasSpeech && speechMsRef.current >= VAD.hardStopAfterSpeechMs) return stopRecordingSoft();
      if (hasSpeech && silenceMsRef.current >= VAD.stopAfterSilenceMs) return stopRecordingSoft();
      if (totalMsRef.current >= VAD.maxRecordMs) return stopRecordingSoft();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  async function startRecording() {
    setErr("");
    if (!effectiveMonth) { setErr("Сначала выбери период (месяц)."); return; }
    if (recordingRef.current) return;
    if (!navigator?.mediaDevices?.getUserMedia) { setErr("Запись недоступна: браузер не поддерживает микрофон."); return; }
    try {
      stopPlayback();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      streamRef.current = stream;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) { setErr("AudioContext не поддерживается этим браузером."); hardStopRecording(); return; }
      const ctx = new AudioCtx(); audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream); sourceRef.current = source;
      const analyser = ctx.createAnalyser(); analyser.fftSize = 2048; analyserRef.current = analyser;
      source.connect(analyser);
      const opts = {};
      if (window.MediaRecorder && MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) opts.mimeType = "audio/webm;codecs=opus";
      else if (window.MediaRecorder && MediaRecorder.isTypeSupported("audio/webm")) opts.mimeType = "audio/webm";
      const mr = new MediaRecorder(stream, opts); mediaRecRef.current = mr; chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stopStream(); cleanupVad();
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" }); chunksRef.current = [];
        if (!convOnRef.current) { setStatus("idle"); return; }
        await sendVoiceBlob(blob, mr.mimeType || blob.type || "audio/webm");
      };
      lastTRef.current = 0; silenceMsRef.current = 0; speechMsRef.current = 0; totalMsRef.current = 0;
      noiseRef.current = 0; thrRef.current = 0.02; calibMsRef.current = 0;
      mr.start(); recordingRef.current = true; setRecording(true); setStatus("listening");
      startVadLoop();
    } catch (e) { setErr("Не удалось включить микрофон: " + String(e?.message || e)); hardStopRecording(); setStatus("idle"); }
  }

  async function sendVoiceBlob(blob, mimeType) {
    if (!effectiveMonth) { setErr("Сначала выбери период (месяц)."); setStatus("idle"); return; }
    setLoading(true); setStatus("thinking"); setErr("");
    try {
      const ab = await blob.arrayBuffer(); const bytes = new Uint8Array(ab);
      let bin = ""; for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      const audioBase64 = btoa(bin);
      const next = items.slice(-8);
      const resp = await fetch("/api/assistant_voice", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: effectiveMonth, range: startMonth && endMonth ? { startMonth, endMonth } : null, audioBase64, mimeType, messages: next }),
      });
      const txt = await resp.text(); let j = null;
      try { j = JSON.parse(txt); } catch {}
      if (!resp.ok || !j?.ok) { setErr((j?.error || txt || "Ошибка").slice(0, 900)); setStatus("idle"); return; }
      const transcript = String(j.transcript || "").trim(); const answer = String(j.answer || "").trim();
      if (transcript) pushMessage("user", transcript);
      if (answer) pushMessage("assistant", answer);
      playMp3Base64(j.audioMp3Base64, { onEnded: () => { if (!convOnRef.current) { setStatus("idle"); return; } setTimeout(() => { if (convOnRef.current) startRecording(); }, 240); } });
    } catch (e) { setErr(String(e?.message || e)); setStatus("idle"); } finally { setLoading(false); }
  }

  async function sendText(textOverride) {
    if (!effectiveMonth) { setErr("Сначала выбери период (месяц)."); return; }
    const question = (textOverride ?? input).trim();
    if (!question || loading || convOn) return;
    if (!textOverride) setInput(""); setErr("");
    const next = [...items, { role: "user", content: question }]; setItems(next);
    setLoading(true); setStatus("thinking");
    try {
      const resp = await fetch("/api/assistant", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: effectiveMonth, range: startMonth && endMonth ? { startMonth, endMonth } : null, question, messages: next.slice(-8) }),
      });
      const text = await resp.text(); let json = null;
      try { json = JSON.parse(text); } catch {}
      if (!resp.ok || !json?.ok) { setErr((json?.error || text || "Ошибка").slice(0, 800)); setStatus("idle"); pushMessage("assistant", "Не получилось получить ответ. Попробуй задать вопрос иначе."); return; }
      pushMessage("assistant", String(json.answer || "").trim()); setStatus("idle");
    } catch (e) { setErr(String(e?.message || e)); setStatus("idle"); } finally { setLoading(false); }
  }

  function stopAll() {
    convOnRef.current = false; setConvOn(false); stopPlayback();
    try { stopRecordingSoft(); } catch {}
    try { hardStopRecording(); } catch {}
    setLoading(false); setStatus("idle");
  }

  async function toggleConversation() {
    if (!convOn) {
      if (!effectiveMonth) { setErr("Сначала выбери период (месяц)."); return; }
      setErr(""); convOnRef.current = true; setConvOn(true); setStatus("listening");
      await startRecording(); return;
    }
    stopAll();
  }

  useEffect(() => { return () => { try { stopAll(); } catch {} }; }, []);

  const quicks = useMemo(() => {
    const s = startMonth && endMonth ? `${startMonth} → ${endMonth}` : effectiveMonth;
    return [
      `Подведи итоги за период ${s}.`,
      `Какие проекты самые убыточные за ${s}?`,
      `Где низкая маржа и почему за ${s}?`,
      `Покажи аномалии: штрафы, реклама, транспорт за ${s}.`,
    ];
  }, [startMonth, endMonth, effectiveMonth]);

  return (
    <div>
      <div className="assistant-widget-header">
        <div>
          <div className="assistant-widget-title">AI помощник</div>
          <div className="assistant-widget-subtitle">Voice Conversation Mode • авто-стоп по тишине (VAD)</div>
        </div>
        <div className="assistant-status-badges">
          <StatusBadge status={status === "thinking" ? "thinking" : status === "speaking" ? "speaking" : recording ? "listening" : "idle"} />
          <span className="assistant-status-badge">
            <span className="dot" style={{ background: "var(--dkrs-primary)" }} />
            LIVE • {effectiveMonth || "—"}
          </span>
        </div>
      </div>

      <div className="assistant-quick-prompts">
        {quicks.map((q, i) => (
          <button key={i} className="assistant-quick-prompt" onClick={() => sendText(q)}>{q}</button>
        ))}
      </div>

      <div className="assistant-chat-box">
        <div className="assistant-chat-messages">
          {items.length === 0 ? (
            <div className="assistant-chat-empty">
              Нажми <strong>Conversation ON</strong> и говори. Можно и текстом — ниже.
            </div>
          ) : (
            items.map((m, i) => <MessageBubble key={i} role={m.role} content={m.content} />)
          )}
        </div>

        <div className="assistant-composer">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Напиши вопрос..."
            disabled={convOn || loading}
          />
          <div className="assistant-composer-actions">
            <button className={`assistant-composer-btn ${convOn ? "primary" : ""}`} onClick={toggleConversation} disabled={loading && !convOn}>
              {convOn ? "🛑 Conversation OFF" : "🎧 Conversation ON"}
            </button>
            <button className="assistant-composer-btn primary" disabled={!canSend} onClick={() => sendText()}>
              {loading ? "Думаю..." : "Спросить"}
            </button>
            {convOn && <button className="assistant-composer-btn" onClick={stopAll}>⏹️ Стоп</button>}
            <div className="assistant-composer-info">
              {startMonth && endMonth ? `Период: ${startMonth} → ${endMonth}` : `Месяц: ${effectiveMonth || "—"}`}
            </div>
          </div>
          {err && <div className="assistant-error">{err}</div>}
        </div>
      </div>
    </div>
  );
}
