// pages/dashboard.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import DkrsAppShell from "../components/DkrsAppShell";

function n(x) {
  const v = Number(x);
  return Number.isFinite(v) ? v : 0;
}
function pick(obj, keys, fallback = null) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return fallback;
}

function fmtMoney(x) {
  return n(x).toLocaleString("ru-RU");
}
function fmtPct(x) {
  return `${(n(x) * 100).toFixed(1)}%`;
}
function fmtDeltaMoney(d) {
  const v = n(d);
  const sign = v > 0 ? "+" : v < 0 ? "−" : "±";
  return `${sign}${fmtMoney(Math.abs(v))}`;
}
function fmtDeltaPp(d) {
  const v = n(d) * 100;
  const sign = v > 0 ? "+" : v < 0 ? "−" : "±";
  return `${sign}${Math.abs(v).toFixed(1)} п.п.`;
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

/** Count-up */
function useCountUp(value, { duration = 450, decimals = 0 } = {}) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);
  const rafRef = useRef(null);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;

    if (from === to) {
      setDisplay(to);
      return;
    }

    const start = performance.now();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const tick = (t) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const cur = from + (to - from) * eased;

      const factor = Math.pow(10, decimals);
      setDisplay(Math.round(cur * factor) / factor);

      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else {
        prevRef.current = to;
        setDisplay(to);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => rafRef.current && cancelAnimationFrame(rafRef.current);
  }, [value, duration, decimals]);

  return display;
}

function KpiCard({ title, value, hint, negative, deltaText, deltaTone }) {
  const deltaClass =
    deltaTone === "pos" ? "dkrs-delta-pos" : deltaTone === "neg" ? "dkrs-delta-neg" : "";

  return (
    <div className="dkrs-stat">
      <div className="dkrs-stat-head">
        <div className="dkrs-stat-label">{title}</div>
        {deltaText ? <div className={`dkrs-stat-delta ${deltaClass}`}>{deltaText}</div> : <div />}
      </div>

      <div className={`dkrs-stat-kpi ${negative ? "dkrs-neg" : ""}`}>{value}</div>
      <div className="dkrs-stat-sub">{hint}</div>
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className="dkrs-stat">
      <div className="dkrs-skel dkrs-skel-line" style={{ width: 120 }} />
      <div className="dkrs-skel dkrs-skel-big" style={{ width: 180, marginTop: 10 }} />
      <div className="dkrs-skel dkrs-skel-line" style={{ width: 140, marginTop: 10 }} />
    </div>
  );
}

