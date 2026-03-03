import React, { useMemo, useState } from "react";

export default function AiAssistantWidget({ month }) {
  const [input, setInput] = useState("");
  const [items, setItems] = useState([]); // {role, content}
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const canSend = useMemo(() => !!month && input.trim().length > 0 && !loading, [month, input, loading]);

  async function send() {
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
          messages: next.slice(-8), // короткая история
        }),
      });

      const text = await resp.text();
      let json = null;
      try { json = JSON.parse(text); } catch {}

      if (!resp.ok || !json?.ok) {
        setErr((json?.error || text || "Ошибка").slice(0, 800));
        setItems((prev) => [...prev, { role: "assistant", content: "Не получилось получить ответ. Попробуй задать вопрос иначе." }]);
        return;
      }

      setItems((prev) => [...prev, { role: "assistant", content: String(json.answer || "") }]);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ai-widget">
      <div className="ai-title">
        <div style={{ fontWeight: 900, fontSize: 16 }}>AI помощник</div>
        <span className="ai-badge">
          <span className="ai-dot" />
          LIVE • <span className="mono">{month || ""}</span>
        </span>
      </div>

      <div style={{ marginTop: 8, opacity: 0.8, fontSize: 12 }}>
        Примеры: “Сравни {month} с прошлым месяцем”, “Итоги за квартал”, “Почему маржа низкая?”, “Какие проекты убыточные?”
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        <div className="ai-chat" style={{ maxHeight: 260, overflow: "auto" }}>
          {items.length === 0 ? (
            <div style={{ opacity: 0.75 }}>
              Задай вопрос — я отвечу по данным из базы.
            </div>
          ) : (
            items.map((m, i) => (
              <div key={i} className={`ai-msg ${m.role === "user" ? "user" : "assistant"}`}>
                <div className="ai-meta">{m.role === "user" ? "Ты" : "AI"}</div>
                <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.35 }}>
                  {m.content}
                </div>
              </div>
            ))
          )}
        </div>

        <textarea
          className="input"
          rows={3}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Напиши вопрос по финансам, проектам, рискам, кварталу…"
        />

        <div className="ai-actions">
          <button className="btn ai-primary" disabled={!canSend} onClick={send}>
            {loading ? "Думаю…" : "Спросить"}
          </button>

          {err ? (
            <div style={{ color: "rgba(239,68,68,.95)", fontWeight: 800, fontSize: 12, maxWidth: 520, textAlign: "right" }}>
              {err}
            </div>
          ) : (
            <div style={{ opacity: 0.6, fontSize: 12 }}>
              Советы: укажи период (“квартал 2025-Q4”) или проект (“Верный”).
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
