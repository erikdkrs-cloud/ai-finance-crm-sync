import React, { useEffect, useRef, useState, useCallback } from "react";
import DkrsAppShell from "../components/DkrsAppShell";
import AiFloatingButton from "../components/AiFloatingButton";

const QUICK_PROMPTS = [
  { icon: "📊", label: "Общий анализ", prompt: "Дай полный финансовый анализ за текущий период: выручка, расходы, прибыль, маржа. Выдели ключевые тренды." },
  { icon: "🏆", label: "Лучшие проекты", prompt: "Какие проекты самые прибыльные? Сравни их маржу и объёмы." },
  { icon: "⚠️", label: "Проблемные зоны", prompt: "Какие проекты убыточные или с низкой маржой? Что можно сделать?" },
  { icon: "🔴", label: "Аномалии", prompt: "Есть ли аномалии в расходах? Подробно разбери каждую." },
  { icon: "📈", label: "Что если +20%", prompt: "Смоделируй: выручка +20% при тех же расходах. Покажи новые цифры." },
  { icon: "📉", label: "Что если -15%", prompt: "Смоделируй: выручка -15%. Какие проекты станут убыточными?" },
  { icon: "💡", label: "Рекомендации", prompt: "ТОП-5 рекомендаций для увеличения прибыли с цифрами." },
  { icon: "🎯", label: "Оптимизация", prompt: "Где сократить расходы? Проанализируй структуру расходов." },
];

const TOOL_ACTIONS = [
  { icon: "📋", label: "Сводка", action: "summary" },
  { icon: "🔄", label: "Сравнить", action: "compare" },
  { icon: "📊", label: "Прогноз", action: "forecast" },
  { icon: "🧮", label: "Калькулятор", action: "calculator" },
];

const TOOL_PROMPTS = {
  summary: "Сделай краткую сводку: 1) Ключевые показатели 2) Топ проекты 3) Риски 4) Рекомендация.",
  compare: "Сравни доступные периоды. Динамика выручки, расходов, прибыли, маржи.",
  forecast: "Прогноз на следующий месяц. Ожидаемая выручка, расходы, прибыль с учётом трендов.",
  calculator: "Покажи текущие данные в формате таблицы и предложи что можно посчитать.",
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
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, month }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Ошибка AI");
      const aiMsg = { role: "assistant", content: data.reply, ts: Date.now(), id: Date.now() };
      setMessages((prev) => [...prev, aiMsg]);
      if (data.usage?.total_tokens) setTokens((t) => t + data.usage.total_tokens);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // --- VOICE RECORDING (MediaRecorder → Whisper) ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4" });
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await transcribeAudio(blob);
      };
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setRecording(true);
    } catch (e) {
      setError("Микрофон недоступен: " + e.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  };

  const toggleRecording = () => {
    if (recording) stopRecording(); else startRecording();
  };

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
      if (data.text) {
        setInput("");
        await sendMessage(data.text);
      }
    } catch (e) {
      setError("Распознавание: " + e.message);
    } finally {
      setTranscribing(false);
    }
  };

  // --- TTS (OpenAI) ---
  const stopAudio = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setPlayingId(null);
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

  const voiceStatus = recording ? "recording" : transcribing ? "transcribing" : loading ? "thinking" : playingId ? "speaking" : messages.length ? "ready" : "idle";
  const statusLabels = { idle: "Ожидание", ready: "Готов", recording: "🎙️ Запись...", transcribing: "✍️ Распознаю...", thinking: "🧠 Думает...", speaking: "🔊 Говорит..." };
  const statusClass = { idle: "idle", ready: "listening", recording: "listening", transcribing: "thinking", thinking: "thinking", speaking: "speaking" };

  return (
    <DkrsAppShell>
      <div className={`assistant-page ${mounted ? "mounted" : ""}`}>
        {/* Hero */}
        <div className="assistant-hero glass-card">
          <div className="assistant-hero-icon jarvis">J</div>
          <div className="assistant-hero-text">
            <h2>J.A.R.V.I.S. <span className="jarvis-sub">DKRS Edition</span></h2>
<p>Продвинутый AI-ассистент • Голос Onyx HD • Whisper распознавание • Все устройства</p>
          </div>
        </div>

        {/* Controls */}
        <div className="assistant-controls glass-card">
          <div className="assistant-controls-left">
            <div className="assistant-control-icon">📅</div>
            <select className="dkrs-select" value={month} onChange={(e) => setMonth(e.target.value)}>
              <option value="">Все периоды</option>
              {months.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <span className="assistant-control-arrow">→</span>
            <div className="assistant-status-badges">
              <span className={`assistant-status-badge ${statusClass[voiceStatus]}`}>
                <span className="dot" />{statusLabels[voiceStatus]}
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

        {/* Chat */}
        <div className="assistant-widget glass-card">
          <div className="assistant-widget-header">
            <div>
              <div className="assistant-widget-title">💬 Чат с AI</div>
              <div className="assistant-widget-subtitle">{messages.length} сообщений • Период: {month || "все"} • 🎙️ Голос на всех браузерах</div>
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
<div className="empty-desc">Задайте вопрос текстом или нажмите 🎙️ для голосового общения</div>
                </div>
              ) : (
                messages.map((m, i) => (
                  <div key={i} className={`assistant-message ${m.role}`}>
                    <div className="assistant-message-bubble">
                      <div className="assistant-message-header">
                       <span className="assistant-message-avatar">{m.role === "user" ? "👤" : <span className="jarvis-mini">J</span>}</span>
<span className="assistant-message-role">{m.role === "user" ? "Вы" : "J.A.R.V.I.S."}</span>
                        <span className="assistant-message-time">
                          {m.ts ? new Date(m.ts).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : ""}
                        </span>
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
                <button
                  className={`assistant-voice-btn ${recording ? "recording" : ""} ${transcribing ? "transcribing" : ""}`}
                  onClick={toggleRecording}
                  disabled={loading || transcribing}
                  title={recording ? "Остановить запись" : "Голосовой ввод"}
                >
                  {transcribing ? <span className="mini-spin" /> : recording ? "⏹" : "🎙️"}
                </button>
                <textarea
                  className="assistant-textarea"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={recording ? "🎙️ Говорите..." : transcribing ? "✍️ Распознаю речь..." : "Спросите что угодно... (Enter — отправить)"}
                  disabled={loading || recording || transcribing}
                  rows={2}
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
