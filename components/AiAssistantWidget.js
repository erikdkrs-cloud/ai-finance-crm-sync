// components/AiAssistantWidget.js
import React, { useMemo, useRef, useState, useEffect } from "react";

function StatusChip({ status }) {
  // idle | listening | thinking | speaking
  const map = {
    idle: { cls: "ok", text: "Готов" },
    listening: { cls: "ok", text: "Слушаю" },
    thinking: { cls: "warn", text: "Думаю" },
    speaking: { cls: "ok", text: "Говорю" },
  };
  const x = map[status] || map.idle;

  return (
    <span className={`badge ${x.cls}`}>
      <span className="dot" />
      {x.text}
    </span>
  );
}

function Bubble({ role, content }) {
  const isUser = role === "user";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
      }}
    >
      <div
        style={{
          maxWidth: "86%",
          borderRadius: 18,
          border: "1px solid rgba(148,163,184,0.22)",
          background: isUser
            ? "linear-gradient(135deg, rgba(20,184,166,0.16), rgba(52,211,153,0.10))"
            : "rgba(255,255,255,0.60)",
          boxShadow: "0 14px 34px rgba(15,23,42,0.08)",
          padding: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <div style={{ fontWeight: 950, letterSpacing: "-0.02em" }}>
            {isUser ? "Ты" : "AI"}
          </div>
          <div className="dkrs-sub" style={{ marginTop: 0 }}>
            {isUser ? "вопрос" : "ответ"}
          </div>
        </div>

        <div
          style={{
            marginTop: 8,
            whiteSpace: "pre-wrap",
            lineHeight: 1.45,
            color: "rgba(15,23,42,0.86)",
            fontWeight: 650,
            fontSize: 13,
          }}
        >
          {content}
        </div>
      </div>
    </div>
  );
}

function QuickPrompt({ children, onClick }) {
  return (
    <button
      className="btn ghost"
      onClick={onClick}
      style={{
        padding: "9px 12px",
        fontWeight: 850,
        fontSize: 12,
        borderRadius: 999,
      }}
      type="button"
    >
      {children}
    </button>
  );
}

