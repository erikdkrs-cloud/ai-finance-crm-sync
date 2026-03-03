// components/AiAssistantWidget.js
import React, { useMemo, useRef, useState, useEffect } from "react";

export default function AiAssistantWidget({ month }) {
  const [input, setInput] = useState("");
  const [items, setItems] = useState([]); // {role, content}
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // conversation mode
  const [convOn, setConvOn] = useState(false);
  const convOnRef = useRef(false);

  // recording
  const [recording, setRecording] = useState(false);
  const recordingRef = useRef(false);

  // status
  const [status, setStatus] = useState("idle"); // idle | listening | thinking | speaking

  const mediaRecRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  // audio playback
  const audioRef = useRef(null);

  // VAD
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

  // Tuning
  const VAD = {
    calibMs: 650,
    thresholdMult: 3.2,
    thresholdMin: 0.018,
    minSpeechMs: 320,
    stopAfterSilenceMs: 750,
    maxRecordMs: 14000,
    hardStopAfterSpeechMs: 7000,
  };

  const canSend = useMemo(
    () => !!month && input.trim().length > 0 && !loading && !convOn,
    [month, input, loading, convOn]
  );

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
    audioRef.current = null;
  }

  function playMp3Base64(b64, { onEnded } = {}) {
    if (!b64) {
      onEnded && onEnded();
      return;
    }
    try {
      const a = new Audio(`data:audio/mpeg;base64,${b64}`);
      audioRef.current = a;
      setStatus("speaking");
      a.onended = () => {
        audioRef.current = null;
        onEnded && onEnded();
      };
      a.play().catch(() => {
        audioRef.current = null;
        onEnded && onEnded();
      });
    } catch {
      audioRef.current = null;
      onEnded && onEnded();
    }
  }

  function cleanupVad() {
    try { if (rafRef.current) cancelAnimationFrame(rafRef.current); } catch {}
    rafRef.current = null;

    lastTRef.current = 0;
    silenceMsRef.current = 0;
    speechMsRef.current = 0;
    totalMsRef.current = 0;

    noiseRef.current = 0;
    thrRef.current = 0.02;
    calibMsRef.current = 0;

    try { if (sourceRef.current) sourceRef.current.disconnect(); } catch {}
    try { if (analyserRef.current) analyserRef.current.disconnect(); } catch {}

    sourceRef.current = null;
    analyserRef.current = null;

    try {
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") audioCtxRef.current.close();
    } catch {}
    audioCtxRef.current = null;
  }

  function stopStream() {
    try {
      const s = streamRef.current;
      if (s) s.getTracks().forEach((t) => t.stop());
    } catch {}
    streamRef.current = null;
  }

  function hardStopRecording() {
    recordingRef.current = false;
    setRecording(false);
    setStatus("idle");

    try { mediaRecRef.current && mediaRecRef.current.stop(); } catch {}
    cleanupVad();
    stopStream();
  }

  function stopRecording() {
    if (!recordingRef.current) return;

    recordingRef.current = false;
    setRecording(false);
    setStatus("thinking"); // дальше: onstop → sendVoiceBlob

    try {
      mediaRecRef.current && mediaRecRef.current.stop();
    } catch {
      hardStopRecording();
    }
  }

  function startVadLoop() {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const buf = new Uint8Array(analyser.fftSize);

    const tick = (t) => {
      if (!recordingRef.current) return;

      if (!lastTRef.current) lastTRef.current = t;
      const dt = t - lastTRef.current;
      lastTRef.current = t;

      analyser.getByteTimeDomainData(buf);

      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / buf.length);

      // calibration
      if (calibMsRef.current < VAD.calibMs) {
        calibMsRef.current += dt;
        totalMsRef.current += dt;

        const alpha = 0.10;
        noiseRef.current = noiseRef.current ? noiseRef.current * (1 - alpha) + rms * alpha : rms;

        thrRef.current = Math.max(VAD.thresholdMin, noiseRef.current * VAD.thresholdMult);

        if (totalMsRef.current >= VAD.maxRecordMs) stopRecording();
        else rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const thr = thrRef.current;

      if (rms > thr) {
        speechMsRef.current += dt;
        silenceMsRef.current = 0;
      } else {
        silenceMsRef.current += dt;
      }
      totalMsRef.current += dt;

      const hasSpeech = speechMsRef.current >= VAD.minSpeechMs;

      if (hasSpeech && status !== "listening") setStatus("listening");

      if (hasSpeech && speechMsRef.current >= VAD.hardStopAfterSpeechMs) {
        stopRecording();
        return;
      }

      if (hasSpeech && silenceMsRef.current >= VAD.stopAfterSilenceMs) {
        stopRecording();
        return;
      }

      if (totalMsRef.current >= VAD.maxRecordMs) {
        stopRecording();
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }

  async function startRecording() {
    setErr("");

    if (!month) {
      setErr("Сначала выбери месяц.");
      return;
    }
    if (recordingRef.current) return;

    if (!navigator?.mediaDevices?.getUserMedia) {
      setErr("Запись недоступна: браузер не поддерживает микрофон.");
      return;
    }

    try {
      stopPlayback();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        setErr("AudioContext не поддерживается этим браузером.");
        hardStopRecording();
        return;
      }

      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;

      source.connect(analyser);

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
        stopStream();
        cleanupVad();

        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        chunksRef.current = [];

        if (!convOnRef.current) {
          setStatus("idle");
          return;
        }

        await sendVoiceBlob(blob, mr.mimeType || blob.type || "audio/webm");
      };

      // reset counters
      lastTRef.current = 0;
      silenceMsRef.current = 0;
      speechMsRef.current = 0;
      totalMsRef.current = 0;
      noiseRef.current = 0;
      thrRef.current = 0.02;
      calibMsRef.current = 0;

      mr.start();

      recordingRef.current = true;
      setRecording(true);
      setStatus("listening");

      startVadLoop();
    } catch (e) {
      setErr("Не удалось включить микрофон: " + String(e?.message || e));
      hardStopRecording();
    }
  }

  async function sendVoiceBlob(blob, mimeType) {
    if (!month) {
      setErr("Сначала выбери месяц.");
      setStatus("idle");
      return;
    }

    setLoading(true);
    setStatus("thinking");
    setErr("");

    try {
      const ab = await blob.arrayBuffer();
      const bytes = new Uint8Array(ab);

      let bin = "";
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      const audioBase64 = btoa(bin);

      const next = items.slice(-8);

      const resp = await fetch("/api/assistant_voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, audioBase64, mimeType, messages: next }),
      });

      const txt = await resp.text();
      let j = null;
      try { j = JSON.parse(txt); } catch {}

      if (!resp.ok || !j?.ok) {
        setErr((j?.error || txt || "Ошибка").slice(0, 900));
        setStatus("idle");
        return;
      }

      const transcript = String(j.transcript || "").trim();
      const answer = String(j.answer || "").trim();

      if (transcript) pushMessage("user", transcript);
      if (answer) pushMessage("assistant", answer);

      playMp3Base64(j.audioMp3Base64, {
        onEnded: () => {
          if (!convOnRef.current) {
            setStatus("idle");
            return;
          }
          setTimeout(() => {
            if (convOnRef.current) startRecording();
          }, 250);
        },
      });
    } catch (e) {
      setErr(String(e?.message || e));
      setStatus("idle");
    } finally {
      setLoading(false);
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
    setStatus("thinking");

    try {
      const resp = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, question, messages: next.slice(-8) }),
      });

      const text = await resp.text();
      let json = null;
      try { json = JSON.parse(text); } catch {}

      if (!resp.ok || !json?.ok) {
        setErr((json?.error || text || "Ошибка").slice(0, 800));
        setStatus("idle");
        pushMessage("assistant", "Не получилось получить ответ. Попробуй задать вопрос иначе.");
        return;
      }

      pushMessage("assistant", String(json.answer || ""));
      setStatus("idle");
    } catch (e) {
      setErr(String(e?.message || e));
      setStatus("idle");
    } finally {
      setLoading(false);
    }
  }

  function stopAll() {
    convOnRef.current = false;
    setConvOn(false);
    stopPlayback();
    stopRecording();
    hardStopRecording();
    setLoading(false);
    setStatus("idle");
  }

  async function toggleConversation() {
    if (!convOn) {
      if (!month) {
        setErr("Сначала выбери месяц.");
        return;
      }
      setErr("");
      convOnRef.current = true;
      setConvOn(true);
      await startRecording();
      return;
    }
    stopAll();
  }

  useEffect(() => {
    return () => {
      try { stopAll(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusLabel =
    status === "listening" ? "Listening" :
    status === "thinking" ? "Thinking" :
    status === "speaking" ? "Speaking" : "Idle";

  return (
    <div className="dkrs-card dkrs-ai">
      <div className="dkrs-ai-inner">
        <div className="dkrs-ai-header">
          <div>
            <div className="dkrs-card-title">AI Assistant</div>
            <div className="dkrs-small" style={{ marginTop: 4 }}>
              Status: <b>{statusLabel}</b> • Conversation Mode: auto-stop by silence (VAD)
            </div>
          </div>

          <div className="dkrs-ai-right">
            <span className="dkrs-badge">
              <span className="dkrs-dot dkrs-dot-green" />
              LIVE • <span className="dkrs-mono">{month || ""}</span>
            </span>

            {recording ? (
              <span className="dkrs-badge">
                <span className="dkrs-dot dkrs-dot-yellow" />
                Listening…
              </span>
            ) : null}

            {!recording && loading ? (
              <span className="dkrs-badge">
                <span className="dkrs-spinner-sm" />
                Thinking…
              </span>
            ) : null}
          </div>
        </div>

        <div className="dkrs-ai-chat" role="log" aria-label="AI chat">
          {items.length === 0 ? (
            <div className="dkrs-ai-empty">
              Нажми <b>Conversation ON</b> и говори. Можно и текстом — ниже.
            </div>
          ) : (
            items.map((m, i) => (
              <div key={i} className={`dkrs-ai-msg ${m.role === "user" ? "user" : "assistant"}`}>
                <div className="dkrs-ai-meta">{m.role === "user" ? "You" : "AI"}</div>
                <div className="dkrs-ai-text">{m.content}</div>
              </div>
            ))
          )}
        </div>

        <div className="dkrs-ai-compose">
          <textarea
            className="dkrs-input"
            rows={3}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Можно и текстом: напиши вопрос…"
            disabled={convOn || loading}
          />

          <div className="dkrs-ai-buttons">
            <button
              className={`dkrs-btn ${convOn ? "dkrs-btn-primary" : "dkrs-btn-ghost"}`}
              onClick={toggleConversation}
              disabled={loading && !convOn}
              title="Голосовой диалог: слушаю → отвечаю → снова слушаю"
            >
              {convOn ? "🛑 Conversation OFF" : "🎧 Conversation ON"}
            </button>

            <button className="dkrs-btn dkrs-btn-primary" disabled={!canSend} onClick={sendText}>
              {loading ? "Thinking…" : "Ask"}
            </button>

            {convOn ? (
              <button className="dkrs-btn dkrs-btn-ghost" onClick={stopAll} title="Остановить запись и воспроизведение">
                ⏹ Stop
              </button>
            ) : null}
          </div>
        </div>

        {err ? (
          <div className="dkrs-ai-error">
            {err}
          </div>
        ) : null}
      </div>
    </div>
  );
}
