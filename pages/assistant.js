import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import DkrsAppShell from "../components/DkrsAppShell";
import AiFloatingButton from "../components/AiFloatingButton";

var GREETINGS = [
  { value: "sir", label: "🎩 Сэр", desc: "Обращение: сэр" },
  { value: "mam", label: "👩 Мэм", desc: "Обращение: мэм" },
  { value: "boss", label: "💼 Босс", desc: "Обращение: босс" },
  { value: "neutral", label: "🤝 Нейтрально", desc: "Без обращений" },
];

var QUICK_PROMPTS = [
  { icon: "📊", label: "Общий анализ", prompt: "Дай полный финансовый анализ за текущий период: выручка, расходы, прибыль, маржа по каждому проекту." },
  { icon: "🏆", label: "Лучшие проекты", prompt: "Какие проекты самые прибыльные? Сравни маржу и объёмы." },
  { icon: "⚠️", label: "Проблемные зоны", prompt: "Какие проекты убыточные или с низкой маржой? Что делать?" },
  { icon: "🔴", label: "Риски", prompt: "Какие есть проблемы и риски? Разбери каждый подробно." },
  { icon: "📈", label: "Что если +20%", prompt: "Смоделируй: выручка +20% при тех же расходах. Покажи новые цифры." },
  { icon: "📉", label: "Что если -15%", prompt: "Смоделируй: выручка -15%. Кто станет убыточным?" },
  { icon: "💡", label: "Рекомендации", prompt: "ТОП-5 рекомендаций для роста прибыли с цифрами." },
  { icon: "🎯", label: "Оптимизация", prompt: "Где сократить расходы? Анализ: ЗП, реклама, транспорт, штрафы." },
];

var TOOL_ACTIONS = [
  { icon: "📋", label: "Сводка", action: "summary" },
  { icon: "🔄", label: "Сравнить", action: "compare" },
  { icon: "📊", label: "Прогноз", action: "forecast" },
  { icon: "🧮", label: "Структура", action: "structure" },
];

var TOOL_PROMPTS = {
  summary: "Краткая сводка: показатели, топ проекты, риски, рекомендация.",
  compare: "Сравни все периоды: динамика выручки, расходов, прибыли, маржи.",
  forecast: "Прогноз на следующий месяц с учётом трендов.",
  structure: "Структура расходов по каждому проекту: ЗП, реклама, транспорт, штрафы, налоги.",
};

