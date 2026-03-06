import React, { useEffect, useRef, useState } from "react";
import DkrsAppShell from "../components/DkrsAppShell";
import AiFloatingButton from "../components/AiFloatingButton";

const QUICK_PROMPTS = [
  { icon: "📊", label: "Общий анализ", prompt: "Дай полный финансовый анализ за текущий период." },
  { icon: "🏆", label: "Лучшие проекты", prompt: "Какие проекты самые прибыльные? Сравни маржу." },
  { icon: "⚠️", label: "Проблемные зоны", prompt: "Какие проекты убыточные? Что делать?" },
  { icon: "🔴", label: "Аномалии", prompt: "Есть ли аномалии в расходах? Разбери каждую." },
  { icon: "📈", label: "Что если +20%", prompt: "Смоделируй: выручка +20%. Покажи новые цифры." },
  { icon: "📉", label: "Что если -15%", prompt: "Смоделируй: выручка -15%. Кто станет убыточным?" },
  { icon: "💡", label: "Рекомендации", prompt: "ТОП-5 рекомендаций для роста прибыли." },
  { icon: "🎯", label: "Оптимизация", prompt: "Где сократить расходы? Анализ структуры." },
];

const TOOL_ACTIONS = [
  { icon: "📋", label: "Сводка", action: "summary" },
  { icon: "🔄", label: "Сравнить", action: "compare" },
  { icon: "📊", label: "Прогноз", action: "forecast" },
  { icon: "🧮", label: "Калькулятор", action: "calculator" },
];

const TOOL_PROMPTS = {
  summary: "Краткая сводка: показатели, топ проекты, риски, рекомендация.",
  compare: "Сравни все периоды: динамика выручки, расходов, прибыли, маржи.",
  forecast: "Прогноз на следующий месяц с учётом трендов.",
  calculator: "Покажи данные таблицей, предложи что посчитать.",
};

