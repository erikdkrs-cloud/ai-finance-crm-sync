import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

function fmtMoney(n) {
  const x = Number(n || 0);
  return x.toLocaleString("ru-RU");
}
function fmtPct(n) {
  const x = Number(n || 0);
  return `${(x * 100).toFixed(1)}%`;
}

function normalizeRisk(r) {
  // поддержка разных вариантов
  if (!r) return "green";
  const s = String(r).toLowerCase();
  if (s.includes("red") || s.includes("крас")) return "red";
  if (s.includes("yellow") || s.includes("жел")) return "yellow";
  return "green";
}
function riskRu(r) {
  if (r === "red") return "красный";
  if (r === "yellow") return "жёлтый";
  return "зелёный";
}

export default function ReportsPage() {
  const [months, setMonths] = useState([]);
  const [month, setMonth] = useState("all");
  const [risk, setRisk] = useState("all");
  const [q, setQ] = useState("");

  const [list, setList] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [detail, setDetail] = useState({}); // id -> detail
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/months");
      const j = await r.json();
      const m = j?.months || j || [];
      setMonths(m);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await fetch("/api/reports_list");
        const j = await r.json();
        const arr = j?.reports || j || [];
        // ожидаем: [{id, month, risk_level, summary_text, created_at}]
        setList(arr);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return (list || []).filter((x) => {
      const r = normalizeRisk(x.risk_level);
      if (month !== "all" && String(x.month) !== month) return false;
      if (risk !== "all" && r !== risk) return false;
      if (query) {
        const hay = `${x.month || ""}\n${x.summary_text || ""}\n${x.risk_level || ""}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [list, month, risk, q]);

  async function toggleDetails(id) {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setOpenId(id);

    if (!detail[id]) {
      const r = await fetch(`/api/report_get?id=${encodeURIComponent(id)}`);
      const j = await r.json();
      setDetail((prev) => ({ ...prev, [id]: j }));
    }
  }

  return (
    <div className="crm-wrap">
      <div className="crm-top">
        <div className="crm-title">
          <h1>Отчёты</h1>
          <div className="sub">AI Finance CRM • история отчётов и детали</div>
        </div>

        <div className="crm-controls" style={{ width: "100%", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end", flex: 1 }}>
            <div className="select">
              <label>Месяц</label>
              <select value={month} onChange={(e) => setMonth(e.target.value)}>
                <option value="all">Все</option>
                {months.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="select">
              <label>Риск</label>
              <select value={risk} onChange={(e) => setRisk(e.target.value)}>
                <option value="all">Все</option>
                <option value="green">Зелёные</option>
                <option value="yellow">Жёлтые</option>
                <option value="red">Красные</option>
              </select>
            </div>

            <div style={{ minWidth: 320, flex: 1 }}>
              <div className="small-muted" style={{ marginBottom: 6 }}>Поиск по тексту</div>
              <input
                className="input"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="например: штрафы, маржа, Верный"
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 18 }}>
            <div className="small-muted">
              {loading ? "Загрузка…" : <>Показано: <b>{filtered.length}</b> из <b>{list.length}</b></>}
            </div>
            <Link className="link" href="/dashboard">← Дашборд</Link>
          </div>
        </div>
      </div>

      <div className="report-grid">
        {filtered.map((r) => {
          const rr = normalizeRisk(r.risk_level);
          const d = detail[r.id];

          // пробуем вытянуть KPI из metrics (если есть)
          const totals =
            d?.metrics?.totals ||
            d?.metrics?.kpi ||
            d?.metrics ||
            null;

          const revenue = totals?.revenue_no_vat ?? totals?.revenue ?? null;
          const costs = totals?.costs ?? null;
          const profit = totals?.profit ?? null;
          const margin = totals?.margin ?? null;

          return (
            <div key={r.id} className="report-card">
              <div className="report-head">
                <div>
                  <div className="report-meta">
                    <span className={`badge ${rr}`}><span className="dot" />{riskRu(rr)}</span>
                    <span className="mono">{r.month}</span>
                    {r.created_at ? <span className="mono">{String(r.created_at).replace("T", " ").slice(0, 19)}</span> : null}
                  </div>

                  <div className="report-title">
                    Отчёт за {r.month}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <Link className="btn" href={`/reports/${r.id}`}>Открыть</Link>
                  <button className="btn primary" onClick={() => toggleDetails(r.id)}>
                    {openId === r.id ? "Скрыть детали" : "Детали (issues/metrics)"}
                  </button>
                </div>
              </div>

              <div className="report-body">
                {r.summary_text || "—"}
              </div>

              {openId === r.id ? (
                <>
                  {(revenue !== null || costs !== null || profit !== null || margin !== null) ? (
                    <div className="report-kpi">
                      <div className="kpi-mini">
                        <div className="k">Выручка</div>
                        <div className="v mono">{revenue !== null ? fmtMoney(revenue) : "—"}</div>
                      </div>
                      <div className="kpi-mini">
                        <div className="k">Расходы</div>
                        <div className="v mono">{costs !== null ? fmtMoney(costs) : "—"}</div>
                      </div>
                      <div className="kpi-mini">
                        <div className="k">Прибыль</div>
                        <div className="v mono">{profit !== null ? fmtMoney(profit) : "—"}</div>
                      </div>
                      <div className="kpi-mini">
                        <div className="k">Маржа</div>
                        <div className="v mono">{margin !== null ? fmtPct(margin) : "—"}</div>
                      </div>
                    </div>
                  ) : null}

                  <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div className="card" style={{ background: "rgba(255,255,255,.03)" }}>
                      <div style={{ fontWeight: 900 }}>Issues</div>
                      <pre style={{ marginTop: 10, whiteSpace: "pre-wrap", color: "rgba(234,240,255,.82)" }}>
                        {JSON.stringify(d?.issues || [], null, 2)}
                      </pre>
                    </div>
                    <div className="card" style={{ background: "rgba(255,255,255,.03)" }}>
                      <div style={{ fontWeight: 900 }}>Metrics</div>
                      <pre style={{ marginTop: 10, whiteSpace: "pre-wrap", color: "rgba(234,240,255,.82)" }}>
                        {JSON.stringify(d?.metrics || {}, null, 2)}
                      </pre>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          );
        })}

        {(!filtered || filtered.length === 0) ? (
          <div className="report-card" style={{ color: "rgba(234,240,255,.75)" }}>
            Нет отчётов под выбранные фильтры.
          </div>
        ) : null}
      </div>
    </div>
  );
}
