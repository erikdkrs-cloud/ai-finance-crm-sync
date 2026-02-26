import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

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

/** Count-up without libs */
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
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
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

function KpiCard({ title, value, hint, negative }) {
  return (
    <div className="card kpi">
      <div className="label">{title}</div>
      <div className={`value mono countup ${negative ? "neg" : ""}`}>{value}</div>
      <div className="hint">{hint}</div>
    </div>
  );
}

function KpiSkeleton() {
  return <div className="shimmer kpi-skel" />;
}

function TableSkeleton({ rows = 8, cols = 9 }) {
  const widths = ["60%", "80%", "70%", "70%", "70%", "60%", "50%", "50%", "60%"];
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="row-skel">
          {Array.from({ length: cols }).map((__, c) => (
            <td key={c}>
              <div className="shimmer cell-skel" style={{ width: widths[c] || "70%", height: 14 }} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

export default function DashboardPage() {
  const [months, setMonths] = useState([]);
  const [month, setMonth] = useState("");

  const [riskFilter, setRiskFilter] = useState("all"); // all | yellow_red | red | green
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  // for re-triggering fade animation
  const [animKey, setAnimKey] = useState(0);

  // report generation UI
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");

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

  // totals: support different response shapes
  const totalsRaw =
    data?.totals ||
    data?.total ||
    data?.summary ||
    data?.kpi ||
    data?.metrics ||
    {};

  const totals = useMemo(() => {
    const revenue = n(pick(totalsRaw, ["revenue_no_vat", "revenue", "revenueNoVat", "total_revenue"], 0));
    const costs = n(pick(totalsRaw, ["costs", "expenses", "total_costs", "total_expenses"], 0));
    const profit = n(pick(totalsRaw, ["profit", "net_profit"], revenue - costs));
    const margin = revenue > 0 ? profit / revenue : n(pick(totalsRaw, ["margin"], 0));
    const projectsCount =
      pick(totalsRaw, ["projects_count", "projectsCount"], null) ??
      (Array.isArray(data?.projects) ? data.projects.length : null);

    return { revenue, costs, profit, margin, projectsCount };
  }, [totalsRaw, data]);

  // animations for KPI
  const revenueAnim = useCountUp(totals.revenue, { duration: 520, decimals: 0 });
  const costsAnim = useCountUp(totals.costs, { duration: 520, decimals: 0 });
  const profitAnim = useCountUp(totals.profit, { duration: 520, decimals: 0 });
  const marginAnim = useCountUp(totals.margin, { duration: 520, decimals: 4 });
  const projectsAnim = useCountUp(n(totals.projectsCount ?? 0), { duration: 380, decimals: 0 });

  // projects
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
      };
    });
  }, [projectsRaw]);

  const filteredProjects = useMemo(() => {
    if (riskFilter === "all") return projects;
    if (riskFilter === "red") return projects.filter((x) => x.risk_level === "red");
    if (riskFilter === "green") return projects.filter((x) => x.risk_level === "green");
    return projects.filter((x) => x.risk_level === "yellow" || x.risk_level === "red");
  }, [projects, riskFilter]);

  const sortedProjects = useMemo(() => {
    return [...filteredProjects].sort((a, b) => (a.margin ?? 0) - (b.margin ?? 0));
  }, [filteredProjects]);

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
      try {
        json = JSON.parse(text);
      } catch {}

      if (!resp.ok) {
        setReportError(text.slice(0, 800));
        return;
      }

      const id = json?.id;
      if (id) {
        window.location.href = `/reports/${id}`;
      } else {
        window.location.href = `/reports?ts=${Date.now()}`;
      }
    } catch (e) {
      setReportError(String(e?.message || e));
    } finally {
      setReportLoading(false);
    }
  }

  return (
    <div className="crm-wrap">
      <div className="crm-top">
        <div className="crm-title">
          <h1>Дашборд</h1>
          <div className="sub">
            AI Finance CRM • {month ? `Период: ${month}` : "загрузка периода…"}
          </div>
        </div>

        <div className="crm-controls">
          <div className="select">
            <label>Месяц</label>
            <select value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Выбор месяца">
              {months.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="pills" style={{ marginTop: 18 }}>
            <button className={`pill ${riskFilter === "all" ? "active" : ""}`} onClick={() => setRiskFilter("all")}>
              Все
            </button>
            <button
              className={`pill ${riskFilter === "yellow_red" ? "active" : ""}`}
              onClick={() => setRiskFilter("yellow_red")}
            >
              Жёлтые+красные
            </button>
            <button className={`pill ${riskFilter === "red" ? "active" : ""}`} onClick={() => setRiskFilter("red")}>
              Только красные
            </button>
            <button className={`pill ${riskFilter === "green" ? "active" : ""}`} onClick={() => setRiskFilter("green")}>
              Только зелёные
            </button>
          </div>

          <div className="actions" style={{ marginTop: 18 }}>
            <button className="btn primary" disabled={reportLoading} onClick={generateReport}>
              {reportLoading ? "Генерируем отчёт…" : "Сгенерировать отчёт"}
            </button>

            <Link href="/reports">
              <a className="link">Отчёты →</a>
            </Link>
          </div>
        </div>
      </div>

      <div key={animKey} className={`fade-wrap ${loading ? "is-loading" : ""}`}>
        <div className="kpi-grid">
          {loading && !data ? (
            <>
              <KpiSkeleton />
              <KpiSkeleton />
              <KpiSkeleton />
              <KpiSkeleton />
              <KpiSkeleton />
            </>
          ) : (
            <>
              <KpiCard title="Выручка" value={fmtMoney(revenueAnim)} hint="без НДС" />
              <KpiCard title="Расходы" value={fmtMoney(costsAnim)} hint="все затраты" />
              <KpiCard title="Прибыль" value={fmtMoney(profitAnim)} hint="выручка − расходы" negative={profitAnim < 0} />
              <KpiCard title="Маржа" value={fmtPct(marginAnim)} hint="прибыль / выручка" />
              <KpiCard
                title="Проектов"
                value={String(Math.round(projectsAnim))}
                hint={loading ? "обновляем…" : "в выбранном месяце"}
              />
            </>
          )}
        </div>

        <div className="section-title">
          <h2>Проекты (сначала самые низкие по марже)</h2>
          <div className="small">
            Показано: <b>{sortedProjects.length}</b>
          </div>
        </div>

        <div className="table-wrap table-animate">
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Риск</th>
                  <th>Проект</th>
                  <th>Выручка</th>
                  <th>Расходы</th>
                  <th>Прибыль</th>
                  <th>Маржа</th>
                  <th>Штрафы</th>
                  <th>Реклама</th>
                  <th>ФОТ (рабочие)</th>
                </tr>
              </thead>

              {loading && (!data || sortedProjects.length === 0) ? (
                <TableSkeleton rows={8} cols={9} />
              ) : (
                <tbody>
                  {sortedProjects.map((p, idx) => (
                    <tr key={`${p.project_name}-${idx}`}>
                      <td>
                        <span className={`badge ${p.risk_level}`}>
                          <span className="dot" />
                          {riskRu(p.risk_level)}
                        </span>
                      </td>
                      <td className="strong">{p.project_name}</td>
                      <td className="num">{fmtMoney(p.revenue)}</td>
                      <td className="num">{fmtMoney(p.costs)}</td>
                      <td className={`num strong ${p.profit < 0 ? "neg" : ""}`}>{fmtMoney(p.profit)}</td>
                      <td className="num">{fmtPct(p.margin)}</td>
                      <td className="num">{fmtMoney(p.penalties)}</td>
                      <td className="num">{fmtMoney(p.ads)}</td>
                      <td className="num">{fmtMoney(p.salary_workers)}</td>
                    </tr>
                  ))}

                  {sortedProjects.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: 16, color: "rgba(234,240,255,.65)" }}>
                        Нет данных (проверь месяц или фильтр).
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* Loading overlay while generating report */}
      {reportLoading ? (
        <div className="overlay">
          <div className="toast">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="spinner" />
              <div className="toast-title">Генерируем AI-отчёт…</div>
            </div>
            <div className="toast-sub">
              Обычно занимает 5–15 секунд. Мы считаем KPI, сравнение с прошлым месяцем и формируем рекомендации.
            </div>

            {reportError ? (
              <div className="toast-sub" style={{ marginTop: 10, color: "rgba(239,68,68,.95)", fontWeight: 800 }}>
                Ошибка: {reportError}
              </div>
            ) : null}

            <div className="toast-sub" style={{ marginTop: 10, opacity: 0.85 }}>
              Не закрывай вкладку — после завершения откроется отчёт автоматически.
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
