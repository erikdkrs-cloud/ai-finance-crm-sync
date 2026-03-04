// pages/insights.js
import React, { useEffect, useMemo, useState } from "react";
import DkrsAppShell from "../components/DkrsAppShell";
import TopProjectsCards from "../components/TopProjectsCards";
import AnomaliesCard from "../components/AnomaliesCard";

function n(x) { const v = Number(x); return Number.isFinite(v) ? v : 0; }
function pick(obj, keys, fallback = null) {
  for (const k of keys) if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
  return fallback;
}
function fmtMoney(x) { return n(x).toLocaleString("ru-RU"); }
function fmtPct(x) { return `${(n(x) * 100).toFixed(1)}%`; }

function extractTotals(data) {
  const totalsRaw = data?.totals || data?.total || data?.summary || data?.kpi || data?.metrics || {};
  const revenue = n(pick(totalsRaw, ["revenue_no_vat", "revenue", "revenueNoVat", "total_revenue"], 0));
  const costs = n(pick(totalsRaw, ["costs", "expenses", "total_costs", "total_expenses"], 0));
  const profit = n(pick(totalsRaw, ["profit", "net_profit"], revenue - costs));
  const margin = revenue > 0 ? profit / revenue : n(pick(totalsRaw, ["margin"], 0));
  const projectsCount =
    pick(totalsRaw, ["projects_count", "projectsCount"], null) ??
    (Array.isArray(data?.projects) ? data.projects.length : null);
  return { revenue, costs, profit, margin, projectsCount };
}

function normalizeRisk(r) {
  if (!r) return "green";
  const s = String(r).toLowerCase();
  if (s.includes("red") || s.includes("крас")) return "red";
  if (s.includes("yellow") || s.includes("жел")) return "yellow";
  return "green";
}

export default function InsightsPage() {
  const [months, setMonths] = useState([]);
  const [month, setMonth] = useState("");

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

  const projectsRaw = Array.isArray(data?.projects) ? data.projects : (Array.isArray(data?.items) ? data.items : []);
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
        revenue, costs, profit, margin,
        penalties: n(pick(p, ["penalties", "fine", "fines"], 0)),
        ads: n(pick(p, ["ads", "marketing", "ad_costs"], 0)),
        salary_workers: n(pick(p, ["salary_workers", "salary", "fot_workers", "workers_salary", "labor"], 0)),
        transport: n(pick(p, ["transport"], 0)),
        team_payroll: n(pick(p, ["team_payroll"], 0)),
      };
    });
  }, [projectsRaw]);

  const totals = useMemo(() => extractTotals(data), [data]);

  return (
    <DkrsAppShell
      title="Insights"
      subtitle="Краткая характеристика периода: KPI • топ-3 • проблемные зоны"
      right={
        <span className="dkrs-badge">
          <span className={`dkrs-dot ${loading ? "dkrs-dot-yellow" : "dkrs-dot-green"}`} />
          <span className="dkrs-mono">{month || ""}</span>
        </span>
      }
    >
      <div className="dkrs-card" style={{ marginBottom: 14 }}>
        <div className="dkrs-card-body">
          <div className="dkrs-controls" style={{ gridTemplateColumns: "240px 1fr auto" }}>
            <div>
              <div className="dkrs-field-label">Месяц</div>
              <select className="dkrs-select" value={month} onChange={(e) => setMonth(e.target.value)}>
                {months.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="dkrs-small" style={{ alignSelf: "center" }}>
              Этот экран — для руководителя: “что важного произошло и где риск”.
            </div>
            <div />
          </div>
        </div>
      </div>

      {/* KPI compact */}
      <div className="dkrs-grid dkrs-grid-2" style={{ marginBottom: 14 }}>
        <div className="dkrs-card">
          <div className="dkrs-card-header">
            <div className="dkrs-card-title">KPI</div>
            <span className="dkrs-badge"><span className="dkrs-dot dkrs-dot-green" /> Summary</span>
          </div>
          <div className="dkrs-card-body">
            <div className="dkrs-grid dkrs-grid-2">
              <div className="dkrs-stat">
                <div className="dkrs-stat-head"><div className="dkrs-stat-label">Выручка</div></div>
                <div className="dkrs-stat-kpi">{fmtMoney(totals.revenue)}</div>
                <div className="dkrs-stat-sub">без НДС</div>
              </div>
              <div className="dkrs-stat">
                <div className="dkrs-stat-head"><div className="dkrs-stat-label">Расходы</div></div>
                <div className="dkrs-stat-kpi">{fmtMoney(totals.costs)}</div>
                <div className="dkrs-stat-sub">все затраты</div>
              </div>
              <div className="dkrs-stat">
                <div className="dkrs-stat-head"><div className="dkrs-stat-label">Прибыль</div></div>
                <div className={`dkrs-stat-kpi ${totals.profit < 0 ? "dkrs-neg" : ""}`}>{fmtMoney(totals.profit)}</div>
                <div className="dkrs-stat-sub">выручка − расходы</div>
              </div>
              <div className="dkrs-stat">
                <div className="dkrs-stat-head"><div className="dkrs-stat-label">Маржа</div></div>
                <div className="dkrs-stat-kpi">{fmtPct(totals.margin)}</div>
                <div className="dkrs-stat-sub">прибыль / выручка</div>
              </div>
            </div>
          </div>
        </div>

        <div className="dkrs-card">
          <div className="dkrs-card-header">
            <div className="dkrs-card-title">Problems</div>
            <span className="dkrs-badge"><span className="dkrs-dot dkrs-dot-yellow" /> Signals</span>
          </div>
          <div className="dkrs-card-body">
            <AnomaliesCard projects={projects} month={month} />
          </div>
        </div>
      </div>

      {/* Top-3 */}
      <div className="dkrs-card">
        <div className="dkrs-card-header">
          <div className="dkrs-card-title">Top projects</div>
          <span className="dkrs-badge"><span className="dkrs-dot dkrs-dot-green" /> Updated</span>
        </div>
        <div className="dkrs-card-body">
          <TopProjectsCards projects={projects} month={month} />
        </div>
      </div>
    </DkrsAppShell>
  );
}
