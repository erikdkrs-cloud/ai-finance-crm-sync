import React, { useEffect, useRef, useState } from "react";
import DkrsAppShell from "../components/DkrsAppShell";
import AiFloatingButton from "../components/AiFloatingButton";

const QUICK_PROMPTS = [
  { icon: "📊", label: "Общий анализ", prompt: "Дай полный финансовый анализ за текущий период: выручка, расходы, прибыль, маржа. Выдели ключевые тренды." },
  { icon: "🏆", label: "Лучшие проекты", prompt: "Какие проекты самые прибыльные? Сравни их маржу и объёмы. Почему они успешны?" },
  { icon: "⚠️", label: "Проблемные зоны", prompt: "Какие проекты убыточные или с низкой маржой? Что можно сделать для улучшения?" },
  { icon: "🔴", label: "Аномалии", prompt: "Есть ли аномалии в расходах? Где отклонения от нормы? Подробно разбери каждую." },
  { icon: "📈", label: "Что если +20%", prompt: "Смоделируй сценарий: что если выручка вырастет на 20% при тех же расходах? Покажи новые цифры по каждому проекту." },
  { icon: "📉", label: "Что если -15%", prompt: "Смоделируй сценарий: что если выручка упадёт на 15%? Какие проекты станут убыточными?" },
  { icon: "💡", label: "Рекомендации", prompt: "Дай ТОП-5 конкретных рекомендаций для увеличения прибыли. С цифрами и приоритетами." },
  { icon: "🎯", label: "Оптимизация", prompt: "Где можно сократить расходы без потери качества? Проанализируй структуру расходов каждого проекта." },
];

const TOOL_ACTIONS = [
  { icon: "📋", label: "Сводка", action: "summary" },
  { icon: "🔄", label: "Сравнить периоды", action: "compare" },
  { icon: "📊", label: "Прогноз", action: "forecast" },
  { icon: "🧮", label: "Калькулятор", action: "calculator" },
];

const TOOL_PROMPTS = {
  summary: "Сделай краткую сводку за текущий период в формате: 1) Ключевые показатели 2) Топ проекты 3) Риски 4) Рекомендация на одно предложение.",
  compare: "Сравни доступные периоды между собой. Покажи динамику выручки, расходов, прибыли и маржи. Какой период был лучшим?",
  forecast: "На основе текущих данных дай прогноз на следующий месяц. Какая ожидаемая выручка, расходы и прибыль? Учти тренды.",
  calculator: "Я хочу посчитать финансовые показатели. Покажи текущие данные в формате таблицы и предложи что можно посчитать.",
};

