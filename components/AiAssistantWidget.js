import React, { useMemo, useRef, useState } from "react";

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

  const mediaRecRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  // playback
  const audioRef = useRef(null);

  // VAD (silence detection)
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const vadRafRef = useRef(null);

  const silenceMsRef = useRef(0);
  const speechMsRef = useRef(0);
  const totalMsRef = useRef(0);
  const lastTickRef = useRef(0);

  // adaptive noise floor calibration
  const noiseFloorRef = useRef(0.0);
  const vadThresholdRef = useRef(0.02);
  const calibMsRef = useRef(0);

  // Tuning
  const VAD = {
    // collect background noise for this long after start
    calibMs: 550,
    // multiplier above noise floor to treat as "speech"
    thresholdMult: 2.6,
    // minimal absolute threshold (prevents too low threshold)
    thresholdMin: 0.012,
    // require some speech before we allow auto-stop
    minSpeechMs: 350,
    // stop after this much silence
    stopAfterSilenceMs: 900,
    // hard max record duration
    maxRecordMs: 14000,
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
  }

  function playMp3Base64(b64, { onEnded } = {}) {
    if (!b64) {
      onEnded && onEnded();
      return;
    }
    try {
      const audio = new Audio(`data:audio/mpeg;base64,${b64}`);
      audioRef.current = audio;
      audio.onended = () => onEnded && onEnded();
      audio.play().catch(() => onEnded && onEnded());
    } catch {
      onEnded && onEnded();
    }
  }

  function cleanupVad() {
    try { if (vadRafRef.current) cancelAnimationFrame(vadRafRef.current); } catch {}
    vadRafRef.current = null;

    silenceMsRef.current = 0;
    speechMsRef.current = 0;
    totalMsRef.current = 0;
    lastTickRef.current = 0;

    noiseFloorRef.current = 0.0;
    vadThresholdRef.current = 0.02;
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

  function stopStreamTracks() {
    try {
      const s = streamRef.current;
      if (s) s.getTracks().forEach((t) => t.stop());
    } catch {}
    streamRef.current = null;
  }

  function hardStopRecording() {
    recordingRef.current = false;
    setRecording(false);

    try { mediaRecRef.current && mediaRecRef.current.stop(); } catch {}
    cleanupVad();
    stopStreamTracks();
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
        body: JSON.stringify({ month, question, messages: next.slice(-8) }),
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

  function stopRecording() {
    if (!recordingRef.current) return;

    recordingRef.current = false;
    setRecording(false);

    try { mediaRecRef.current && mediaRecRef.current.stop(); } catch {
      // если stop не сработал — подчистим
      hardStopRecording();
    }
  }

  function startVadLoop() {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const data = new Uint8Array(analyser.fftSize);

    const tick = (t) => {
      if (!recordingRef.current) return;

      if (!lastTickRef.current) lastTickRef.current = t;
      const dt = t - lastTickRef.current;
      lastTickRef.current = t;

      analyser.getByteTimeDomainData(data);

      // RMS
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);

      // calibration phase: measure noise floor
      if (calibMsRef.current < VAD.calibMs) {
        calibMsRef.current += dt;

        // EMA noise floor
        const alpha = 0.08;
        noiseFloorRef.current = noiseFloorRef.current
          ? noiseFloorRef.current * (1 - alpha) + rms * alpha
          : rms;

        const thr = Math.max(
          VAD.thresholdMin,
          noiseFloorRef.current * VAD.thresholdMult
        );
        vadThresholdRef.current = thr;

        totalMsRef.current += dt;

        // Hard max
        if (totalMsRef.current >= VAD.maxRecordMs) stopRecording();
        else vadRafRef.current = requestAnimationFrame(tick);
        return;
      }

      const thr = vadThresholdRef.current;

      // speech/silence counters
      if (rms > thr) {
        speechMsRef.current += dt;
        silenceMsRef.current = 0;
      } else {
        silenceMsRef.current += dt;
      }
      totalMsRef.current += dt;

      // stop after speech + silence
      if (speechMsRef.current >= VAD.minSpeechMs && silenceMsRef.current >= VAD.stopAfterSilenceMs) {
        stopRecording();
        return;
      }

      // hard max duration
      if (totalMsRef.current >= VAD.maxRecordMs) {
        stopRecording();
        return;
      }

      vadRafRef.current = requestAnimationFrame(tick);
    };

    vadRafRef.current = requestAnimationFrame(tick);
  }

  async function startRecording() {
    setErr("");

    if (!month) {
      setErr("Сначала выбери месяц.");
      return;
    }

    if (recordingRef.current) return;

    if (!navigator?.mediaDevices?.getUserMedia) {
      setErr("Запись недоступна: браузер не поддерживает микрофон (getUserMedia).");
      return;
    }

    try {
      // stop assistant speaking before listening
      stopPlayback();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // audio ctx + analyser for VAD
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;

      source.connect(analyser);

      // MediaRecorder
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
        // stop mic & cleanup VAD
        stopStreamTracks();
        cleanupVad();

        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        chunksRef.current = [];

        // if conversation OFF, ignore
        if (!convOnRef.current) return;

        await sendVoiceBlob(blob, mr.mimeType || blob.type || "audio/webm");
      };

      // reset VAD counters
      silenceMsRef.current = 0;
      speechMsRef.current = 0;
      totalMsRef.current = 0;
      lastTickRef.current = 0;

      noiseFloorRef.current = 0.0;
      vadThresholdRef.current = 0.02;
      calibMsRef.current = 0;

      mr.start();

      recordingRef.current = true;
      setRecording(true);

      startVadLoop();
    } catch (e) {
      setErr("Не удалось включить микрофон: " + String(e?.message || e));
      hardStopRecording();
    }
  }

  function stopAll() {
    convOnRef.current = false;
    setConvOn(false);

    try { stopRecording(); } catch {}
    hardStopRecording();

    stopPlayback();
    setLoading(false);
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

      // speak then listen again
      playMp3Base64(json.audioMp3Base64, {
        onEnded: () => {
          if (!convOnRef.current) return;
          setTimeout(() => {
            if (convOnRef.current) startRecording();
          }, 250);
        },
      });
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
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
              Слушаю...
            </span>
          ) : null}

          {!recording && loading ? (
            <span className="ai-processing">
              <span className="ai-spinner" />
              Думаю...
            </span>
          ) : null}
        </div>
      </div>

      <div style={{ marginTop: 8, opacity: 0.82, fontSize: 12 }}>
        Conversation Mode: включи — говори — замолчи. Я сам остановлю запись по тишине, отвечу голосом и снова начну слушать.
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
            title="Голосовой диалог: слушаю → отвечаю → снова слушаю"
          >
            {convOn ? "🛑 Conversation OFF" : "🎧 Conversation ON"}
          </button>

          <button className="btn ai-primary" disabled={!canSend} onClick={sendText}>
            {loading ? "Думаю…" : "Спросить"}
          </button>
        </div>

        {convOn ? (
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <div style={{ opacity: 0.7, fontSize: 12 }}>
              Подсказка: говори фразу и просто замолчи — я сам остановлю запись по тишине.
            </div>

            <button className="btn ai-ghost" onClick={stopAll}>
              ⏹️ Стоп
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
