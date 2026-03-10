import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import DkrsAppShell from "../components/DkrsAppShell";
import RiskBadge from "../components/RiskBadge";
import AiFloatingButton from "../components/AiFloatingButton";
import { useAuth } from "../components/AuthProvider";
import { fmtMoney, fmtPct } from "../lib/format";

var DashboardCharts = dynamic(
  function () { return import("../components/DashboardCharts"); },
  { ssr: false, loading: function () { return <div className="charts-loading"><div className="loader-spinner" /><span>Загрузка графиков...</span></div>; } }
);

function riskLevel(margin) {
  var m = Number(margin);
  if (Number.isNaN(m)) return "green";
  var pct = m <= 1.5 ? m * 100 : m;
  if (pct < 10) return "red";
  if (pct < 20) return "yellow";
  return "green";
}

function useDebounce(value, delay) {
  var _d = useState(value), debounced = _d[0], setDebounced = _d[1];
  useEffect(function () {
    var t = setTimeout(function () { setDebounced(value); }, delay);
    return function () { clearTimeout(t); };
  }, [value, delay]);
  return debounced;
}

export default function DashboardPage() {
  var router = useRouter();
  var auth = useAuth();
  var months = auth.months || [];
  var selectedMonth = auth.selectedMonth || "";
  var setSelectedMonth = auth.setSelectedMonth;

  var _mounted = useState(false), mounted = _mounted[0], setMounted = _mounted[1];
  var _loading = useState(true), loading = _loading[0], setLoading = _loading[1];
  var _totals = useState(null), totals = _totals[0], setTotals = _totals[1];
  var _projects = useState([]), projects = _projects[0], setProjects = _projects[1];
  var _err = useState(""), err = _err[0], setErr = _err[1];
  var _search = useState(""), search = _search[0], setSearch = _search[1];
  var _riskFilter = useState("all"), riskFilter = _riskFilter[0], setRiskFilter = _riskFilter[1];
  var _sortField = useState("profit"), sortField = _sortField[0], setSortField = _sortField[1];
  var _sortDir = useState("desc"), sortDir = _sortDir[0], setSortDir = _sortDir[1];
  var _expandedProject = useState(null), expandedProject = _expandedProject[0], setExpandedProject = _expandedProject[1];

  var debouncedSearch = useDebounce(search, 200);

  useEffect(function () { setMounted(true); }, []);

  useEffect(function () {
    if (!selectedMonth) { setLoading(false); return; }
    var alive = true;
    setLoading(true);
    setErr("");
    fetch("/api/dashboard?month=" + encodeURIComponent(selectedMonth))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!alive) return;
        if (!d.ok) throw new Error(d.error || "Error");
        setTotals(d.totals || null);
        setProjects(d.projects || []);
      })
      .catch(function (e) { if (alive) setErr(e.message || "Ошибка"); })
      .finally(function () { if (alive) setLoading(false); });
    return function () { alive = false; };
  }, [selectedMonth]);

  var toggleExpand = useCallback(function (name) {
    setExpandedProject(function (prev) { return prev === name ? null : name; });
  }, []);

  var filtered = useMemo(function () {
    var list = projects.slice();
    if (debouncedSearch) {
      var q = debouncedSearch.toLowerCase();
      list = list.filter(function (p) { return (p.project || "").toLowerCase().indexOf(q) !== -1; });
    }
    if (riskFilter !== "all") {
      list = list.filter(function (p) { return riskLevel(p.margin) === riskFilter; });
    }
    list.sort(function (a, b) {
      var av = Number(a[sortField]) || 0;
      var bv = Number(b[sortField]) || 0;
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return list;
  }, [projects, debouncedSearch, riskFilter, sortField, sortDir]);

  var riskCounts = useMemo(function () {
    var counts = { all: projects.length, green: 0, yellow: 0, red: 0 };
    projects.forEach(function (p) { counts[riskLevel(p.margin)]++; });
    return counts;
  }, [projects]);

  var totalsSafe = useMemo(function () {
    if (!totals) return { revenue: 0, profit: 0, margin: 0, count: 0 };
    return { revenue: Number(totals.revenue || 0), profit: Number(totals.profit || 0), margin: Number(totals.margin || 0), count: projects.length };
  }, [totals, projects]);

  function handleSort(field) {
    if (sortField === field) setSortDir(function (d) { return d === "asc" ? "desc" : "asc"; });
    else { setSortField(field); setSortDir("desc"); }
  }

  function sortIcon(field) {
    if (sortField !== field) return " ↕";
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  function buildDetails(p) {
    var costs = Number(p.costs) || 1;
    var items = [
      { label: "ЗП рабочие", value: p.labor, icon: "👷" },
      { label: "ЗП менеджмент", value: p.team_payroll, icon: "👔" },
      { label: "Реклама", value: p.ads, icon: "📢" },
      { label: "Транспорт", value: p.transport, icon: "🚛" },
      { label: "Штрафы", value: p.penalties, icon: "⚠️" },
    ];
    return items.map(function (item) {
      var v = Number(item.value) || 0;
      var pct = costs > 0 ? ((v / costs) * 100).toFixed(1) : "0.0";
      return { label: item.label, value: item.value, icon: item.icon, numValue: v, pct: pct };
    });
  }

  return (
    <DkrsAppShell>
      <div className={"dashboard-page " + (mounted ? "mounted" : "")}>

        <div className="dashboard-period-bar">
          <span className="dashboard-period-label">📅 Период:</span>
          <select className="dkrs-select" value={selectedMonth} onChange={function (e) { setSelectedMonth(e.target.value); }}>
            {months.map(function (m) { return <option key={m} value={m}>{m}</option>; })}
          </select>
        </div>

        {err && <div className="dashboard-error">{err}</div>}

        <div className="kpi-grid">
          {[
            { label: "ВЫРУЧКА", value: fmtMoney(totalsSafe.revenue, 0) + " ₽", icon: "💰", gradient: "linear-gradient(135deg, #00bfa6, #00e5cc)" },
            { label: "ПРИБЫЛЬ", value: fmtMoney(totalsSafe.profit, 0) + " ₽", icon: "📈", gradient: "linear-gradient(135deg, #7c4dff, #a78bfa)" },
            { label: "МАРЖА", value: fmtPct(totalsSafe.margin), icon: "📊", gradient: "linear-gradient(135deg, #f59e0b, #fbbf24)" },
            { label: "ПРОЕКТОВ", value: String(totalsSafe.count), icon: "🏗️", gradient: "linear-gradient(135deg, #f472b6, #fb7185)" },
          ].map(function (card, i) {
            return (
              <div key={i} className="kpi-card glass-card" style={{ animationDelay: i * 100 + "ms" }}>
                <div className="kpi-icon" style={{ background: card.gradient }}>{card.icon}</div>
                <div className="kpi-info">
                  <div className="kpi-label">{card.label}</div>
                  <div className="kpi-value">{loading ? "..." : card.value}</div>
                </div>
                <div className="kpi-bar-bg">
                  <div className="kpi-bar-fill" style={{ background: card.gradient, width: loading ? "0%" : "70%" }} />
                </div>
              </div>
            );
          })}
        </div>

        <DashboardCharts months={months} currentMonth={selectedMonth} />

        <div className="dashboard-table-card glass-card">
          <div className="dashboard-table-header">
            <div>
              <h2 className="dashboard-table-title">Проекты</h2>
              <p className="dashboard-table-subtitle">Нажмите на строку для детального анализа</p>
            </div>
            <div className="dashboard-table-totals-pills">
              <span className="totals-pill teal">● Выручка: {fmtMoney(totalsSafe.revenue)} ₽</span>
              <span className="totals-pill green">● Прибыль: {fmtMoney(totalsSafe.profit)} ₽</span>
              <span className="totals-pill amber">● Маржа: {fmtPct(totalsSafe.margin)}</span>
            </div>
          </div>

          <div className="dashboard-filters">
            <div className="dashboard-search">
              <span className="search-icon">🔍</span>
              <input className="dkrs-input" placeholder="Поиск проекта..." value={search} onChange={function (e) { setSearch(e.target.value); }} />
            </div>
            <div className="dashboard-risk-filters">
              {[
                { key: "all", label: "Все" },
                { key: "green", label: "Низкий" },
                { key: "yellow", label: "Средний" },
                { key: "red", label: "Высокий" },
              ].map(function (f) {
                return (
                  <button key={f.key} className={"risk-filter-btn " + (riskFilter === f.key ? "active " : "") + f.key}
                    onClick={function () { setRiskFilter(f.key); }}>
                    {f.label} <span className="risk-count">{riskCounts[f.key]}</span>
                  </button>
                );
              })}
            </div>
            <select className="dkrs-select" value={sortField + "-" + sortDir}
              onChange={function (e) { var p = e.target.value.split("-"); setSortField(p[0]); setSortDir(p[1]); }}>
              <option value="profit-desc">Прибыль ↓</option>
              <option value="profit-asc">Прибыль ↑</option>
              <option value="revenue-desc">Выручка ↓</option>
              <option value="revenue-asc">Выручка ↑</option>
              <option value="margin-desc">Маржа ↓</option>
              <option value="margin-asc">Маржа ↑</option>
            </select>
          </div>

          <div className="dashboard-table-wrapper">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th onClick={function () { handleSort("project"); }} className="sortable">ПРОЕКТ{sortIcon("project")}</th>
                  <th onClick={function () { handleSort("revenue"); }} className="sortable num">ВЫРУЧКА{sortIcon("revenue")}</th>
                  <th onClick={function () { handleSort("costs"); }} className="sortable num">РАСХОД{sortIcon("costs")}</th>
                  <th onClick={function () { handleSort("profit"); }} className="sortable num">ПРИБЫЛЬ{sortIcon("profit")}</th>
                  <th onClick={function () { handleSort("margin"); }} className="sortable num">МАРЖА{sortIcon("margin")}</th>
                  <th>РИСК</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="table-loading"><div className="loader-spinner" /> Загрузка...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="table-empty">Нет проектов</td></tr>
                ) : filtered.map(function (p, i) {
                  var name = p.project || "—";
                  var risk = riskLevel(p.margin);
                  var isExpanded = expandedProject === name;
                  var details = buildDetails(p);
                  return (
                    <React.Fragment key={i}>
                      <tr className={"project-row " + (isExpanded ? "expanded" : "")}
                        onClick={function () { toggleExpand(name); }}
                        style={{ animationDelay: i * 30 + "ms" }}>
                        <td><div className="project-name-cell"><span className={"expand-arrow " + (isExpanded ? "open" : "")}>▶</span>{name}</div></td>
                        <td className="num">
                          <span className="revenue-value">{fmtMoney(p.revenue, 0)} ₽</span>
                          <div className="mini-bar"><div className="mini-bar-fill teal" style={{ width: Math.min(100, (Number(p.revenue) / (totalsSafe.revenue || 1)) * 100 * 3) + "%" }} /></div>
                        </td>
                        <td className="num">{fmtMoney(p.costs, 0)} ₽</td>
                        <td className="num">{fmtMoney(p.profit, 0)} ₽</td>
                        <td className="num">{fmtPct(p.margin)}</td>
                        <td><RiskBadge riskLevel={risk} /></td>
                      </tr>
                      {isExpanded && (
                        <tr className="detail-row"><td colSpan={6}>
                          <div className="detail-content">
                            <div className="detail-grid">
                              {details.map(function (d, j) {
                                return (
                                  <div key={j} className="detail-item" style={{ animationDelay: j * 50 + "ms" }}>
                                    <span className="detail-item-icon">{d.icon}</span>
                                    <div className="detail-item-body">
                                      <span className="detail-item-label">{d.label}</span>
                                      <div className="detail-item-bar-track"><div className="detail-item-bar-fill" style={{ width: Math.min(100, Number(d.pct)) + "%" }} /></div>
                                    </div>
                                    <div className="detail-item-right">
                                      <span className="detail-item-value">{fmtMoney(d.numValue, 0)} ₽</span>
                                      <span className="detail-item-pct">{d.pct}%</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="detail-summary">
                              <div className="detail-summary-item"><span>Итого расходы</span><strong>{fmtMoney(p.costs, 0)} ₽</strong></div>
                              <div className="detail-summary-item"><span>Прибыль</span><strong style={{ color: Number(p.profit) >= 0 ? "var(--risk-low-color)" : "var(--risk-high-color)" }}>{fmtMoney(p.profit, 0)} ₽</strong></div>
                              <div className="detail-summary-item"><span>Маржа</span><strong>{fmtPct(p.margin)}</strong></div>
                            </div>
                          </div>
                        </td></tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <AiFloatingButton />
    </DkrsAppShell>
  );
}