function formatMessage(text) {
  if (!text) return "";
  let html = text
    .replace(/## (.+)/g, '<h3 class="ai-msg-h3">$1</h3>')
    .replace(/### (.+)/g, '<h4 class="ai-msg-h4">$1</h4>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, '<code class="ai-msg-code">$1</code>')
    .replace(/^\- (.+)/gm, '<li class="ai-msg-li">$1</li>')
    .replace(/^\d+\. (.+)/gm, '<li class="ai-msg-li-num">$1</li>')
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br/>");
  html = html.replace(
    /(<li class="ai-msg-li">.*?<\/li>)+/gs,
    (m) => `<ul class="ai-msg-ul">${m}</ul>`
  );
  html = html.replace(
    /(<li class="ai-msg-li-num">.*?<\/li>)+/gs,
    (m) => `<ol class="ai-msg-ol">${m}</ol>`
  );
  return `<p>${html}</p>`;
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
  const chatRef = useRef(null);
  const inputRef = useRef(null);

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
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply, ts: Date.now() }]);
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

  const clearChat = () => { setMessages([]); setError(""); setTokens(0); };

  return (
    <DkrsAppShell>
      <div className={`assistant-page ${mounted ? "mounted" : ""}`}>
        {/* Hero */}
        <div className="assistant-hero glass-card">
          <div className="assistant-hero-icon">🤖</div>
          <div className="assistant-hero-text">
            <h2>AI Финансовый Аналитик</h2>
            <p>Анализ данных, прогнозы, моделирование сценариев, рекомендации — спрашивай что угодно</p>
          </div>
        </div>

        {/* Controls bar */}
        <div className="assistant-controls glass-card">
          <div className="assistant-controls-left">
            <div className="assistant-control-icon">📅</div>
            <select className="dkrs-select" value={month} onChange={(e) => setMonth(e.target.value)}>
              <option value="">Все периоды</option>
              {months.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <span className="assistant-control-arrow">→</span>
            <div className="assistant-status-badges">
              <span className={`assistant-status-badge ${loading ? "thinking" : messages.length ? "listening" : "idle"}`}>
                <span className="dot" />
                {loading ? "Думает..." : messages.length ? "Готов" : "Ожидание"}
              </span>
              {tokens > 0 && (
                <span className="assistant-status-badge idle">🔢 {tokens.toLocaleString()} tok</span>
              )}
            </div>
          </div>
          <div className="assistant-controls-right">
            {TOOL_ACTIONS.map((t) => (
              <button key={t.action} className="assistant-tool-btn" onClick={() => sendMessage(TOOL_PROMPTS[t.action])} disabled={loading} title={t.label}>
                <span>{t.icon}</span>
                <span className="tool-btn-label">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main chat area */}
        <div className="assistant-widget glass-card">
          <div className="assistant-widget-header">
            <div>
              <div className="assistant-widget-title">💬 Чат с AI</div>
              <div className="assistant-widget-subtitle">
                {messages.length} сообщений • Период: {month || "все"}
              </div>
            </div>
            <button className="assistant-clear-btn" onClick={clearChat} disabled={!messages.length && !error}>
              🗑️ Очистить
            </button>
          </div>

          {/* Quick prompts */}
          <div className="assistant-prompts-grid">
            {QUICK_PROMPTS.map((p, i) => (
              <button key={i} className="assistant-prompt-card" onClick={() => sendMessage(p.prompt)} disabled={loading}>
                <span className="prompt-card-icon">{p.icon}</span>
                <span className="prompt-card-label">{p.label}</span>
              </button>
            ))}
          </div>

          {/* Chat box */}
          <div className="assistant-chat-box">
            <div className="assistant-chat-messages" ref={chatRef}>
              {messages.length === 0 && !loading ? (
                <div className="assistant-chat-empty">
                  <div className="empty-robot">🤖</div>
                  <div className="empty-title">Привет! Я AI-аналитик DKRS</div>
                  <div className="empty-desc">Задай вопрос или нажми на быструю команду выше</div>
                </div>
              ) : (
                messages.map((m, i) => (
                  <div key={i} className={`assistant-message ${m.role}`}>
                    <div className="assistant-message-bubble">
                      <div className="assistant-message-header">
                        <span className="assistant-message-avatar">{m.role === "user" ? "👤" : "🤖"}</span>
                        <span className="assistant-message-role">{m.role === "user" ? "Вы" : "AI Аналитик"}</span>
                        <span className="assistant-message-time">
                          {m.ts ? new Date(m.ts).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : ""}
                        </span>
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
                      <span className="assistant-message-avatar">🤖</span>
                      <span className="assistant-message-role">AI Аналитик</span>
                    </div>
                    <div className="assistant-typing">
                      <span /><span /><span />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Composer */}
            <div className="assistant-composer">
              {error && <div className="assistant-error">⚠️ {error}</div>}
              <div className="assistant-input-row">
                <textarea
                  ref={inputRef}
                  className="assistant-textarea"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Спросите что угодно... (Enter — отправить, Shift+Enter — новая строка)"
                  disabled={loading}
                  rows={2}
                />
                <button className="assistant-send-btn" onClick={() => sendMessage()} disabled={!input.trim() || loading}>
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
