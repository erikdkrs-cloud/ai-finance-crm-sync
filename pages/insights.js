// pages/insights.js
import React, { useEffect, useMemo, useState } from "react";
import DkrsAppShell from "../components/DkrsAppShell";
import TopProjectsCards from "../components/TopProjectsCards";
import AnomaliesCard from "../components/AnomaliesCard";

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

  const projectsRaw = Array.isArray(data?.projects) ? data.projects : Array.isArray(data?.items) ? data.items : [];

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
        transport: n(pick(p, ["transport"], 0)),
        salary_workers: n(pick(p, ["salary_workers", "salary", "fot_workers", "workers_salary", "labor"], 0)),
        team_payroll: n(pick(p, ["team_payroll"], 0)),
      };
    });
  }, [projectsRaw]);

  return (
    <DkrsAppShell
      title="Сводка"
      subtitle={`Краткая характеристика периода • ${month || ""}`}
      right={
        <div style={{ minWidth: 220 }}>
          <select className="dkrs-select" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Выбор месяца">
            {months.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      }
    >
      {loading ? (
        <div className="dkrs-card dkrs-card-glass">
          <div className="dkrs-card-body" style={{ color: "rgba(255,255,255,.7)" }}>
            Загружаем сводку…
          </div>
        </div>
      ) : (
        <div className="dkrs-grid dkrs-grid-2">
          <div className="dkrs-card dkrs-card-glass">
            <div className="dkrs-card-header">
              <div>
                <div className="dkrs-card-title">Топ проекты</div>
                <div className="dkrs-small">Прибыльные / убыточные</div>
              </div>
              <span className="dkrs-badge"><span className="dkrs-dot dkrs-dot-green" /> Updated</span>
            </div>
            <div className="dkrs-card-body">
              <TopProjectsCards projects={projects} month={month} />
            </div>
          </div>

          <div className="dkrs-card dkrs-card-glass">
            <div className="dkrs-card-header">
              <div>
                <div className="dkrs-card-title">Аномалии</div>
                <div className="dkrs-small">Сигналы и проблемные зоны</div>
              </div>
              <span className="dkrs-badge"><span className="dkrs-dot dkrs-dot-yellow" /> Signals</span>
            </div>
            <div className="dkrs-card-body">
              <AnomaliesCard projects={projects} month={month} />
            </div>
          </div>
        </div>
      )}
    </DkrsAppShell>
  );
}
