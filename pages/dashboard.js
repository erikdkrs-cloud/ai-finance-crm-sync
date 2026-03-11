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

var ALL_EXPENSE_ITEMS = [
  { key: "salary_workers", label: "ЗП Рабочие", icon: "👷" },
  { key: "salary_manager", label: "ЗП Менеджмент", icon: "👔" },
  { key: "salary_head", label: "Прочее", icon: "📦" },
  { key: "ads", label: "Реклама", icon: "📢" },
  { key: "transport", label: "Транспорт", icon: "🚛" },
  { key: "penalties", label: "Штрафы", icon: "⚠️" },
  { key: "tax", label: "Налоги", icon: "🏛️" },
];

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
  var user = auth.user;
  var canEdit = user && (user.role === "admin" || user.role === "manager");

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
  var _editingProject = useState(null), editingProject = _editingProject[0], setEditingProject = _editingProject[1];
  var _editValues = useState({}), editValues = _editValues[0], setEditValues = _editValues[1];
  var _saving = useState(false), saving = _saving[0], setSaving = _saving[1];
  var _saveMsg = useState(""), saveMsg = _saveMsg[0], setSaveMsg = _saveMsg[1];

  var debouncedSearch = useDebounce(search, 200);

  useEffect(function () { setMounted(true); }, []);

  var loadData = useCallback(function () {
    if (!selectedMonth) { setLoading(false); return; }
    setLoading(true);
    setErr("");
    fetch("/api/dashboard?month=" + encodeURIComponent(selectedMonth))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d.ok) throw new Error(d.error || "Error");
        setTotals(d.totals || null);
        setProjects(d.projects || []);
      })
      .catch(function (e) { setErr(e.message || "Ошибка"); })
      .finally(function () { setLoading(false); });
  }, [selectedMonth]);

  useEffect(function () { loadData(); }, [loadData]);

  var toggleExpand = useCallback(function (name) {
    setExpandedProject(function (prev) { return prev === name ? null : name; });
    setEditingProject(null);
    setSaveMsg("");
  }, []);

  function startEdit(p) {
    setEditingProject(p.project);
    setEditValues({
      revenue: p.revenue,
      salary_workers: p.salary_workers,
      salary_manager: p.salary_manager,
      salary_head: p.salary_head,
      ads: p.ads,
      transport: p.transport,
      penalties: p.penalties,
      tax: p.tax,
    });
    setSaveMsg("");
  }

  function cancelEdit() {
    setEditingProject(null);
    setEditValues({});
    setSaveMsg("");
  }

  function updateEditValue(key, val) {
    setEditValues(function (prev) {
      var next = Object.assign({}, prev);
      next[key] = val;
      return next;
    });
  }

  async function saveEdit(projectName) {
    setSaving(true);
    setSaveMsg("");
    try {
      var payload = Object.assign({}, editValues, {
        project: projectName,
        month: selectedMonth,
      });
      var res = await fetch("/api/update-row", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      var data = await res.json();
      if (!data.ok) throw new Error(data.error || "Ошибка сохранения");
      setSaveMsg("✅ Сохранено!");
      setEditingProject(null);
      loadData();
    } catch (e) {
      setSaveMsg("❌ " + e.message);
    }
    setSaving(false);
  }

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

  var activeExpenseItems = useMemo(function () {
    return ALL_EXPENSE_ITEMS.filter(function (item) {
      return projects.some(function (p) { return Number(p[item.key] || 0) > 0; });
    });
  }, [projects]);

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
    return activeExpenseItems.map(function (item) {
      var v = Number(p[item.key] || 0);
      var pct = costs > 0 ? ((v / costs) * 100).toFixed(1) : "0.0";
      return { key: item.key, label: item.label, icon: item.icon, numValue: v, pct: pct };
    }).filter(function (d) { return d.numValue > 0; });
  }

  var allEditableFields = [{ key: "revenue", label: "💰 Выручка" }].concat(
    ALL_EXPENSE_ITEMS.map(function (item) { return { key: item.key, label: item.icon + " " + item.label }; })
  );

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
              <p className="dashboard-table-subtitle">Нажмите на строку для детального анализа{canEdit ? " • ✏️ для редактирования" : ""}</p>
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

          {saveMsg && <div style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, color: saveMsg.startsWith("✅") ? "#10b981" : "#ef4444" }}>{saveMsg}</div>}

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
                  {canEdit && <th style={{ width: 40 }}></th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={canEdit ? 7 : 6} className="table-loading"><div className="loader-spinner" /> Загрузка...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={canEdit ? 7 : 6} className="table-empty">Нет проектов</td></tr>
                ) : filtered.map(function (p, i) {
                  var name = p.project || "—";
                  var risk = riskLevel(p.margin);
                  var isExpanded = expandedProject === name;
                  var isEditing = editingProject === name;
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
                        {canEdit && (
                          <td>
                            <button
                              className="edit-row-btn"
                              title="Редактировать"
                              onClick={function (e) {
                                e.stopPropagation();
                                if (!isExpanded) setExpandedProject(name);
                                if (isEditing) cancelEdit(); else startEdit(p);
                              }}
                              style={{
                                background: isEditing ? "rgba(239,68,68,0.1)" : "rgba(99,102,241,0.1)",
                                color: isEditing ? "#ef4444" : "#6366f1",
                                border: "none", borderRadius: 8, width: 32, height: 32,
                                cursor: "pointer", fontSize: 14, display: "flex",
                                alignItems: "center", justifyContent: "center", transition: "all 0.2s",
                              }}>
                              {isEditing ? "✕" : "✏️"}
                            </button>
                          </td>
                        )}
                      </tr>
                      {isExpanded && (
                        <tr className="detail-row"><td colSpan={canEdit ? 7 : 6}>
                          <div className="detail-content">
                            {isEditing ? (
                              <div style={{ padding: "8px 0" }}>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
                                  {allEditableFields.map(function (field) {
                                    return (
                                      <div key={field.key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                        <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>{field.label}</label>
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={editValues[field.key] !== undefined ? editValues[field.key] : ""}
                                          onChange={function (e) { updateEditValue(field.key, e.target.value); }}
                                          style={{
                                            padding: "8px 12px", borderRadius: 8, fontSize: 14, fontWeight: 600,
                                            border: "2px solid rgba(99,102,241,0.2)", outline: "none",
                                            background: "rgba(99,102,241,0.03)", transition: "border 0.2s",
                                          }}
                                          onFocus={function (e) { e.target.style.borderColor = "#6366f1"; }}
                                          onBlur={function (e) { e.target.style.borderColor = "rgba(99,102,241,0.2)"; }}
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                                <div style={{ display: "flex", gap: 10, marginTop: 16, alignItems: "center" }}>
                                  <button
                                    onClick={function () { saveEdit(name); }}
                                    disabled={saving}
                                    style={{
                                      padding: "10px 24px", borderRadius: 10, border: "none", cursor: "pointer",
                                      background: "linear-gradient(135deg, #00bfa6, #00e5cc)", color: "#fff",
                                      fontWeight: 700, fontSize: 14, transition: "all 0.2s",
                                      opacity: saving ? 0.6 : 1,
                                    }}>
                                    {saving ? "⏳ Сохраняем..." : "💾 Сохранить"}
                                  </button>
                                  <button
                                    onClick={cancelEdit}
                                    style={{
                                      padding: "10px 24px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.1)",
                                      cursor: "pointer", background: "#f8fafc", fontWeight: 600, fontSize: 14,
                                    }}>
                                    Отмена
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <React.Fragment>
                                <div className="detail-grid">
                                  {details.length === 0 ? (
                                    <div style={{ padding: 16, color: "#94a3b8", fontSize: 13 }}>Нет расходов по этому проекту</div>
                                  ) : details.map(function (d, j) {
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
                              </React.Fragment>
                            )}
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