export default function AiAssistantWidget({ month, startMonth, endMonth }) {
  const effectiveMonth = endMonth || month || "";

  const [input, setInput] = useState("");
  const [items, setItems] = useState([]); // {role, content}
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [convOn, setConvOn] = useState(false);
  const convOnRef = useRef(false);

  const [recording, setRecording] = useState(false);
  const recordingRef = useRef(false);

  const [status, setStatus] = useState("idle"); // idle | listening | thinking | speaking

  const mediaRecRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

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
    try {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    } catch {}
    rafRef.current = null;

    lastTRef.current = 0;
    silenceMsRef.current = 0;
    speechMsRef.current = 0;
    totalMsRef.current = 0;

    noiseRef.current = 0;
    thrRef.current = 0.02;
    calibMsRef.current = 0;

    try {
      if (sourceRef.current) sourceRef.current.disconnect();
    } catch {}
    try {
      if (analyserRef.current) analyserRef.current.disconnect();
    } catch {}

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

    try {
      if (mediaRecRef.current && mediaRecRef.current.state !== "inactive") {
        mediaRecRef.current.stop();
      }
    } catch {}

    cleanupVad();
    stopStream();
  }

  function stopRecordingSoft() {
    if (!recordingRef.current) return;

    recordingRef.current = false;
    setRecording(false);
    setStatus("thinking");

    try {
      if (mediaRecRef.current && mediaRecRef.current.state !== "inactive") {
        mediaRecRef.current.stop();
      } else {
        setStatus(convOnRef.current ? "thinking" : "idle");
      }
    } catch {
      hardStopRecording();
      setStatus("idle");
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

      if (calibMsRef.current < VAD.calibMs) {
        calibMsRef.current += dt;
        totalMsRef.current += dt;

        const alpha = 0.10;
        noiseRef.current = noiseRef.current ? noiseRef.current * (1 - alpha) + rms * alpha : rms;
        thrRef.current = Math.max(VAD.thresholdMin, noiseRef.current * VAD.thresholdMult);

        if (totalMsRef.current >= VAD.maxRecordMs) stopRecordingSoft();
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

      if (hasSpeech && speechMsRef.current >= VAD.hardStopAfterSpeechMs) return stopRecordingSoft();
      if (hasSpeech && silenceMsRef.current >= VAD.stopAfterSilenceMs) return stopRecordingSoft();
      if (totalMsRef.current >= VAD.maxRecordMs) return stopRecordingSoft();

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }

  async function startRecording() {
    setErr("");

    if (!effectiveMonth) {
      setErr("Сначала выбери период (месяц).");
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
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
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

        // если Conversation OFF — не отправляем
        if (!convOnRef.current) {
          setStatus("idle");
          return;
        }

        await sendVoiceBlob(blob, mr.mimeType || blob.type || "audio/webm");
      };

      // reset VAD
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
      setStatus("idle");
    }
  }

  async function sendVoiceBlob(blob, mimeType) {
    if (!effectiveMonth) {
      setErr("Сначала выбери период (месяц).");
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
        body: JSON.stringify({
          month: effectiveMonth,
          range: startMonth && endMonth ? { startMonth, endMonth } : null,
          audioBase64,
          mimeType,
          messages: next,
        }),
      });

      const txt = await resp.text();
      let j = null;
      try {
        j = JSON.parse(txt);
      } catch {}

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
          }, 240);
        },
      });
    } catch (e) {
      setErr(String(e?.message || e));
      setStatus("idle");
    } finally {
      setLoading(false);
    }
  }

  async function sendText(textOverride) {
    if (!effectiveMonth) {
      setErr("Сначала выбери период (месяц).");
      return;
    }

    const question = (textOverride ?? input).trim();
    if (!question || loading || convOn) return;

    if (!textOverride) setInput("");
    setErr("");

    const next = [...items, { role: "user", content: question }];
    setItems(next);

    setLoading(true);
    setStatus("thinking");

    try {
      const resp = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: effectiveMonth,
          range: startMonth && endMonth ? { startMonth, endMonth } : null,
          question,
          messages: next.slice(-8),
        }),
      });

      const text = await resp.text();
      let json = null;
      try {
        json = JSON.parse(text);
      } catch {}

      if (!resp.ok || !json?.ok) {
        setErr((json?.error || text || "Ошибка").slice(0, 800));
        setStatus("idle");
        pushMessage("assistant", "Не получилось получить ответ. Попробуй задать вопрос иначе.");
        return;
      }

      pushMessage("assistant", String(json.answer || "").trim());
      setStatus("idle");
    } catch (e) {
      setErr(String(e?.message || e));
      setStatus("idle");
    } finally {
      setLoading(false);
    }
  }

  function stopAll() {
    // важно: сначала гасим флаги, потом чистим ресурсы
    convOnRef.current = false;
    setConvOn(false);

    stopPlayback();

    // stop recorder safely
    try {
      stopRecordingSoft();
    } catch {}
    try {
      hardStopRecording();
    } catch {}

    setLoading(false);
    setStatus("idle");
  }

  async function toggleConversation() {
    if (!convOn) {
      if (!effectiveMonth) {
        setErr("Сначала выбери период (месяц).");
        return;
      }
      setErr("");
      convOnRef.current = true;
      setConvOn(true);
      setStatus("listening");
      await startRecording();
      return;
    }
    stopAll();
  }

  useEffect(() => {
    return () => {
      try {
        stopAll();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 950, letterSpacing: "-0.02em", fontSize: 16 }}>AI помощник</div>
          <div className="dkrs-sub" style={{ marginTop: 6 }}>
            Voice Conversation Mode • авто-стоп по тишине (VAD)
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <StatusChip status={status === "thinking" ? "thinking" : status === "speaking" ? "speaking" : recording ? "listening" : "idle"} />
          <span className="badge">
            <span className="dot" style={{ background: "rgba(20,184,166,0.9)" }} />
            LIVE • <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", fontWeight: 900 }}>
              {effectiveMonth || "—"}
            </span>
          </span>
        </div>
      </div>

      {/* Quick prompts */}
      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
        {quicks.map((q, i) => (
          <QuickPrompt key={i} onClick={() => sendText(q)}>
            {q}
          </QuickPrompt>
        ))}
      </div>

      {/* Chat box */}
      <div
        style={{
          marginTop: 12,
          borderRadius: 22,
          border: "1px solid rgba(148,163,184,0.26)",
          background: "rgba(255,255,255,0.58)",
          boxShadow: "0 14px 34px rgba(15,23,42,0.08)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: 12,
            maxHeight: 420,
            overflow: "auto",
            display: "grid",
            gap: 10,
            background:
              "radial-gradient(520px 240px at 20% 10%, rgba(167,139,250,0.10), transparent 60%)," +
              "radial-gradient(520px 240px at 80% 90%, rgba(20,184,166,0.08), transparent 62%)",
          }}
        >
          {items.length === 0 ? (
            <div
              style={{
                borderRadius: 18,
                border: "1px dashed rgba(148,163,184,0.45)",
                background: "rgba(255,255,255,0.50)",
                padding: 14,
                color: "rgba(100,116,139,0.95)",
                fontWeight: 800,
              }}
            >
              Нажми <b>Conversation ON</b> и говори. Можно и текстом — ниже.
            </div>
          ) : (
            items.map((m, i) => <Bubble key={i} role={m.role} content={m.content} />)
          )}
        </div>

        {/* Composer */}
        <div
          style={{
            padding: 12,
            borderTop: "1px solid rgba(148,163,184,0.18)",
            background: "linear-gradient(180deg, rgba(255,255,255,0.70), rgba(255,255,255,0.55))",
          }}
        >
          <textarea
            className="input"
            style={{
              width: "100%",
              height: 92,
              paddingTop: 10,
              paddingBottom: 10,
              resize: "vertical",
              borderRadius: 18,
            }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Напиши вопрос…"
            disabled={convOn || loading}
          />

          <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button
              className={convOn ? "btn" : "btn ghost"}
              onClick={toggleConversation}
              disabled={loading && !convOn}
              type="button"
              title="Включить/выключить голосовой режим"
            >
              {convOn ? "🛑 Conversation OFF" : "🎧 Conversation ON"}
            </button>

            <button className="btn" disabled={!canSend} onClick={() => sendText()} type="button">
              {loading ? "Думаю…" : "Спросить"}
            </button>

            {convOn ? (
              <button className="btn ghost" onClick={stopAll} type="button">
                ⏹️ Стоп
              </button>
            ) : null}

            <div className="dkrs-sub" style={{ marginLeft: "auto" }}>
              {startMonth && endMonth ? (
                <>
                  Период: <b>{startMonth}</b> → <b>{endMonth}</b>
                </>
              ) : (
                <>
                  Месяц: <b>{effectiveMonth || "—"}</b>
                </>
              )}
            </div>
          </div>

          {err ? (
            <div style={{ marginTop: 10, color: "rgba(251,113,133,0.95)", fontWeight: 900, fontSize: 13 }}>
              {err}
            </div>
          ) : null}
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 640px) {
          textarea.input {
            height: 84px !important;
          }
        }
      `}</style>
    </div>
  );
}
