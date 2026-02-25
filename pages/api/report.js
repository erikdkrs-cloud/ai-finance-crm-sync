import { useEffect, useState } from "react";

function pillStyle(risk){
  if (risk === "red") return { background: "#ffcccc", color: "#990000" };
  if (risk === "yellow") return { background: "#fff2cc", color: "#7f6000" };
  return { background: "#d9ead3", color: "#274e13" };
}

export default function Reports() {
  const [months, setMonths] = useState([]);
  const [month, setMonth] = useState("");
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // 1) Загружаем список месяцев
  useEffect(() => {
    setErr("");
    fetch("/api/months")
      .then(r => r.json())
      .then(j => {
        if (!j.ok) throw new Error(j.error || "months error");
        const list = j.months || [];
        setMonths(list);
        setMonth(list?.[0] || "");
      })
      .catch(e => setErr(String(e)));
  }, []);

  // 2) Загружаем отчёты за выбранный месяц
  useEffect(() => {
    if (!month) return;
    setErr("");
    setLoading(true);

    fetch(`/api/reports_list?month=${encodeURIComponent(month)}`)
      .then(r => r.json())
      .then(j => {
        if (!j.ok) throw new Error(j.error || "reports error");
        setItems(j.items || []);
      })
      .catch(e => setErr(String(e)))
      .finally(() => setLoading(false));
  }, [month]);

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Reports</h1>
        <a href="/dashboard" style={{ marginLeft: "auto" }}>← Dashboard</a>
      </div>

      {/* Фильтр по месяцу */}
      <div style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Месяц</div>
          <select
            value={month}
            onChange={(e)=>setMonth(e.target.value)}
            style={{ padding: 8, minWidth: 160 }}
            disabled={months.length === 0}
          >
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.7 }}>
          {loading ? "Загрузка…" : (items?.length ? `Отчётов: ${items.length}` : "")}
        </div>
      </div>

      {/* Ошибка */}
      {err && (
        <div style={{ marginTop: 16, color: "#990000", whiteSpace: "pre-wrap" }}>
          {err}
        </div>
      )}

      {/* Список отчётов */}
      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        {items.map((r) => (
          <a
            key={r.id}
            href={`/reports/${r.id}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div
              style={{
                border: "1px solid #eee",
                borderRadius: 12,
                padding: 14,
                cursor: "pointer"
              }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ padding: "4px 8px", borderRadius: 999, ...pillStyle(r.risk_level) }}>
                  {r.risk_level}
                </span>

                <b>{String(r.month || "")}</b>

                <span style={{ marginLeft: "auto", fontSize: 12, opacity: 0.7 }}>
                  {r.created_at ? new Date(r.created_at).toLocaleString() : ""}
                </span>
              </div>

              <pre style={{ whiteSpace: "pre-wrap", marginTop: 10, fontFamily: "inherit" }}>
                {r.summary_text || ""}
              </pre>

              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
                Open → /reports/{r.id}
              </div>
            </div>
          </a>
        ))}

        {!loading && !err && items.length === 0 && (
          <div style={{ marginTop: 6, opacity: 0.7 }}>
            Нет отчётов за выбранный месяц.
          </div>
        )}
      </div>
    </div>
  );
}
