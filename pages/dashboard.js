import React, { useEffect, useMemo, useState } from "react";
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

export default function DashboardPage() {
  const [months, setMonths] = useState([]);
  const [month, setMonth] = useState("");

  const [riskFilter, setRiskFilter] = useState("all"); // all | yellow_red | red | green
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

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
      } finally {
        setLoading(false);
      }
    })();
  }, [month]);

  // totals: поддерживаем разные форматы
  const totalsRaw =
    data?.totals ||
    data?.total ||
    data?.summary ||
    data?.kpi ||
    data?.metrics ||
    {};

  const totals = useMemo(() => {
    const revenue = n(pick(totalsRaw, ["revenue_no_vat", "revenue", "revenueNoVat", "revenue_noVAT", "total_revenue"], 0));
    const costs = n(pick(totalsRaw, ["costs", "expenses", "total_costs", "total_expenses"], 0));
    const profit = n(pick(totalsRaw, ["profit", "net_profit"], revenue - costs));
    const margin = Number.isFinite(revenue) && revenue > 0 ? profit / revenue : n(pick(totalsRaw, ["margin"], 0));

    const projectsCount =
      pick(totalsRaw, ["projects_count", "projectsCount"], null) ??
      (Array.isArray(data?.projects) ? data.projects.length : null);

    return { revenue, costs, profit, margin, projectsCount };
  }, [totalsRaw, data]);

  const projectsRaw = Array.isArray(data?.projects) ? data.projects : (Array.isArray(data?.items) ? data.items : []);

  const projects = useMemo(() => {
    return (projectsRaw || []).map((p) => {
      const revenue = n(pick(p, ["revenue_no_vat", "revenue", "revenueNoVat"], 0));
      const costs = n(pick(p, ["costs", "expenses", "total_costs"], 0));
      const profit = n(pick(p, ["profit"], revenue - costs));
      const margin =
        revenue > 0 ? profit / revenue : n(pick(p, ["margin"], 0));

      const risk = normalizeRisk(pick(p, ["risk_level", "risk", "riskLevel"], "green"));

      return {
        project_name: String(pick(p, ["project_name", "project", "name", "projectTitle"], "—")),
        risk_level: risk,
        revenue,
        costs,
        profit,
        margin,
        penalties: n(pick(p, ["penalties", "fine", "fines"], 0)),
        ads: n(pick(p, ["ads", "marketing", "ad_costs"], 0)),
        salary_workers: n(pick(p, ["salary_workers", "salary", "fot_workers", "workers_salary"], 0)),
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
            <select value={month} onChange={(e) => setMonth(e.target.value)}>
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
            <button
              className="btn primary"
              onClick={async () => {
                if (!month) return;
                await fetch(`/api/report?month=${encodeURIComponent(month)}`, { method: "POST" });
                window.location.href = "/reports";
              }}
            >
              Сгенерировать отчёт
            </button>

            <Link href="/reports">
              <a className="link">Отчёты →</a>
            </Link>
          </div>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="card kpi">
          <div className="label">Выручка</div>
          <div className="value mono">{loading ? "…" : fmtMoney(totals.revenue)}</div>
          <div className="hint">без НДС</div>
        </div>

        <div className="card kpi">
          <div className="label">Расходы</div>
          <div className="value mono">{loading ? "…" : fmtMoney(totals.costs)}</div>
          <div className="hint">все затраты</div>
        </div>

        <div className="card kpi">
          <div className="label">Прибыль</div>
          <div className={`value mono ${totals.profit < 0 ? "neg" : "pos"}`}>
            {loading ? "…" : fmtMoney(totals.profit)}
          </div>
          <div className="hint">выручка − расходы</div>
        </div>

        <div className="card kpi">
          <div className="label">Маржа</div>
          <div className="value mono">{loading ? "…" : fmtPct(totals.margin)}</div>
          <div className="hint">прибыль / выручка</div>
        </div>

        <div className="card kpi">
          <div className="label">Проектов</div>
          <div className="value mono">{loading ? "…" : (totals.projectsCount ?? "—")}</div>
          <div className="hint">{loading ? "обновляем…" : "в выбранном месяце"}</div>
        </div>
      </div>

      <div className="section-title">
        <h2>Проекты (сначала самые низкие по марже)</h2>
        <div className="small">
          Показано: <b>{sortedProjects.length}</b>
        </div>
      </div>

      <div className="table-wrap">
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
          </table>
        </div>
      </div>
    </div>
  );
}
