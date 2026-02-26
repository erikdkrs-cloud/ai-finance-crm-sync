import { useEffect, useMemo, useState } from "react";

function pillStyle(risk){
  if (risk === "red") return { background: "#ffcccc", color: "#990000", border: "1px solid #ff9999" };
  if (risk === "yellow") return { background: "#fff2cc", color: "#7f6000", border: "1px solid #ffe599" };
  return { background: "#d9ead3", color: "#274e13", border: "1px solid #b6d7a8" };
}
function riskRu(r){
  if (r === "red") return "красный";
  if (r === "yellow") return "жёлтый";
  if (r === "green") return "зелёный";
  return String(r || "");
}
function fmt(n){
  const x = Number(n || 0);
  return x.toLocaleString("ru-RU", { maximumFractionDigits: 0 });
}
function pct(x){
  return (Number(x || 0) * 100).toFixed(1) + "%";
}

export default function Reports() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");

  const [month, setMonth] = useState("all");
  const [risk, setRisk] = useState("all");
  const [q, setQ] = useState("");

  // details cache: id -> {loading, data, error}
  const [details, setDetails] = useState({});
  const [openIds, setOpenIds] = useState({}); // id -> bool

  useEffect(() => {
    fetch("/api/reports_list")
      .then(r => r.json())
      .then(j => {
        if (!j.ok) throw new Error(j.error || "reports error");
        setItems(j.items || []);
      })
      .catch(e => setErr(String(e)));
  }, []);

  const months = useMemo(() => {
    const set = new Set();
    for (const r of items) if (r.month) set.add(r.month);
    return ["all", ...Array.from(set).sort().reverse()];
  }, [items]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return (items || []).filter(r => {
      if (month !== "all" && r.month !== month) return false;
      if (risk !== "all" && r.risk_level !== risk) return false;
      if (qq) {
        const text = (r.summary_text || "").toLowerCase();
        if (!text.includes(qq) && !String(r.month || "").includes(qq)) return false;
      }
      return true;
    });
  }, [items, month, risk, q]);

  async function toggleDetails(id) {
    const isOpen = !!openIds[id];
    setOpenIds(prev => ({ ...prev, [id]: !isOpen }));

    if (!isOpen && !details[id]) {
      setDetails(prev => ({ ...prev, [id]: { loading: true, data: null, error: "" } }));
      try {
        const r = await fetch(`/api/report_get?id=${encodeURIComponent(id)}`);
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${r.status}`);
        setDetails(prev => ({ ...prev, [id]: { loading: false, data: j.item, error: "" } }));
      } catch (e) {
        setDetails(prev => ({ ...prev, [id]: { loading: false, data: null, error: String(e) } }));
      }
    }
  }

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0 }}>Отчёты</h1>
        <a href="/dashboard" style={{ marginLeft: "auto" }}>← Дашборд</a>
      </div>

      {err && <div style={{ marginTop: 16, color: "#990000", whiteSpace: "pre-wrap" }}>{err}</div>}

      <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "end", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Месяц</div>
          <select value={month} onChange={(e)=>setMonth(e.target.value)} style={{ padding: 8, minWidth: 160 }}>
            {months.map(m => <option key={m} value={m}>{m === "all" ? "Все" : m}</option>)}
          </select>
        </div>

        <div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Риск</div>
          <select value={risk} onChange={(e)=>setRisk(e.target.value)} style={{ padding: 8, minWidth: 160 }}>
            <option value="all">Все</option>
            <option value="red">красный</option>
            <option value="yellow">жёлтый</option>
            <option value="green">зелёный</option>
          </select>
        </div>

        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Поиск по тексту</div>
          <input
            value={q}
            onChange={(e)=>setQ(e.target.value)}
            placeholder="например: штрафы, маржа, Верный"
            style={{ padding: 8, width: "100%" }}
          />
        </div>

        <div style={{ fontSize: 12, opacity: 0.7 }}>
          Показано: <b>{filtered.length}</b> из {items.length}
        </div>
      </div>

      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        {filtered.map((r) => {
          const id = r.id;
          const isOpen = !!openIds[id];
          const det = details[id];

          return (
            <div key={id} style={{ border: "1px solid #eee", borderRadius: 14, padding: 14, background: "white" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ padding: "4px 10px", borderRadius: 999, ...pillStyle(r.risk_level) }}>
                  {riskRu(r.risk_level)}
                </span>

                <b style={{ fontSize: 16 }}>{String(r.month || "")}</b>

                <span style={{ marginLeft: "auto", fontSize: 12, opacity: 0.7 }}>
                  {String(r.created_at || "")}
                </span>
              </div>

              <div style={{ marginTop: 10, whiteSpace: "pre-wrap", lineHeight: 1.35 }}>
                {r.summary_text}
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center" }}>
                <button
                  onClick={() => toggleDetails(id)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid #ddd",
                    background: "white",
                    cursor: "pointer"
                  }}
                >
                  {isOpen ? "Скрыть детали" : "Детали (issues/metrics)"}
                </button>

                <span style={{ fontSize: 12, opacity: 0.7 }}>
                  id: {id}
                </span>
              </div>

              {isOpen && (
                <div style={{ marginTop: 12, borderTop: "1px solid #eee", paddingTop: 12 }}>
                  {!det && <div>Загрузка…</div>}
                  {det?.loading && <div>Загрузка…</div>}
                  {det?.error && <div style={{ color: "#990000", whiteSpace: "pre-wrap" }}>{det.error}</div>}

                  {det?.data && (
                    <DetailsBlock item={det.data} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DetailsBlock({ item }) {
  const issues = Array.isArray(item.issues) ? item.issues : [];
  const metrics = item.metrics || {};
  const totals = metrics.totals || {};
  const prevTotals = metrics.prevTotals || null;
  const top = metrics.top_projects || [];
  const recs = metrics.recommendations || [];

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <KPI title="Выручка" value={fmt(totals.revenue)} />
        <KPI title="Расходы" value={fmt(totals.costs)} />
        <KPI title="Прибыль" value={fmt(totals.profit)} />
        <KPI title="Маржа" value={pct(totals.margin)} />
        {prevTotals && <KPI title={`Прошлый месяц (${prevTotals.month}) маржа`} value={pct(prevTotals.margin)} />}
      </div>

      <div>
        <h3 style={{ margin: "6px 0" }}>Проблемы (issues)</h3>
        <div style={{ display: "grid", gap: 8 }}>
          {issues.length === 0 && <div style={{ opacity: 0.7 }}>Нет issues</div>}
          {issues.map((i, idx) => (
            <div key={idx} style={{ border: "1px solid #eee", borderRadius: 12, padding: 10 }}>
              <b>[{i.severity}] {i.title}</b>
              {i.details && <div style={{ marginTop: 6, opacity: 0.9 }}>{i.details}</div>}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 style={{ margin: "6px 0" }}>Топ проблемных проектов</h3>
        {Array.isArray(top) && top.length ? (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {top.slice(0, 8).map((p, idx) => (
              <li key={idx}>
                <b>{p.project}</b> — маржа {(Number(p.margin||0)*100).toFixed(1)}%, прибыль {fmt(p.profit)}, выручка {fmt(p.revenue)}
                {p.note ? ` — ${p.note}` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <div style={{ opacity: 0.7 }}>Нет данных</div>
        )}
      </div>

      <div>
        <h3 style={{ margin: "6px 0" }}>Рекомендации</h3>
        {Array.isArray(recs) && recs.length ? (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {recs.slice(0, 12).map((x, idx) => <li key={idx}>{String(x)}</li>)}
          </ul>
        ) : (
          <div style={{ opacity: 0.7 }}>Нет рекомендаций</div>
        )}
      </div>

      <details>
        <summary style={{ cursor: "pointer" }}>Показать сырой metrics JSON</summary>
        <pre style={{ whiteSpace: "pre-wrap", marginTop: 10 }}>{JSON.stringify(metrics, null, 2)}</pre>
      </details>
    </div>
  );
}

function KPI({ title, value }) {
  return (
    <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, minWidth: 180 }}>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{title}</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function fmt(n){
  const x = Number(n || 0);
  return x.toLocaleString("ru-RU", { maximumFractionDigits: 0 });
}
function pct(x){
  return (Number(x || 0) * 100).toFixed(1) + "%";
}