function formatMessage(text) {
  if (!text) return "";
  var h = text
    .replace(/## (.+)/g, '<h3 class="ai-h3">$1</h3>')
    .replace(/### (.+)/g, '<h4 class="ai-h4">$1</h4>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, '<code class="ai-code">$1</code>')
    .replace(/^\- (.+)/gm, '<li class="ai-li">$1</li>')
    .replace(/^\d+\. (.+)/gm, '<li class="ai-li-n">$1</li>')
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br/>");
  h = h.replace(/(<li class="ai-li">.*?<\/li>)+/gs, function (m) { return '<ul class="ai-ul">' + m + "</ul>"; });
  h = h.replace(/(<li class="ai-li-n">.*?<\/li>)+/gs, function (m) { return '<ol class="ai-ol">' + m + "</ol>"; });
  return "<p>" + h + "</p>";
}

function GreetingDropdown(props) {
  var greeting = props.greeting;
  var onSelect = props.onSelect;
  var onClose = props.onClose;
  var btnRect = props.btnRect;

  if (!btnRect) return null;

  var style = {
    position: "fixed",
    top: btnRect.bottom + 8,
    right: window.innerWidth - btnRect.right,
    zIndex: 99999,
  };

  return ReactDOM.createPortal(
    React.createElement(React.Fragment, null,
      React.createElement("div", {
        style: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99998 },
        onClick: onClose
      }),
      React.createElement("div", { className: "greeting-dropdown-portal", style: style },
        GREETINGS.map(function (g) {
          return React.createElement("button", {
            key: g.value,
            className: "greeting-option" + (greeting === g.value ? " active" : ""),
            onClick: function () { onSelect(g.value); }
          },
            React.createElement("span", { className: "greeting-option-label" }, g.label),
            React.createElement("span", { className: "greeting-option-desc" }, g.desc)
          );
        })
      )
    ),
    document.body
  );
}

export default function AssistantPage() {
  var _s = useState(false), mounted = _s[0], setMounted = _s[1];
  var _m = useState([]), messages = _m[0], setMessages = _m[1];
  var _i = useState(""), input = _i[0], setInput = _i[1];
  var _l = useState(false), loading = _l[0], setLoading = _l[1];
  var _e = useState(""), error = _e[0], setError = _e[1];
  var _mo = useState(""), month = _mo[0], setMonth = _mo[1];
  var _ms = useState([]), months = _ms[0], setMonths = _ms[1];
  var _t = useState(0), tokens = _t[0], setTokens = _t[1];
  var _r = useState(false), recording = _r[0], setRecording = _r[1];
  var _tr = useState(false), transcribing = _tr[0], setTranscribing = _tr[1];
  var _tl = useState(null), ttsLoading = _tl[0], setTtsLoading = _tl[1];
  var _pl = useState(null), playingId = _pl[0], setPlayingId = _pl[1];
  var _g = useState("sir"), greeting = _g[0], setGreeting = _g[1];
  var _sg = useState(false), showGreetingPicker = _sg[0], setShowGreetingPicker = _sg[1];
  var _br = useState(null), btnRect = _br[0], setBtnRect = _br[1];
  var chatRef = useRef(null);
  var mediaRecorderRef = useRef(null);
  var chunksRef = useRef([]);
  var audioRef = useRef(null);
  var greetingBtnRef = useRef(null);

  useEffect(function () {
    setMounted(true);
    try { var saved = localStorage.getItem("jarvis-greeting"); if (saved) setGreeting(saved); } catch (e) {}
  }, []);

  useEffect(function () {
    (async function () {
      try {
        var r = await fetch("/api/periods-list");
        var d = await r.json();
        if (d && d.periods && d.periods.length) { setMonths(d.periods); setMonth(d.periods[0]); }
      } catch (e) {}
    })();
  }, []);

  useEffect(function () {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, loading]);

  function toggleGreetingPicker() {
    if (showGreetingPicker) {
      setShowGreetingPicker(false);
    } else {
      if (greetingBtnRef.current) {
        setBtnRect(greetingBtnRef.current.getBoundingClientRect());
      }
      setShowGreetingPicker(true);
    }
  }

  function changeGreeting(val) {
    setGreeting(val);
    try { localStorage.setItem("jarvis-greeting", val); } catch (e) {}
    setShowGreetingPicker(false);
  }

  function stopAudio() {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setPlayingId(null);
  }

  async function autoSpeak(text, msgId) {
    setTtsLoading(msgId);
    try {
      var res = await fetch("/api/text-to-speech", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text }),
      });
      var data = await res.json();
      if (data.ok && data.audio) {
        var audio = new Audio(data.audio);
        audio.onended = function () { setPlayingId(null); audioRef.current = null; };
        audio.onerror = function () { setPlayingId(null); audioRef.current = null; };
        audioRef.current = audio; setPlayingId(msgId); audio.play();
      }
    } catch (e) {}
    setTtsLoading(null);
  }

  async function callAssistant(msgs, isVoice) {
    var res = await fetch("/api/assistant", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: msgs, month: month, isVoice: isVoice, greeting: greeting }),
    });
    var data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || "Ошибка AI");
    return data;
  }

  async function sendMessage(text) {
    var trimmed = (text || input).trim();
    if (!trimmed || loading) return;
    stopAudio();
    var userMsg = { role: "user", content: trimmed, ts: Date.now() };
    var next = messages.concat([userMsg]);
    setMessages(next); setInput(""); setError(""); setLoading(true);
    try {
      var data = await callAssistant(next, false);
      setMessages(function (prev) { return prev.concat([{ role: "assistant", content: data.reply, ts: Date.now(), id: Date.now() }]); });
      if (data.usage && data.usage.total_tokens) setTokens(function (t) { return t + data.usage.total_tokens; });
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  async function sendMessageWithVoice(text) {
    var trimmed = (text || "").trim();
    if (!trimmed || loading) return;
    stopAudio();
    var userMsg = { role: "user", content: trimmed, ts: Date.now() };
    var next = messages.concat([userMsg]);
    setMessages(next); setInput(""); setError(""); setLoading(true);
    try {
      var data = await callAssistant(next, true);
      var aiMsg = { role: "assistant", content: data.reply, ts: Date.now(), id: Date.now() };
      setMessages(function (prev) { return prev.concat([aiMsg]); });
      if (data.usage && data.usage.total_tokens) setTokens(function (t) { return t + data.usage.total_tokens; });
      setLoading(false);
      await autoSpeak(data.reply, aiMsg.id);
      return;
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  function handleKeyDown(e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }

  async function startRecording() {
    try {
      var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      var mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      var mr = new MediaRecorder(stream, { mimeType: mimeType });
      chunksRef.current = [];
      mr.ondataavailable = function (e) { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async function () {
        stream.getTracks().forEach(function (t) { t.stop(); });
        await transcribeAudio(new Blob(chunksRef.current, { type: mimeType }));
      };
      mr.start(); mediaRecorderRef.current = mr; setRecording(true);
    } catch (e) { setError("Микрофон: " + e.message); }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") mediaRecorderRef.current.stop();
    setRecording(false);
  }

  function toggleRecording() { if (recording) stopRecording(); else startRecording(); }

  async function transcribeAudio(blob) {
    setTranscribing(true);
    try {
      var reader = new FileReader();
      var base64 = await new Promise(function (r) { reader.onloadend = function () { r(reader.result); }; reader.readAsDataURL(blob); });
      var res = await fetch("/api/voice-to-text", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio: base64 }),
      });
      var data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Ошибка распознавания");
      if (data.text) { setInput(""); await sendMessageWithVoice(data.text); }
    } catch (e) { setError("Распознавание: " + e.message); }
    setTranscribing(false);
  }

  async function speakMessage(msg) {
    if (playingId === msg.id) { stopAudio(); return; }
    stopAudio(); setTtsLoading(msg.id);
    try {
      var res = await fetch("/api/text-to-speech", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: msg.content }),
      });
      var data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Ошибка озвучки");
      var audio = new Audio(data.audio);
      audio.onended = function () { setPlayingId(null); audioRef.current = null; };
      audio.onerror = function () { setPlayingId(null); audioRef.current = null; };
      audioRef.current = audio; setPlayingId(msg.id); audio.play();
    } catch (e) { setError("TTS: " + e.message); }
    setTtsLoading(null);
  }

  function clearChat() { setMessages([]); setError(""); setTokens(0); stopAudio(); }

  var vs = recording ? "recording" : transcribing ? "transcribing" : loading ? "thinking" : playingId ? "speaking" : messages.length ? "ready" : "idle";
  var statusLabels = { idle: "Ожидание", ready: "Готов", recording: "🎙️ Запись...", transcribing: "✍️ Распознаю...", thinking: "🧠 Думает...", speaking: "🔊 Говорит..." };
  var statusClass = { idle: "idle", ready: "listening", recording: "listening", transcribing: "thinking", thinking: "thinking", speaking: "speaking" };
  var currentGreeting = GREETINGS.find(function (g) { return g.value === greeting; }) || GREETINGS[0];

  var emptyTitle = "Добрый день. J.A.R.V.I.S. к вашим услугам.";
  if (greeting === "sir") emptyTitle = "Добрый день, сэр. J.A.R.V.I.S. к вашим услугам.";
  if (greeting === "mam") emptyTitle = "Добрый день, мэм. J.A.R.V.I.S. к вашим услугам.";
  if (greeting === "boss") emptyTitle = "Добрый день, босс. J.A.R.V.I.S. к вашим услугам.";

  return (
    <DkrsAppShell>
      <div className={"assistant-page" + (mounted ? " mounted" : "")}>

        <div className="assistant-hero glass-card">
          <div className="assistant-hero-icon jarvis">J</div>
          <div className="assistant-hero-text">
            <h2>J.A.R.V.I.S. <span className="jarvis-sub">DKRS Edition</span></h2>
            <p>Голос Onyx • Whisper • Все устройства и браузеры</p>
          </div>
          <button
            ref={greetingBtnRef}
            className="greeting-picker-btn"
            onClick={toggleGreetingPicker}
          >
            {currentGreeting.label} <span className="greeting-arrow">▾</span>
          </button>
        </div>

        {showGreetingPicker && (
          <GreetingDropdown
            greeting={greeting}
            onSelect={changeGreeting}
            onClose={function () { setShowGreetingPicker(false); }}
            btnRect={btnRect}
          />
        )}

        <div className="assistant-controls glass-card">
          <div className="assistant-controls-left">
            <div className="assistant-control-icon">📅</div>
            <select className="dkrs-select" value={month} onChange={function (e) { setMonth(e.target.value); }}>
              <option value="">Все периоды</option>
              {months.map(function (m) { return <option key={m} value={m}>{m}</option>; })}
            </select>
            <span className="assistant-control-arrow">→</span>
            <div className="assistant-status-badges">
              <span className={"assistant-status-badge " + statusClass[vs]}>
                <span className="dot" />{statusLabels[vs]}
              </span>
              {tokens > 0 && <span className="assistant-status-badge idle">🔢 {tokens.toLocaleString()}</span>}
            </div>
          </div>
          <div className="assistant-controls-right">
            {TOOL_ACTIONS.map(function (t) {
              return (
                <button key={t.action} className="assistant-tool-btn" onClick={function () { sendMessage(TOOL_PROMPTS[t.action]); }} disabled={loading || recording} title={t.label}>
                  <span>{t.icon}</span><span className="tool-btn-label">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="assistant-widget glass-card">
          <div className="assistant-widget-header">
            <div>
              <div className="assistant-widget-title">💬 Чат с J.A.R.V.I.S.</div>
              <div className="assistant-widget-subtitle">{messages.length} сообщений • {month || "все периоды"} • {currentGreeting.desc}</div>
            </div>
            <button className="assistant-clear-btn" onClick={clearChat} disabled={!messages.length && !error}>🗑️ Очистить</button>
          </div>

          <div className="assistant-prompts-grid">
            {QUICK_PROMPTS.map(function (p, i) {
              return (
                <button key={i} className="assistant-prompt-card" onClick={function () { sendMessage(p.prompt); }} disabled={loading || recording}>
                  <span className="prompt-card-icon">{p.icon}</span>
                  <span className="prompt-card-label">{p.label}</span>
                </button>
              );
            })}
          </div>

          <div className="assistant-chat-box">
            <div className="assistant-chat-messages" ref={chatRef}>
              {messages.length === 0 && !loading ? (
                <div className="assistant-chat-empty">
                  <div className="empty-robot jarvis-logo">J</div>
                  <div className="empty-title">{emptyTitle}</div>
                  <div className="empty-desc">Текст → развёрнутый ответ • 🎙️ Голос → быстрый ответ + озвучка</div>
                </div>
              ) : (
                messages.map(function (m, i) {
                  return (
                    <div key={i} className={"assistant-message " + m.role}>
                      <div className="assistant-message-bubble">
                        <div className="assistant-message-header">
                          <span className="assistant-message-avatar">
                            {m.role === "user" ? "👤" : <span className="jarvis-mini">J</span>}
                          </span>
                          <span className="assistant-message-role">
                            {m.role === "user" ? "Вы" : "J.A.R.V.I.S."}
                          </span>
                          <span className="assistant-message-time">
                            {m.ts ? new Date(m.ts).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : ""}
                          </span>
                          {m.role === "assistant" && (
                            <button
                              className={"msg-speak-btn" + (playingId === m.id ? " active" : "")}
                              onClick={function () { speakMessage(m); }}
                              disabled={ttsLoading === m.id}
                            >
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
                  );
                })
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
                  className={"assistant-voice-btn" + (recording ? " recording" : "") + (transcribing ? " transcribing" : "")}
                  onClick={toggleRecording} disabled={loading || transcribing}
                  title={recording ? "Стоп" : "Голос"}
                >
                  {transcribing ? <span className="mini-spin" /> : recording ? "⏹" : "🎙️"}
                </button>
                <textarea
                  className="assistant-textarea" value={input}
                  onChange={function (e) { setInput(e.target.value); }}
                  onKeyDown={handleKeyDown}
                  placeholder={recording ? "🎙️ Говорите..." : transcribing ? "✍️ Распознаю..." : "Спросите что угодно... (Enter — отправить)"}
                  disabled={loading || recording || transcribing} rows={2}
                />
                <button className="assistant-send-btn" onClick={function () { sendMessage(); }} disabled={!input.trim() || loading || recording}>
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
