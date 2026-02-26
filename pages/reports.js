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

async function fetchJsonSafe(url) {
  const resp = await fetch(url);
  const text = await resp.text(); // сначала текст
  try {
    return { ok: resp.ok, data: JSON.parse(text), raw: text };
  } catch (e) {
    // если вернулся HTML (ошибка), мы это покажем
    return { ok: false, data: null, raw: text };
  }
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
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const r = await fetchJsonSafe("/api/months");
      const arr = r.data?.months || r.data || [];
      if (Array.isArray(arr)) setMonths(arr);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const r = await fetchJsonSafe("/api/reports_list");
        if (!r.ok || !r.data) {
          setError(`Ошибка загрузки /api/reports_list:\n${(r.raw || "").slice(0, 400)}`);
          setList([]);
          return;
        }
        const arr = r.data?.reports || r.data || [];
        setList(Array.isArray(arr) ? arr : []);
      } catch (e) {
        setError(String(e?.message || e));
        setList([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return (list || []).filter((x) => {
      const rr = normalizeRisk(x.risk_level);
      if (month !== "all" && String(x.month) !== month) return false;
      if (risk !== "all" && rr !== risk) return false;
      if (query) {
        const hay = `${x.month || ""}\n${x.summary_text || ""}\n${x.risk_level || ""}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [list, month, risk, q]);

  async function toggleDetails(id) {
    const key = String(id);
    if (openId === key) {
      setOpenId(null);
      return;
    }
    setOpenId(key);

    if (!detail[key]) {
      const r = await fetchJsonSafe(`/api/report_get?id=${encodeURIComponent(key)}`);
      if (!r.ok || !r.data) {
        setDetail((prev) => ({ ...prev, [key]: { error: (r.raw || "").slice(0, 400) } }));
      } else {
        setDetail((prev) => ({ ...prev, [key]: r.data }));
      }
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

            {/* Совместимый Link для старых Next */}
            <Link href="/dashboard"><a className="link">← Дашборд</a></Link>
          </div>
        </div>
      </div>

      {error ? (
        <div className="report-card" style={{ borderColor: "rgba(239,68,68,.35)" }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Ошибка</div>
          <pre style={{ whiteSpace: "pre-wrap", color: "rgba(234,240,255,.85)" }}>{error}</pre>
        </div>
      ) : null}

      <div className="report-grid">
        {filtered.map((r) => {
          const id = String(r.id);
          const rr = normalizeRisk(r.risk_level);
          const d = detail[id];

          const totals = d?.metrics?.totals || d?.metrics?.kpi || d?.metrics || null;
          const revenue = totals?.revenue_no_vat ?? totals?.revenue ?? null;
          const costs = totals?.costs ?? null;
          const profit = totals?.profit ?? null;
          const margin = totals?.margin ?? null;

          return (
            <div key={id} className="report-card">
              <div className="report-head">
                <div>
                  <div className="report-meta">
                    <span className={`badge ${rr}`}><span className="dot" />{riskRu(rr)}</span>
                    <span className="mono">{r.month}</span>
                  </div>

                  <div className="report-title">Отчёт за {r.month}</div>
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <Link href={`/reports/${id}`}><a className="btn">Открыть</a></Link>
                  <button className="btn primary" onClick={() => toggleDetails(id)}>
                    {openId === id ? "Скрыть детали" : "Детали (issues/metrics)"}
                  </button>
                </div>
              </div>

              <div className="report-body">{r.summary_text || "—"}</div>

              {openId === id ? (
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

                  {d?.error ? (
                    <div style={{ marginTop: 12, color: "rgba(239,68,68,.9)", fontWeight: 800 }}>
                      Ошибка загрузки деталей: {d.error}
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          );
        })}

        {(!loading && filtered.length === 0 && !error) ? (
          <div className="report-card" style={{ color: "rgba(234,240,255,.75)" }}>
            Нет отчётов под выбранные фильтры.
          </div>
        ) : null}
      </div>
    </div>
  );
}