function TableSkeleton({ rows = 8, cols = 11 }) {
  const widths = ["55%","80%","70%","70%","70%","60%","55%","55%","55%","55%","55%"];
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="dkrs-row">
          {Array.from({ length: cols }).map((__, c) => (
            <td key={c}>
              <div className="dkrs-skel dkrs-skel-line" style={{ width: widths[c] || "70%", height: 14 }} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

function extractTotals(data) {
  const totalsRaw =
    data?.totals || data?.total || data?.summary || data?.kpi || data?.metrics || {};

  const revenue = n(pick(totalsRaw, ["revenue_no_vat", "revenue", "revenueNoVat", "total_revenue"], 0));
  const costs = n(pick(totalsRaw, ["costs", "expenses", "total_costs", "total_expenses"], 0));
  const profit = n(pick(totalsRaw, ["profit", "net_profit"], revenue - costs));
  const margin = revenue > 0 ? profit / revenue : n(pick(totalsRaw, ["margin"], 0));
  const projectsCount =
    pick(totalsRaw, ["projects_count", "projectsCount"], null) ??
    (Array.isArray(data?.projects) ? data.projects.length : null);

  return { revenue, costs, profit, margin, projectsCount };
}

export default function DashboardPage() {
  const [months, setMonths] = useState([]);
  const [month, setMonth] = useState("");

  const [riskFilter, setRiskFilter] = useState("all"); // all | yellow_red | red | green
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  // previous month compare
  const [prevMonth, setPrevMonth] = useState("");
  const [prevData, setPrevData] = useState(null);
  const [prevLoading, setPrevLoading] = useState(false);

  const [animKey, setAnimKey] = useState(0);

  // report generation UI
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");

  // table filters
  const [projectQuery, setProjectQuery] = useState("");
  const [sortKey, setSortKey] = useState("margin");
  const [sortDir, setSortDir] = useState("asc");

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/months");
      const j = await r.json();
      const list = j?.months || j || [];
      setMonths(list);
      setMonth(list?.[0] || "");
    })();
  }, []);

  useEffect(() => {
    if (!month || !months?.length) {
      setPrevMonth("");
      return;
    }
    const idx = months.findIndex((m) => String(m) === String(month));
    const pm = idx >= 0 ? (months[idx + 1] || "") : "";
    setPrevMonth(pm);
  }, [month, months]);

  useEffect(() => {
    if (!month) return;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/dashboard?month=${encodeURIComponent(month)}`);
        const j = await r.json();
        setData(j);
        setAnimKey((k) => k + 1);
      } finally {
        setLoading(false);
      }
    })();
  }, [month]);

  useEffect(() => {
    if (!prevMonth) {
      setPrevData(null);
      return;
    }
    (async () => {
      setPrevLoading(true);
      try {
        const r = await fetch(`/api/dashboard?month=${encodeURIComponent(prevMonth)}`);
        const j = await r.json();
        setPrevData(j);
      } catch {
        setPrevData(null);
      } finally {
        setPrevLoading(false);
      }
    })();
  }, [prevMonth]);

  const totals = useMemo(() => extractTotals(data), [data]);
  const prevTotals = useMemo(() => (prevData ? extractTotals(prevData) : null), [prevData]);

  const deltas = useMemo(() => {
    if (!prevTotals) return null;
    return {
      revenue: totals.revenue - prevTotals.revenue,
      costs: totals.costs - prevTotals.costs,
      profit: totals.profit - prevTotals.profit,
      margin: totals.margin - prevTotals.margin,
      projectsCount: n(totals.projectsCount ?? 0) - n(prevTotals.projectsCount ?? 0),
    };
  }, [totals, prevTotals]);

  const revenueAnim = useCountUp(totals.revenue, { duration: 520, decimals: 0 });
  const costsAnim = useCountUp(totals.costs, { duration: 520, decimals: 0 });
  const profitAnim = useCountUp(totals.profit, { duration: 520, decimals: 0 });
  const marginAnim = useCountUp(totals.margin, { duration: 520, decimals: 4 });
  const projectsAnim = useCountUp(n(totals.projectsCount ?? 0), { duration: 380, decimals: 0 });

  const projectsRaw = Array.isArray(data?.projects)
    ? data.projects
    : (Array.isArray(data?.items) ? data.items : []);

  const projects = useMemo(() => {
    return (projectsRaw || []).map((p) => {
      const revenue = n(pick(p, ["revenue_no_vat", "revenue", "revenueNoVat"], 0));
      const costs = n(pick(p, ["costs", "expenses", "total_costs"], 0));
      const profit = n(pick(p, ["profit"], revenue - costs));
      const margin = revenue > 0 ? profit / revenue : n(pick(p, ["margin"], 0));
      const risk = normalizeRisk(pick(p, ["risk_level", "risk", "riskLevel"], "green"));

      return {
        project_name: String(pick(p, ["project_name", "project", "name"], "—")),
        risk_level: risk,
        revenue,
        costs,
        profit,
        margin,
        penalties: n(pick(p, ["penalties", "fine", "fines"], 0)),
        ads: n(pick(p, ["ads", "marketing", "ad_costs"], 0)),
        salary_workers: n(pick(p, ["salary_workers", "salary", "fot_workers", "workers_salary", "labor"], 0)),
        transport: n(pick(p, ["transport"], 0)),
        team_payroll: n(pick(p, ["team_payroll"], 0)),
      };
    });
  }, [projectsRaw]);

  async function generateReport() {
    if (!month || reportLoading) return;

    setReportError("");
    setReportLoading(true);

    const url = `/api/report?month=${encodeURIComponent(month)}`;

    try {
      let resp = await fetch(url, { method: "POST" });
      if (resp.status === 405) resp = await fetch(url);

      const text = await resp.text();
      let json = null;
      try { json = JSON.parse(text); } catch {}

      if (!resp.ok) {
        setReportError(text.slice(0, 800));
        return;
      }

      const id = json?.id;
      if (id) window.location.href = `/reports/${id}`;
      else window.location.href = `/reports?ts=${Date.now()}`;
    } catch (e) {
      setReportError(String(e?.message || e));
    } finally {
      setReportLoading(false);
    }
  }

  const filteredProjects = useMemo(() => {
    const q = projectQuery.trim().toLowerCase();

    let list = projects;

    if (riskFilter === "red") list = list.filter((x) => x.risk_level === "red");
    else if (riskFilter === "green") list = list.filter((x) => x.risk_level === "green");
    else if (riskFilter === "yellow_red") list = list.filter((x) => x.risk_level === "yellow" || x.risk_level === "red");

    if (q) list = list.filter((x) => (x.project_name || "").toLowerCase().includes(q));

    return list;
  }, [projects, riskFilter, projectQuery]);

  const sortedProjects = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;

    const get = (p) => {
      if (sortKey === "project_name") return String(p.project_name || "");
      if (sortKey === "risk_level") return String(p.risk_level || "");
      return n(p[sortKey]);
    };

    return [...filteredProjects].sort((a, b) => {
      const av = get(a);
      const bv = get(b);
      if (typeof av === "string" || typeof bv === "string") {
        return String(av).localeCompare(String(bv), "ru") * dir;
      }
      return (av - bv) * dir;
    });
  }, [filteredProjects, sortKey, sortDir]);

  function toggleSort(key) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function SortIcon({ colKey }) {
    if (sortKey !== colKey) return <span className="dkrs-sort dim">↕</span>;
    return <span className="dkrs-sort">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  const deltaRevenue = deltas ? fmtDeltaMoney(deltas.revenue) : null;
  const deltaCosts = deltas ? fmtDeltaMoney(deltas.costs) : null;
  const deltaProfit = deltas ? fmtDeltaMoney(deltas.profit) : null;
  const deltaMargin = deltas ? fmtDeltaPp(deltas.margin) : null;
  const deltaProjects = deltas
    ? `${deltas.projectsCount > 0 ? "+" : deltas.projectsCount < 0 ? "−" : "±"}${Math.abs(deltas.projectsCount)}`
    : null;

  const toneMoney = (v) => (v > 0 ? "pos" : v < 0 ? "neg" : "neutral");
  const toneCosts = (v) => (v > 0 ? "neg" : v < 0 ? "pos" : "neutral");

  const right = (
    <>
      <span className="dkrs-badge">
        <span className="dkrs-dot dkrs-dot-green" />
        LIVE • <span className="dkrs-mono">{month || ""}</span>
      </span>

      <button className="dkrs-btn dkrs-btn-primary" onClick={generateReport} disabled={reportLoading}>
        {reportLoading ? "Генерируем…" : "Generate report"}
      </button>

      <Link href="/reports" legacyBehavior>
        <a className="dkrs-btn dkrs-btn-ghost">Reports</a>
      </Link>
    </>
  );

  return (
    <DkrsAppShell
      title="Dashboard"
      subtitle={
        month
          ? `AI Finance CRM • Период: ${month}${prevMonth ? ` • сравнение с ${prevMonth}` : ""}`
          : "AI Finance CRM • загрузка периода…"
      }
      right={right}
    >
      {/* Controls */}
      <div className="dkrs-card" style={{ marginBottom: 14 }}>
        <div className="dkrs-card-body">
          <div className="dkrs-controls">
            <div className="dkrs-field">
              <div className="dkrs-field-label">Месяц</div>
              <select className="dkrs-select" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Выбор месяца">
                {months.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="dkrs-pills">
              <button className={`dkrs-pill ${riskFilter === "all" ? "dkrs-pill-active" : ""}`} onClick={() => setRiskFilter("all")}>Все</button>
              <button className={`dkrs-pill ${riskFilter === "yellow_red" ? "dkrs-pill-active" : ""}`} onClick={() => setRiskFilter("yellow_red")}>Жёлтые+красные</button>
              <button className={`dkrs-pill ${riskFilter === "red" ? "dkrs-pill-active" : ""}`} onClick={() => setRiskFilter("red")}>Только красные</button>
              <button className={`dkrs-pill ${riskFilter === "green" ? "dkrs-pill-active" : ""}`} onClick={() => setRiskFilter("green")}>Только зелёные</button>
            </div>

            <div className="dkrs-actions">
              <button
                className="dkrs-btn dkrs-btn-ghost"
                onClick={() => {
                  setSortKey("margin");
                  setSortDir("asc");
                  setProjectQuery("");
                  setRiskFilter("all");
                }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI */}
      <div className="dkrs-grid dkrs-grid-5" style={{ marginBottom: 14 }} key={animKey}>
        {loading && !data ? (
          <>
            <KpiSkeleton /><KpiSkeleton /><KpiSkeleton /><KpiSkeleton /><KpiSkeleton />
          </>
        ) : (
          <>
            <KpiCard title="Выручка" value={fmtMoney(revenueAnim)} hint="без НДС" deltaText={prevLoading ? "…" : (prevMonth ? deltaRevenue : null)} deltaTone={deltas ? toneMoney(deltas.revenue) : "neutral"} />
            <KpiCard title="Расходы" value={fmtMoney(costsAnim)} hint="все затраты" deltaText={prevLoading ? "…" : (prevMonth ? deltaCosts : null)} deltaTone={deltas ? toneCosts(deltas.costs) : "neutral"} />
            <KpiCard title="Прибыль" value={fmtMoney(profitAnim)} hint="выручка − расходы" negative={profitAnim < 0} deltaText={prevLoading ? "…" : (prevMonth ? deltaProfit : null)} deltaTone={deltas ? toneMoney(deltas.profit) : "neutral"} />
            <KpiCard title="Маржа" value={fmtPct(marginAnim)} hint="прибыль / выручка" deltaText={prevLoading ? "…" : (prevMonth ? deltaMargin : null)} deltaTone={deltas ? toneMoney(deltas.margin) : "neutral"} />
            <KpiCard title="Проектов" value={String(Math.round(projectsAnim))} hint={loading ? "обновляем…" : "в выбранном месяце"} deltaText={prevLoading ? "…" : (prevMonth ? deltaProjects : null)} deltaTone="neutral" />
          </>
        )}
      </div>

      {/* Table */}
      <div className="dkrs-card">
        <div className="dkrs-card-header">
          <div>
            <div className="dkrs-card-title">Projects</div>
            <div className="dkrs-small">
              Сортировка: <b>{sortKey}</b> ({sortDir === "asc" ? "по возрастанию" : "по убыванию"}) • Показано: <b>{sortedProjects.length}</b>
            </div>
          </div>

          <input
            className="dkrs-input"
            value={projectQuery}
            onChange={(e) => setProjectQuery(e.target.value)}
            placeholder="Поиск: Верный, Ламода, М.Видео…"
            style={{ maxWidth: 380 }}
          />
        </div>

        <div className="dkrs-card-body" style={{ padding: 0 }}>
          <div style={{ overflowX: "auto" }}>
            <table className="dkrs-table">
              <thead>
                <tr>
                  <th className="sortable" onClick={() => toggleSort("risk_level")}>Риск <SortIcon colKey="risk_level" /></th>
                  <th className="sortable" onClick={() => toggleSort("project_name")}>Проект <SortIcon colKey="project_name" /></th>
                  <th className="sortable" onClick={() => toggleSort("revenue")}>Выручка <SortIcon colKey="revenue" /></th>
                  <th className="sortable" onClick={() => toggleSort("costs")}>Расходы <SortIcon colKey="costs" /></th>
                  <th className="sortable" onClick={() => toggleSort("profit")}>Прибыль <SortIcon colKey="profit" /></th>
                  <th className="sortable" onClick={() => toggleSort("margin")}>Маржа <SortIcon colKey="margin" /></th>
                  <th className="sortable" onClick={() => toggleSort("penalties")}>Штрафы <SortIcon colKey="penalties" /></th>
                  <th className="sortable" onClick={() => toggleSort("ads")}>Реклама <SortIcon colKey="ads" /></th>
                  <th className="sortable" onClick={() => toggleSort("transport")}>Транспорт <SortIcon colKey="transport" /></th>
                  <th className="sortable" onClick={() => toggleSort("salary_workers")}>ФОТ (рабочие) <SortIcon colKey="salary_workers" /></th>
                  <th className="sortable" onClick={() => toggleSort("team_payroll")}>ФОТ (команда) <SortIcon colKey="team_payroll" /></th>
                </tr>
              </thead>

              {loading && (!data || sortedProjects.length === 0) ? (
                <TableSkeleton rows={8} cols={11} />
              ) : (
                <tbody>
                  {sortedProjects.map((p, idx) => (
                    <tr key={`${p.project_name}-${idx}`} className="dkrs-row">
                      <td>
                        <span className="dkrs-badge">
                          <span className={`dkrs-dot ${
                            p.risk_level === "red" ? "dkrs-dot-red" : p.risk_level === "yellow" ? "dkrs-dot-yellow" : "dkrs-dot-green"
                          }`} />
                          {riskRu(p.risk_level)}
                        </span>
                      </td>
                      <td className="dkrs-strong">{p.project_name}</td>
                      <td className="dkrs-num">{fmtMoney(p.revenue)}</td>
                      <td className="dkrs-num">{fmtMoney(p.costs)}</td>
                      <td className={`dkrs-num dkrs-strong ${p.profit < 0 ? "dkrs-neg" : ""}`}>{fmtMoney(p.profit)}</td>
                      <td className="dkrs-num">{fmtPct(p.margin)}</td>
                      <td className="dkrs-num">{fmtMoney(p.penalties)}</td>
                      <td className="dkrs-num">{fmtMoney(p.ads)}</td>
                      <td className="dkrs-num">{fmtMoney(p.transport)}</td>
                      <td className="dkrs-num">{fmtMoney(p.salary_workers)}</td>
                      <td className="dkrs-num">{fmtMoney(p.team_payroll)}</td>
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* Overlay report */}
      {reportLoading ? (
        <div className="dkrs-overlay">
          <div className="dkrs-toast">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="dkrs-spinner" />
              <div className="dkrs-toast-title">Генерируем AI-отчёт…</div>
            </div>
            <div className="dkrs-toast-sub">Обычно занимает 5–15 секунд. После завершения откроется отчёт автоматически.</div>
            {reportError ? (
              <div className="dkrs-toast-sub" style={{ marginTop: 10, color: "rgba(239,68,68,.95)", fontWeight: 800 }}>
                Ошибка: {reportError}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </DkrsAppShell>
  );
}
