import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import DkrsAppShell from "../components/DkrsAppShell";
import RiskBadge from "../components/RiskBadge";
import AiFloatingButton from "../components/AiFloatingButton";
import { fmtMoney, fmtPct } from "../lib/format";

const DashboardCharts = dynamic(() => import("../components/DashboardCharts"), {
  ssr: false,
  loading: () => (
    <div className="charts-loading">
      <div className="loader-spinner" />
      <span>Загрузка графиков...</span>
    </div>
  ),
});

function riskLevel(margin) {
  const m = Number(margin);
  if (Number.isNaN(m)) return "green";
  const pct = m <= 1.5 ? m * 100 : m;
  if (pct < 10) return "red";
  if (pct < 20) return "yellow";
  return "green";
}

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function DashboardPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [months, setMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState(null);
  const [projects, setProjects] = useState([]);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [sortField, setSortField] = useState("profit");
  const [sortDir, setSortDir] = useState("desc");
  const [expandedProject, setExpandedProject] = useState(null);

  const debouncedSearch = useDebounce(search, 200);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/months");
        const d = await r.json();
        const list = d?.months || [];
        if (!alive) return;
        setMonths(list);
        if (list.length) setSelectedMonth(list[0]);
      } catch {}
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!selectedMonth) return;
    let alive = true;
    (async () => {
      setLoading(true); setErr("");
      try {
        const r = await fetch(`/api/dashboard?month=${encodeURIComponent(selectedMonth)}`);
        const d = await r.json();
        if (!alive) return;
        if (!d?.ok) throw new Error(d?.error || "Error");
        setTotals(d.totals || null);
        setProjects(d.projects || []);
      } catch (e) {
        if (alive) setErr(e?.message || "Ошибка загрузки");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [selectedMonth]);

  const toggleExpand = useCallback((name) => {
    setExpandedProject((prev) => (prev === name ? null : name));
  }, []);

  const filtered = useMemo(() => {
    let list = [...projects];
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter((p) => (p.project || "").toLowerCase().includes(q));
    }
    if (riskFilter !== "all") {
      list = list.filter((p) => riskLevel(p.margin) === riskFilter);
    }
    list.sort((a, b) => {
      const av = Number(a[sortField]) || 0;
      const bv = Number(b[sortField]) || 0;
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return list;
  }, [projects, debouncedSearch, riskFilter, sortField, sortDir]);

  const riskCounts = useMemo(() => {
    const counts = { all: projects.length, green: 0, yellow: 0, red: 0 };
    projects.forEach((p) => { counts[riskLevel(p.margin)]++; });
    return counts;
  }, [projects]);

  const totalsSafe = useMemo(() => {
    if (!totals) return { revenue: 0, profit: 0, margin: 0, count: 0 };
    return {
      revenue: Number(totals.revenue || 0),
      profit: Number(totals.profit || 0),
      margin: Number(totals.margin || 0),
      count: projects.length,
    };
  }, [totals, projects]);

  function handleSort(field) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
  }

  const sortIcon = (field) => {
    if (sortField !== field) return " ↕";
    return sortDir === "asc" ? " ↑" : " ↓";
  };

  function buildDetails(p) {
    const costs = Number(p.costs) || 1;
    const items = [
      { label: "ЗП рабочие", value: p.labor, icon: "👷" },
      { label: "ЗП менеджмент", value: p.team_payroll, icon: "👔" },
      { label: "Реклама", value: p.ads, icon: "📢" },
      { label: "Транспорт", value: p.transport, icon: "🚛" },
      { label: "Штрафы", value: p.penalties, icon: "⚠️" },
    ];
    return items.map((item) => {
      const v = Number(item.value) || 0;
      const pct = costs > 0 ? ((v / costs) * 100).toFixed(1) : "0.0";
      return { ...item, numValue: v, pct };
    });
  }

  return (
    <DkrsAppShell>
      <div className={`dashboard-page ${mounted ? "mounted" : ""}`}>
        {/* Period selector */}
        <div className="dashboard-period-bar">
          <span className="dashboard-period-label">📅 Период:</span>
          <select
            className="dkrs-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            {months.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {err && <div className="dashboard-error">{err}</div>}

        {/* KPI Cards */}
        <div className="kpi-grid">
          {[
            { label: "ВЫРУЧКА", value: fmtMoney(totalsSafe.revenue, 0) + " ₽", icon: "💰", gradient: "linear-gradient(135deg, #00bfa6, #00e5cc)" },
            { label: "ПРИБЫЛЬ", value: fmtMoney(totalsSafe.profit, 0) + " ₽", icon: "📈", gradient: "linear-gradient(135deg, #7c4dff, #a78bfa)" },
            { label: "МАРЖА", value: fmtPct(totalsSafe.margin), icon: "📊", gradient: "linear-gradient(135deg, #f59e0b, #fbbf24)" },
            { label: "ПРОЕКТОВ", value: String(totalsSafe.count), icon: "🏗️", gradient: "linear-gradient(135deg, #f472b6, #fb7185)" },
          ].map((card, i) => (
            <div key={i} className="kpi-card glass-card" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="kpi-icon" style={{ background: card.gradient }}>{card.icon}</div>
              <div className="kpi-info">
                <div className="kpi-label">{card.label}</div>
                <div className="kpi-value">{loading ? "..." : card.value}</div>
              </div>
              <div className="kpi-bar-bg">
                <div className="kpi-bar-fill" style={{ background: card.gradient, width: loading ? "0%" : "70%" }} />
              </div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <DashboardCharts months={months} currentMonth={selectedMonth} />

        {/* Projects Table */}
        <div className="dashboard-table-card glass-card">
          <div className="dashboard-table-header">
            <div>
              <h2 className="dashboard-table-title">Проекты</h2>
              <p className="dashboard-table-subtitle">Нажмите на строку для детального анализа расходов</p>
            </div>
            <div className="dashboard-table-totals-pills">
              <span className="totals-pill teal">● Выручка: {fmtMoney(totalsSafe.revenue)} ₽</span>
              <span className="totals-pill green">● Прибыль: {fmtMoney(totalsSafe.profit)} ₽</span>
              <span className="totals-pill amber">● Маржа: {fmtPct(totalsSafe.margin)}</span>
            </div>
          </div>

          {/* Filters */}
          <div className="dashboard-filters">
            <div className="dashboard-search">
              <span className="search-icon">🔍</span>
              <input
                className="dkrs-input"
                placeholder="Поиск проекта..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="dashboard-risk-filters">
              {[
                { key: "all", label: "Все" },
                { key: "green", label: "Низкий" },
                { key: "yellow", label: "Средний" },
                { key: "red", label: "Высокий" },
              ].map((f) => (
                <button
                  key={f.key}
                  className={`risk-filter-btn ${riskFilter === f.key ? "active" : ""} ${f.key}`}
                  onClick={() => setRiskFilter(f.key)}
                >
                  {f.label} <span className="risk-count">{riskCounts[f.key]}</span>
                </button>
              ))}
            </div>
            <select
              className="dkrs-select"
              value={`${sortField}-${sortDir}`}
              onChange={(e) => {
                const [f, d] = e.target.value.split("-");
                setSortField(f); setSortDir(d);
              }}
            >
              <option value="profit-desc">Прибыль ↓</option>
              <option value="profit-asc">Прибыль ↑</option>
              <option value="revenue-desc">Выручка ↓</option>
              <option value="revenue-asc">Выручка ↑</option>
              <option value="margin-desc">Маржа ↓</option>
              <option value="margin-asc">Маржа ↑</option>
            </select>
          </div>

          {/* Table */}
          <div className="dashboard-table-wrapper">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort("project")} className="sortable">ПРОЕКТ{sortIcon("project")}</th>
                  <th onClick={() => handleSort("revenue")} className="sortable num">ВЫРУЧКА{sortIcon("revenue")}</th>
                  <th onClick={() => handleSort("costs")} className="sortable num">РАСХОД{sortIcon("costs")}</th>
                  <th onClick={() => handleSort("profit")} className="sortable num">ПРИБЫЛЬ{sortIcon("profit")}</th>
                  <th onClick={() => handleSort("margin")} className="sortable num">МАРЖА{sortIcon("margin")}</th>
                  <th>РИСК</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="table-loading"><div className="loader-spinner" /> Загрузка...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="table-empty">Нет проектов</td></tr>
                ) : (
                  filtered.map((p, i) => {
                    const name = p.project || "—";
                    const risk = riskLevel(p.margin);
                    const isExpanded = expandedProject === name;
                    const details = buildDetails(p);

                    return (
                      <React.Fragment key={i}>
                        <tr
                          className={`project-row ${isExpanded ? "expanded" : ""}`}
                          onClick={() => toggleExpand(name)}
                          style={{ animationDelay: `${i * 30}ms` }}
                        >
                          <td>
                            <div className="project-name-cell">
                              <span className={`expand-arrow ${isExpanded ? "open" : ""}`}>▶</span>
                              {name}
                            </div>
                          </td>
                          <td className="num">
                            <span className="revenue-value">{fmtMoney(p.revenue, 0)} ₽</span>
                            <div className="mini-bar">
                              <div
                                className="mini-bar-fill teal"
                                style={{ width: `${Math.min(100, (Number(p.revenue) / (totalsSafe.revenue || 1)) * 100 * 3)}%` }}
                              />
                            </div>
                          </td>
                          <td className="num">{fmtMoney(p.costs, 0)} ₽</td>
                          <td className="num">{fmtMoney(p.profit, 0)} ₽</td>
                          <td className="num">{fmtPct(p.margin)}</td>
                          <td><RiskBadge riskLevel={risk} /></td>
                        </tr>
                        {isExpanded && (
                          <tr className="detail-row">
                            <td colSpan={6}>
                              <div className="detail-content">
                                <div className="detail-grid">
                                  {details.map((d, j) => (
                                    <div key={j} className="detail-item" style={{ animationDelay: `${j * 50}ms` }}>
                                      <span className="detail-item-icon">{d.icon}</span>
                                      <div className="detail-item-body">
                                        <span className="detail-item-label">{d.label}</span>
                                        <div className="detail-item-bar-track">
                                          <div
                                            className="detail-item-bar-fill"
                                            style={{ width: `${Math.min(100, Number(d.pct))}%` }}
                                          />
                                        </div>
                                      </div>
                                      <div className="detail-item-right">
                                        <span className="detail-item-value">{fmtMoney(d.numValue, 0)} ₽</span>
                                        <span className="detail-item-pct">{d.pct}%</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <div className="detail-summary">
                                  <div className="detail-summary-item">
                                    <span>Итого расходы</span>
                                    <strong>{fmtMoney(p.costs, 0)} ₽</strong>
                                  </div>
                                  <div className="detail-summary-item">
                                    <span>Прибыль</span>
                                    <strong style={{ color: Number(p.profit) >= 0 ? "var(--risk-low-color)" : "var(--risk-high-color)" }}>
                                      {fmtMoney(p.profit, 0)} ₽
                                    </strong>
                                  </div>
                                  <div className="detail-summary-item">
                                    <span>Маржа</span>
                                    <strong>{fmtPct(p.margin)}</strong>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AiFloatingButton />
    </DkrsAppShell>
  );
}
