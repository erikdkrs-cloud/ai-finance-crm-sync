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
          // отдаём модели короткую историю (без tool сообщений)
          messages: next.slice(-8),
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
    <div
      className="card"
      style={{
        background: "rgba(255,255,255,.03)",
        border: "1px solid rgba(255,255,255,.08)",
        borderRadius: 14,
        padding: 14,
        marginBottom: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>AI помощник</div>
        <div className="mono" style={{ opacity: 0.65, fontSize: 12 }}>{month || ""}</div>
      </div>

      <div style={{ marginTop: 10, opacity: 0.75, fontSize: 12 }}>
        Примеры: “Сравни {month} с прошлым месяцем”, “Итоги за квартал”, “Почему маржа низкая?”, “Какие проекты убыточные?”
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        <div
          style={{
            maxHeight: 260,
            overflow: "auto",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,.06)",
            padding: 10,
            background: "rgba(0,0,0,.12)",
          }}
        >
          {items.length === 0 ? (
            <div style={{ opacity: 0.7 }}>Задай вопрос — я отвечу по данным из базы.</div>
          ) : (
            items.map((m, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ opacity: 0.6, fontSize: 12, marginBottom: 4 }}>
                  {m.role === "user" ? "Ты" : "AI"}
                </div>
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

        <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
          <button className="btn primary" disabled={!canSend} onClick={send}>
            {loading ? "Думаю…" : "Спросить"}
          </button>

          {err ? (
            <div style={{ color: "rgba(239,68,68,.95)", fontWeight: 800, fontSize: 12, maxWidth: 520, textAlign: "right" }}>
              {err}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
