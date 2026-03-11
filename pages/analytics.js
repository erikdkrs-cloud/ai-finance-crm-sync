import React, { useState, useEffect, useRef } from "react";
import DkrsAppShell from "../components/DkrsAppShell";
import AiFloatingButton from "../components/AiFloatingButton";

export default function AnalyticsPage() {
  var _m = useState(false), mounted = _m[0], setMounted = _m[1];
  var _projects = useState([]), projects = _projects[0], setProjects = _projects[1];
  var _selProject = useState(""), selProject = _selProject[0], setSelProject = _selProject[1];
  var _data = useState(null), data = _data[0], setData = _data[1];
  var _loading = useState(false), loading = _loading[0], setLoading = _loading[1];
  var _error = useState(""), error = _error[0], setError = _error[1];
  var lineRef = useRef(null);
  var pieRef = useRef(null);
  var lineInst = useRef(null);
  var pieInst = useRef(null);

  useEffect(function () { setMounted(true); loadProjects(); }, []);

  useEffect(function () {
    if (selProject) loadDetail(selProject);
  }, [selProject]);

  useEffect(function () {
    if (data && data.monthly && data.monthly.length > 0) {
      drawLine();
      drawPie();
    }
  }, [data]);

  async function loadProjects() {
    try {
      var res = await fetch("/api/analytics?action=projects");
      var json = await res.json();
      if (json.ok && json.projects) {
        var withData = json.projects.filter(function (p) { return Number(p.row_count) > 0; });
        if (withData.length > 0) {
          setProjects(withData);
          setSelProject(withData[0].name);
        } else if (json.projects.length > 0) {
          setProjects(json.projects);
          setSelProject(json.projects[0].name);
        }
      }
    } catch (e) { console.error(e); }
  }

  async function loadDetail(name) {
    setLoading(true);
    setError("");
    setData(null);
    try {
      var res = await fetch("/api/analytics?action=detail&project=" + encodeURIComponent(name));
      var json = await res.json();
      if (json.ok && json.monthly && json.monthly.length > 0) {
        setData(json);
      } else {
        setError("Нет данных по этому проекту");
      }
    } catch (e) {
      setError("Ошибка загрузки");
    }
    setLoading(false);
  }

  async function drawLine() {
    if (!lineRef.current || !data || !data.monthly) return;
    try {
      var Chart = (await import("chart.js/auto")).default;
      if (lineInst.current) lineInst.current.destroy();
      lineInst.current = new Chart(lineRef.current, {
        type: "line",
        data: {
          labels: data.monthly.map(function (r) { return r.month; }),
          datasets: [
            { label: "Выручка", data: data.monthly.map(function (r) { return r.revenue; }), borderColor: "#00bfa6", backgroundColor: "rgba(0,191,166,0.1)", fill: true, tension: 0.4, borderWidth: 2, pointRadius: 4, pointBackgroundColor: "#00bfa6" },
            { label: "Расходы", data: data.monthly.map(function (r) { return r.costs; }), borderColor: "#f97316", backgroundColor: "rgba(249,115,22,0.1)", fill: true, tension: 0.4, borderWidth: 2, pointRadius: 4, pointBackgroundColor: "#f97316" },
            { label: "Прибыль", data: data.monthly.map(function (r) { return r.profit; }), borderColor: "#6366f1", backgroundColor: "rgba(99,102,241,0.1)", fill: true, tension: 0.4, borderWidth: 2, pointRadius: 4, pointBackgroundColor: "#6366f1" },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: "top", labels: { usePointStyle: true, padding: 16, font: { size: 12 } } }, tooltip: { callbacks: { label: function (c) { return c.dataset.label + ": " + Number(c.raw).toLocaleString("ru-RU") + " ₽"; } } } },
          scales: { y: { ticks: { callback: function (v) { if (v >= 1e6) return (v / 1e6).toFixed(1) + "M"; if (v >= 1e3) return (v / 1e3).toFixed(0) + "K"; return v; } }, grid: { color: "rgba(148,163,184,0.1)" } }, x: { grid: { display: false } } },
        },
      });
    } catch (e) { console.error(e); }
  }

  async function drawPie() {
    if (!pieRef.current || !data || !data.totals) return;
    try {
      var Chart = (await import("chart.js/auto")).default;
      if (pieInst.current) pieInst.current.destroy();
      var t = data.totals;
      var items = [
        { label: "ЗП Рабочие", value: t.salary_workers || 0, color: "#6366f1" },
        { label: "ЗП Менеджмент", value: t.salary_manager || 0, color: "#8b5cf6" },
        { label: "ЗП Руковод.", value: t.salary_head || 0, color: "#a78bfa" },
        { label: "Реклама", value: t.ads || 0, color: "#f97316" },
        { label: "Транспорт", value: t.transport || 0, color: "#0ea5e9" },
        { label: "Штрафы", value: t.penalties || 0, color: "#ef4444" },
        { label: "Налоги", value: t.tax || 0, color: "#64748b" },
      ].filter(function (i) { return i.value > 0; });
      if (items.length === 0) return;
      pieInst.current = new Chart(pieRef.current, {
        type: "doughnut",
        data: { labels: items.map(function (i) { return i.label; }), datasets: [{ data: items.map(function (i) { return i.value; }), backgroundColor: items.map(function (i) { return i.color; }), borderWidth: 2, borderColor: "#fff" }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "right", labels: { usePointStyle: true, padding: 12, font: { size: 12 } } }, tooltip: { callbacks: { label: function (c) { var tot = c.dataset.data.reduce(function (a, b) { return a + b; }, 0); return c.label + ": " + Number(c.raw).toLocaleString("ru-RU") + " ₽ (" + (tot > 0 ? ((c.raw / tot) * 100).toFixed(1) : 0) + "%)"; } } } } },
      });
    } catch (e) { console.error(e); }
  }

  function fmtNum(x) { return Number(x || 0).toLocaleString("ru-RU"); }
  function fmtPct(x) { return (Number(x || 0) * 100).toFixed(1) + "%"; }

  var trend = null;
  if (data && data.monthly && data.monthly.length >= 2) {
    var arr = data.monthly;
    var last = arr[arr.length - 1].profit;
    var prev = arr[arr.length - 2].profit;
    if (prev !== 0) { var ch = ((last - prev) / Math.abs(prev)) * 100; trend = { value: ch.toFixed(1), up: ch >= 0 }; }
  }

  var risk = "green";
  if (data && data.totals) { var m = data.totals.margin; if (m < 0.1) risk = "red"; else if (m < 0.2) risk = "yellow"; }
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
              {projects.map(function (p) { return <option key={p.name} value={p.name}>{p.name}</option>; })}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="dm-loading glass-card"><span className="loader-spinner" /> Загрузка аналитики...</div>
        ) : error ? (
          <div className="dm-empty glass-card"><div className="dm-empty-icon">📊</div><p>{error}</p></div>
        ) : !data ? (
          <div className="dm-empty glass-card"><div className="dm-empty-icon">📊</div><p>Выберите проект для анализа</p></div>
        ) : (
          <React.Fragment>

            <div className="an-kpi-grid">
              {[
                { icon: "💰", label: "Общая выручка", value: fmtNum(data.totals.revenue) + " ₽" },
                { icon: "📉", label: "Общие расходы", value: fmtNum(data.totals.costs) + " ₽" },
                { icon: data.totals.profit >= 0 ? "✅" : "❌", label: "Прибыль", value: fmtNum(data.totals.profit) + " ₽", cls: data.totals.profit >= 0 ? " positive" : " negative" },
                { icon: "📊", label: "Маржинальность", value: fmtPct(data.totals.margin) },
                { icon: riskIcons[risk], label: "Уровень риска", value: riskLabels[risk], cls: " risk-" + risk },
                { icon: trend ? (trend.up ? "📈" : "📉") : "➖", label: "Тренд прибыли", value: trend ? (trend.up ? "+" : "") + trend.value + "%" : "—", cls: trend ? (trend.up ? " positive" : " negative") : "" },
              ].map(function (kpi, i) {
                return (
                  <div key={i} className="an-kpi glass-card">
                    <div className="an-kpi-icon">{kpi.icon}</div>
                    <div className="an-kpi-content">
                      <div className="an-kpi-label">{kpi.label}</div>
                      <div className={"an-kpi-value" + (kpi.cls || "")}>{kpi.value}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="an-charts-grid">
              <div className="an-chart-card glass-card">
                <h3>📈 Динамика по месяцам</h3>
                <div className="an-chart-wrapper"><canvas ref={lineRef}></canvas></div>
              </div>
              <div className="an-chart-card glass-card">
                <h3>🏷️ Структура расходов</h3>
                <div className="an-chart-wrapper pie"><canvas ref={pieRef}></canvas></div>
              </div>
            </div>

            <div className="an-table-card glass-card">
              <h3>📋 Помесячные данные</h3>
              <div className="dm-table-wrapper" style={{ padding: 0 }}>
                <table className="dm-table">
                  <thead>
                    <tr>
                      <th>📅 Месяц</th><th>💰 Выручка</th><th>👷 ЗП Раб.</th><th>👔 ЗП Мен.</th>
                      <th>📢 Реклама</th><th>🚛 Транспорт</th><th>⚠️ Штрафы</th><th>🏛️ Налоги</th>
                      <th>📊 Прибыль</th><th>📈 Маржа</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.monthly.map(function (row) {
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
                          <td><span className={"dm-cell-profit" + (row.profit >= 0 ? " positive" : " negative")}>{fmtNum(row.profit)}</span></td>
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
