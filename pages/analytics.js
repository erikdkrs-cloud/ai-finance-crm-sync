import React, { useState, useEffect, useRef } from "react";
import DkrsAppShell from "../components/DkrsAppShell";
import AiFloatingButton from "../components/AiFloatingButton";

export default function AnalyticsPage() {
  var _m = useState(false), mounted = _m[0], setMounted = _m[1];
  var _projects = useState([]), projects = _projects[0], setProjects = _projects[1];
  var _selProject = useState(""), selProject = _selProject[0], setSelProject = _selProject[1];
  var _data = useState(null), data = _data[0], setData = _data[1];
  var _loading = useState(false), loading = _loading[0], setLoading = _loading[1];
  var lineChartRef = useRef(null);
  var pieChartRef = useRef(null);
  var lineChartInstance = useRef(null);
  var pieChartInstance = useRef(null);

  useEffect(function () { setMounted(true); loadProjects(); }, []);
  useEffect(function () { if (selProject) loadProjectData(selProject); }, [selProject]);
  useEffect(function () { if (data) { renderLineChart(); renderPieChart(); } }, [data]);

  async function loadProjects() {
    try {
      var res = await fetch("/api/analytics?action=projects");
      var json = await res.json();
      if (json.ok) {
        setProjects(json.projects || []);
        if (json.projects && json.projects.length > 0) {
          setSelProject(json.projects[0].name);
        }
      }
    } catch (e) { console.error(e); }
  }

  async function loadProjectData(projectName) {
    setLoading(true);
    try {
      var res = await fetch("/api/analytics?action=detail&project=" + encodeURIComponent(projectName));
      var json = await res.json();
      if (json.ok) setData(json);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function renderLineChart() {
    if (!lineChartRef.current || !data || !data.monthly || data.monthly.length === 0) return;
    var Chart = (await import("chart.js/auto")).default;
    if (lineChartInstance.current) lineChartInstance.current.destroy();

    var labels = data.monthly.map(function (r) { return r.month; });
    var revenues = data.monthly.map(function (r) { return r.revenue; });
    var costs = data.monthly.map(function (r) { return r.costs; });
    var profits = data.monthly.map(function (r) { return r.profit; });

    lineChartInstance.current = new Chart(lineChartRef.current, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Выручка",
            data: revenues,
            borderColor: "#00bfa6",
            backgroundColor: "rgba(0,191,166,0.1)",
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: "#00bfa6",
          },
          {
            label: "Расходы",
            data: costs,
            borderColor: "#f97316",
            backgroundColor: "rgba(249,115,22,0.1)",
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: "#f97316",
          },
          {
            label: "Прибыль",
            data: profits,
            borderColor: "#6366f1",
            backgroundColor: "rgba(99,102,241,0.1)",
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: "#6366f1",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "top", labels: { usePointStyle: true, padding: 16, font: { size: 12 } } },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                return ctx.dataset.label + ": " + Number(ctx.raw).toLocaleString("ru-RU") + " ₽";
              },
            },
          },
        },
        scales: {
          y: {
            ticks: {
              callback: function (v) {
                if (v >= 1000000) return (v / 1000000).toFixed(1) + "M";
                if (v >= 1000) return (v / 1000).toFixed(0) + "K";
                return v;
              },
            },
            grid: { color: "rgba(148,163,184,0.1)" },
          },
          x: { grid: { display: false } },
        },
      },
    });
  }

  async function renderPieChart() {
    if (!pieChartRef.current || !data || !data.totals) return;
    var Chart = (await import("chart.js/auto")).default;
    if (pieChartInstance.current) pieChartInstance.current.destroy();

    var t = data.totals;
    var items = [
      { label: "ЗП Рабочие", value: t.salary_workers, color: "#6366f1" },
      { label: "ЗП Менеджмент", value: t.salary_manager, color: "#8b5cf6" },
      { label: "ЗП Руковод.", value: t.salary_head, color: "#a78bfa" },
      { label: "Реклама", value: t.ads, color: "#f97316" },
      { label: "Транспорт", value: t.transport, color: "#0ea5e9" },
      { label: "Штрафы", value: t.penalties, color: "#ef4444" },
      { label: "Налоги", value: t.tax, color: "#64748b" },
    ].filter(function (i) { return i.value > 0; });

    pieChartInstance.current = new Chart(pieChartRef.current, {
      type: "doughnut",
      data: {
        labels: items.map(function (i) { return i.label; }),
        datasets: [{
          data: items.map(function (i) { return i.value; }),
          backgroundColor: items.map(function (i) { return i.color; }),
          borderWidth: 2,
          borderColor: "#fff",
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "right", labels: { usePointStyle: true, padding: 12, font: { size: 12 } } },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                var total = ctx.dataset.data.reduce(function (a, b) { return a + b; }, 0);
                var pct = total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : 0;
                return ctx.label + ": " + Number(ctx.raw).toLocaleString("ru-RU") + " ₽ (" + pct + "%)";
              },
            },
          },
        },
      },
    });
  }

  function fmtNum(x) { return Number(x || 0).toLocaleString("ru-RU"); }
  function fmtPct(x) { return (Number(x || 0) * 100).toFixed(1) + "%"; }

  function getTrend() {
    if (!data || !data.monthly || data.monthly.length < 2) return null;
    var arr = data.monthly;
    var last = arr[arr.length - 1].profit;
    var prev = arr[arr.length - 2].profit;
    if (prev === 0) return null;
    var change = ((last - prev) / Math.abs(prev)) * 100;
    return { value: change.toFixed(1), up: change >= 0 };
  }

  function getRisk() {
    if (!data || !data.totals) return "green";
    var m = data.totals.margin;
    if (m < 0.1) return "red";
    if (m < 0.2) return "yellow";
    return "green";
  }

  var trend = data ? getTrend() : null;
  var risk = data ? getRisk() : "green";
  var riskLabels = { green: "Низкий", yellow: "Средний", red: "Высокий" };
  var riskIcons = { green: "🟢", yellow: "🟡", red: "🔴" };

  return (
    <DkrsAppShell>
      <div className={"an-page" + (mounted ? " mounted" : "")}>

        <div className="an-header">
          <div>
            <h1 className="an-title">📊 Аналитика по проектам</h1>
            <p className="an-subtitle">Детальный анализ финансовых показателей</p>
          </div>
          <div className="an-project-select">
            <select value={selProject} onChange={function (e) { setSelProject(e.target.value); }}>
              {projects.map(function (p) {
                return <option key={p.name} value={p.name}>{p.name}</option>;
              })}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="dm-loading glass-card"><span className="loader-spinner" /> Загрузка аналитики...</div>
        ) : !data ? (
          <div className="dm-empty glass-card"><div className="dm-empty-icon">📊</div><p>Выберите проект для анализа</p></div>
        ) : (
          <React.Fragment>

            {/* KPI Cards */}
            <div className="an-kpi-grid">
              <div className="an-kpi glass-card">
                <div className="an-kpi-icon">💰</div>
                <div className="an-kpi-content">
                  <div className="an-kpi-label">Общая выручка</div>
                  <div className="an-kpi-value">{fmtNum(data.totals.revenue)} ₽</div>
                </div>
              </div>
              <div className="an-kpi glass-card">
                <div className="an-kpi-icon">📉</div>
                <div className="an-kpi-content">
                  <div className="an-kpi-label">Общие расходы</div>
                  <div className="an-kpi-value">{fmtNum(data.totals.costs)} ₽</div>
                </div>
              </div>
              <div className="an-kpi glass-card">
                <div className="an-kpi-icon">{data.totals.profit >= 0 ? "✅" : "❌"}</div>
                <div className="an-kpi-content">
                  <div className="an-kpi-label">Прибыль</div>
                  <div className={"an-kpi-value" + (data.totals.profit >= 0 ? " positive" : " negative")}>
                    {fmtNum(data.totals.profit)} ₽
                  </div>
                </div>
              </div>
              <div className="an-kpi glass-card">
                <div className="an-kpi-icon">📊</div>
                <div className="an-kpi-content">
                  <div className="an-kpi-label">Маржинальность</div>
                  <div className="an-kpi-value">{fmtPct(data.totals.margin)}</div>
                </div>
              </div>
              <div className="an-kpi glass-card">
                <div className="an-kpi-icon">{riskIcons[risk]}</div>
                <div className="an-kpi-content">
                  <div className="an-kpi-label">Уровень риска</div>
                  <div className={"an-kpi-value risk-" + risk}>{riskLabels[risk]}</div>
                </div>
              </div>
              <div className="an-kpi glass-card">
                <div className="an-kpi-icon">{trend ? (trend.up ? "📈" : "📉") : "➖"}</div>
                <div className="an-kpi-content">
                  <div className="an-kpi-label">Тренд прибыли</div>
                  <div className={"an-kpi-value" + (trend ? (trend.up ? " positive" : " negative") : "")}>
                    {trend ? (trend.up ? "+" : "") + trend.value + "%" : "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="an-charts-grid">
              <div className="an-chart-card glass-card">
                <h3>📈 Динамика по месяцам</h3>
                <div className="an-chart-wrapper">
                  <canvas ref={lineChartRef}></canvas>
                </div>
              </div>
              <div className="an-chart-card glass-card">
                <h3>🏷️ Структура расходов</h3>
                <div className="an-chart-wrapper pie">
                  <canvas ref={pieChartRef}></canvas>
                </div>
              </div>
            </div>

            {/* Monthly table */}
            <div className="an-table-card glass-card">
              <h3>📋 Помесячные данные</h3>
              <div className="dm-table-wrapper" style={{ padding: 0 }}>
                <table className="dm-table">
                  <thead>
                    <tr>
                      <th>📅 Месяц</th>
                      <th>💰 Выручка</th>
                      <th>👷 ЗП Раб.</th>
                      <th>👔 ЗП Мен.</th>
                      <th>📢 Реклама</th>
                      <th>🚛 Транспорт</th>
                      <th>⚠️ Штрафы</th>
                      <th>🏛️ Налоги</th>
                      <th>📊 Прибыль</th>
                      <th>📈 Маржа</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.monthly || []).map(function (row) {
                      return (
                        <tr key={row.month}>
                          <td className="dm-cell-month">{row.month}</td>
                          <td>{fmtNum(row.revenue)}</td>
                          <td>{fmtNum(row.salary_workers)}</td>
                          <td>{fmtNum(row.salary_manager)}</td>
                          <td>{fmtNum(row.ads)}</td>
                          <td>{fmtNum(row.transport)}</td>
                          <td>{fmtNum(row.penalties)}</td>
                          <td>{fmtNum(row.tax)}</td>
                          <td>
                            <span className={"dm-cell-profit" + (row.profit >= 0 ? " positive" : " negative")}>
                              {fmtNum(row.profit)}
                            </span>
                          </td>
                          <td>{fmtPct(row.margin)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </React.Fragment>
        )}
      </div>
      <AiFloatingButton />
    </DkrsAppShell>
  );
}