function formatMessage(text) {
  if (!text) return "";
  let h = text
    .replace(/## (.+)/g, '<h3 class="ai-h3">$1</h3>')
    .replace(/### (.+)/g, '<h4 class="ai-h4">$1</h4>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, '<code class="ai-code">$1</code>')
    .replace(/^\- (.+)/gm, '<li class="ai-li">$1</li>')
    .replace(/^\d+\. (.+)/gm, '<li class="ai-li-n">$1</li>')
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br/>");
  h = h.replace(/(<li class="ai-li">.*?<\/li>)+/gs, (m) => `<ul class="ai-ul">${m}</ul>`);
  h = h.replace(/(<li class="ai-li-n">.*?<\/li>)+/gs, (m) => `<ol class="ai-ol">${m}</ol>`);
  return `<p>${h}</p>`;
}

export default function AssistantPage() {
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [month, setMonth] = useState("");
  const [months, setMonths] = useState([]);
  const [tokens, setTokens] = useState(0);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(null);
  const [playingId, setPlayingId] = useState(null);
  const chatRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const audioRef = useRef(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/reports_list");
        const d = await r.json();
        if (d?.items) {
          const ms = [...new Set(d.items.map((x) => x.month))].sort().reverse();
          setMonths(ms);
          if (ms.length) setMonth(ms[0]);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, loading]);

  const stopAudio = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setPlayingId(null);
  };

  const autoSpeak = async (text, msgId) => {
    setTtsLoading(msgId);
    try {
      const res = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.ok && data.audio) {
        const audio = new Audio(data.audio);
        audio.onended = () => { setPlayingId(null); audioRef.current = null; };
        audio.onerror = () => { setPlayingId(null); audioRef.current = null; };
        audioRef.current = audio;
        setPlayingId(msgId);
        audio.play();
      }
    } catch {}
    setTtsLoading(null);
  };

  const callAssistant = async (msgs, isVoice) => {
    const res = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: msgs, month, isVoice }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || "Ошибка AI");
    return data;
  };

  const sendMessage = async (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed || loading) return;
    stopAudio();

    const userMsg = { role: "user", content: trimmed, ts: Date.now() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const data = await callAssistant(next, false);
      const aiMsg = { role: "assistant", content: data.reply, ts: Date.now(), id: Date.now() };
      setMessages((prev) => [...prev, aiMsg]);
      if (data.usage?.total_tokens) setTokens((t) => t + data.usage.total_tokens);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const sendMessageWithVoice = async (text) => {
    const trimmed = (text || "").trim();
    if (!trimmed || loading) return;
    stopAudio();

    const userMsg = { role: "user", content: trimmed, ts: Date.now() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const data = await callAssistant(next, true);
      const aiMsg = { role: "assistant", content: data.reply, ts: Date.now(), id: Date.now() };
      setMessages((prev) => [...prev, aiMsg]);
      if (data.usage?.total_tokens) setTokens((t) => t + data.usage.total_tokens);
      setLoading(false);
      await autoSpeak(data.reply, aiMsg.id);
      return;
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        await transcribeAudio(blob);
      };
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setRecording(true);
    } catch (e) {
      setError("Микрофон: " + e.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    setRecording(false);
  };

  const toggleRecording = () => { recording ? stopRecording() : startRecording(); };

  const transcribeAudio = async (blob) => {
    setTranscribing(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
      const res = await fetch("/api/voice-to-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio: base64 }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Ошибка распознавания");
      if (data.text) { setInput(""); await sendMessageWithVoice(data.text); }
    } catch (e) {
      setError("Распознавание: " + e.message);
    } finally {
      setTranscribing(false);
    }
  };

  const speakMessage = async (msg) => {
    if (playingId === msg.id) { stopAudio(); return; }
    stopAudio();
    setTtsLoading(msg.id);
    try {
      const res = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: msg.content }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Ошибка озвучки");
      const audio = new Audio(data.audio);
      audio.onended = () => { setPlayingId(null); audioRef.current = null; };
      audio.onerror = () => { setPlayingId(null); audioRef.current = null; };
      audioRef.current = audio;
      setPlayingId(msg.id);
      audio.play();
    } catch (e) {
      setError("TTS: " + e.message);
    } finally {
      setTtsLoading(null);
    }
  };

  const clearChat = () => { setMessages([]); setError(""); setTokens(0); stopAudio(); };

  const vs = recording ? "recording" : transcribing ? "transcribing" : loading ? "thinking" : playingId ? "speaking" : messages.length ? "ready" : "idle";
  const statusLabels = { idle: "Ожидание", ready: "Готов", recording: "🎙️ Запись...", transcribing: "✍️ Распознаю...", thinking: "🧠 Думает...", speaking: "🔊 Говорит..." };
  const statusClass = { idle: "idle", ready: "listening", recording: "listening", transcribing: "thinking", thinking: "thinking", speaking: "speaking" };

  return (
    <DkrsAppShell>
      <div className={`assistant-page ${mounted ? "mounted" : ""}`}>
        <div className="assistant-hero glass-card">
          <div className="assistant-hero-icon jarvis">J</div>
          <div className="assistant-hero-text">
            <h2>J.A.R.V.I.S. <span className="jarvis-sub">DKRS Edition</span></h2>
            <p>Голос Onyx • Whisper распознавание • Короткие голосовые ответы • Все устройства</p>
          </div>
        </div>

        <div className="assistant-controls glass-card">
          <div className="assistant-controls-left">
            <div className="assistant-control-icon">📅</div>
            <select className="dkrs-select" value={month} onChange={(e) => setMonth(e.target.value)}>
              <option value="">Все периоды</option>
              {months.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <span className="assistant-control-arrow">→</span>
            <div className="assistant-status-badges">
              <span className={`assistant-status-badge ${statusClass[vs]}`}>
                <span className="dot" />{statusLabels[vs]}
              </span>
              {tokens > 0 && <span className="assistant-status-badge idle">🔢 {tokens.toLocaleString()}</span>}
            </div>
          </div>
          <div className="assistant-controls-right">
            {TOOL_ACTIONS.map((t) => (
              <button key={t.action} className="assistant-tool-btn" onClick={() => sendMessage(TOOL_PROMPTS[t.action])} disabled={loading || recording} title={t.label}>
                <span>{t.icon}</span><span className="tool-btn-label">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="assistant-widget glass-card">
          <div className="assistant-widget-header">
            <div>
              <div className="assistant-widget-title">💬 Чат с J.A.R.V.I.S.</div>
              <div className="assistant-widget-subtitle">{messages.length} сообщений • {month || "все периоды"} • 🎙️ Голос → короткий ответ + озвучка</div>
            </div>
            <button className="assistant-clear-btn" onClick={clearChat} disabled={!messages.length && !error}>🗑️ Очистить</button>
          </div>

          <div className="assistant-prompts-grid">
            {QUICK_PROMPTS.map((p, i) => (
              <button key={i} className="assistant-prompt-card" onClick={() => sendMessage(p.prompt)} disabled={loading || recording}>
                <span className="prompt-card-icon">{p.icon}</span>
                <span className="prompt-card-label">{p.label}</span>
              </button>
            ))}
          </div>

          <div className="assistant-chat-box">
            <div className="assistant-chat-messages" ref={chatRef}>
              {messages.length === 0 && !loading ? (
                <div className="assistant-chat-empty">
                  <div className="empty-robot jarvis-logo">J</div>
                  <div className="empty-title">Добрый день, сэр. J.A.R.V.I.S. к вашим услугам.</div>
                  <div className="empty-desc">Текст → развёрнутый ответ • 🎙️ Голос → быстрый ответ + озвучка</div>
                </div>
              ) : (
                messages.map((m, i) => (
                  <div key={i} className={`assistant-message ${m.role}`}>
                    <div className="assistant-message-bubble">
                      <div className="assistant-message-header">
                        <span className="assistant-message-avatar">{m.role === "user" ? "👤" : <span className="jarvis-mini">J</span>}</span>
                        <span className="assistant-message-role">{m.role === "user" ? "Вы" : "J.A.R.V.I.S."}</span>
                        <span className="assistant-message-time">{m.ts ? new Date(m.ts).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                        {m.role === "assistant" && (
                          <button className={`msg-speak-btn ${playingId === m.id ? "active" : ""}`} onClick={() => speakMessage(m)} disabled={ttsLoading === m.id}>
                            {ttsLoading === m.id ? <span className="mini-spin" /> : playingId === m.id ? "⏹️" : "🔊"}
                          </button>
                        )}
                      </div>
                      {m.role === "assistant" ? (
                        <div className="assistant-message-content" dangerouslySetInnerHTML={{ __html: formatMessage(m.content) }} />
                      ) : (
                        <div className="assistant-message-content">{m.content}</div>
                      )}
                    </div>
                  </div>
                ))
              )}
              {loading && (
                <div className="assistant-message assistant">
                  <div className="assistant-message-bubble">
                    <div className="assistant-message-header">
                      <span className="assistant-message-avatar"><span className="jarvis-mini">J</span></span>
                      <span className="assistant-message-role">J.A.R.V.I.S.</span>
                    </div>
                    <div className="assistant-typing"><span /><span /><span /></div>
                  </div>
                </div>
              )}
            </div>

            <div className="assistant-composer">
              {error && <div className="assistant-error">⚠️ {error}</div>}
              <div className="assistant-input-row">
                <button className={`assistant-voice-btn ${recording ? "recording" : ""} ${transcribing ? "transcribing" : ""}`} onClick={toggleRecording} disabled={loading || transcribing} title={recording ? "Стоп" : "Голос"}>
                  {transcribing ? <span className="mini-spin" /> : recording ? "⏹" : "🎙️"}
                </button>
                <textarea className="assistant-textarea" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
                  placeholder={recording ? "🎙️ Говорите..." : transcribing ? "✍️ Распознаю..." : "Спросите что угодно... (Enter — отправить)"}
                  disabled={loading || recording || transcribing} rows={2}
                />
                <button className="assistant-send-btn" onClick={() => sendMessage()} disabled={!input.trim() || loading || recording}>
                  {loading ? <span className="send-spinner" /> : "➤"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <AiFloatingButton />
    </DkrsAppShell>
  );
}
