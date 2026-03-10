import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import DkrsAppShell from "../components/DkrsAppShell";
import AiFloatingButton from "../components/AiFloatingButton";
import { useAuth } from "../components/AuthProvider";
import { fmtMoney, fmtPct } from "../lib/format";

var MEDALS = ["🥇", "🥈", "🥉"];

function TopCard(props) {
  var project = props.project, index = props.index, variant = props.variant;
  var isProfit = variant === "profit";
  var profit = Number(project.profit) || 0;
  var margin = Number(project.margin) || 0;
  var gradients = isProfit
    ? ["linear-gradient(135deg, #00b09b, #96c93d)", "linear-gradient(135deg, #11998e, #38ef7d)", "linear-gradient(135deg, #56ab2f, #a8e063)"]
    : ["linear-gradient(135deg, #eb3349, #f45c43)", "linear-gradient(135deg, #e44d26, #f16529)", "linear-gradient(135deg, #c0392b, #e74c3c)"];
  return (
    <div className={"top-card " + variant} style={{ animationDelay: index * 120 + "ms" }}>
      <div className="top-card-medal" style={{ background: gradients[index] || gradients[0] }}><span>{MEDALS[index] || (index + 1)}</span></div>
      <div className="top-card-info">
        <div className="top-card-name">{project.project}</div>
        <div className="top-card-meta"><span>Выручка: {fmtMoney(project.revenue, 0)} ₽</span><span>Маржа: {fmtPct(margin)}</span></div>
      </div>
      <div className={"top-card-value " + (isProfit ? "positive-value" : "negative-value")}>{profit >= 0 ? "+" : ""}{fmtMoney(profit, 0)} ₽</div>
    </div>
  );
}

function ExpenseBar(props) {
  var totals = props.totals;
  if (!totals || totals.costs <= 0) return null;
  var items = [
    { label: "ЗП сотрудников", value: Number(totals.salary_workers || totals.labor || 0), color: "#667eea" },
    { label: "ЗП менеджмент", value: Number(totals.salary_manager || totals.team_payroll || 0), color: "#7c4dff" },
    { label: "ЗП руководители", value: Number(totals.salary_head || 0), color: "#a78bfa" },
    { label: "Реклама", value: Number(totals.ads || 0), color: "#f59e0b" },
    { label: "Транспорт", value: Number(totals.transport || 0), color: "#06b6d4" },
    { label: "Штрафы", value: Number(totals.penalties || 0), color: "#ef4444" },
    { label: "Налоги", value: Number(totals.tax || 0), color: "#64748b" },
  ];
  var total = items.reduce(function (s, i) { return s + i.value; }, 0);
  return (
    <div className="expense-bar-widget">
      <div className="expense-stacked-bar">
        {items.map(function (item, i) {
          var pct = total > 0 ? (item.value / total) * 100 : 0;
          if (pct < 0.5) return null;
          return <div key={i} className="expense-bar-segment" style={{ width: pct + "%", background: item.color }} title={item.label + ": " + fmtMoney(item.value, 0) + " ₽ (" + pct.toFixed(1) + "%)"} />;
        })}
      </div>
      <div className="expense-legend">
        {items.filter(function (i) { return i.value > 0; }).map(function (item, i) {
          return (
            <div key={i} className="expense-legend-item" style={{ animationDelay: i * 60 + "ms" }}>
              <span className="expense-legend-dot" style={{ background: item.color }} />
              <span className="expense-legend-label">{item.label}</span>
              <span className="expense-legend-value">{fmtMoney(item.value, 0)} ₽</span>
              <span className="expense-legend-pct">{((item.value / total) * 100).toFixed(1)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RiskRing(props) {
  var count = props.count, total = props.total, color = props.color, label = props.label;
  var pct = total > 0 ? (count / total) * 100 : 0;
  var circumference = 2 * Math.PI * 36;
  var offset = circumference - (pct / 100) * circumference;
  return (
    <div className="risk-ring-item">
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r="36" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="8" />
        <circle cx="44" cy="44" r="36" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} transform="rotate(-90 44 44)" className="risk-ring-progress" />
        <text x="44" y="40" textAnchor="middle" fontSize="18" fontWeight="800" fill={color}>{count}</text>
        <text x="44" y="56" textAnchor="middle" fontSize="10" fill="#94a3b8">{pct.toFixed(0)}%</text>
      </svg>
      <span className="risk-ring-label">{label}</span>
    </div>
  );
}

function formatAnomalyValue(item) {
  if (!item) return "";
  var val = Number(item.value) || 0;
  if (item.reason && item.reason.indexOf("маржинальность") !== -1) return fmtPct(val);
  return fmtMoney(val, 0) + " ₽";
}
export default function Summary() {
  var router = useRouter();
  var auth = useAuth();
  var months = auth.months || [];
  var selectedMonth = auth.selectedMonth || "";
  var setSelectedMonth = auth.setSelectedMonth;

  var _data = useState(null), data = _data[0], setData = _data[1];
  var _loading = useState(true), loading = _loading[0], setLoading = _loading[1];
  var _error = useState(null), error = _error[0], setError = _error[1];
  var _mounted = useState(false), mounted = _mounted[0], setMounted = _mounted[1];

  useEffect(function () { setMounted(true); }, []);

  useEffect(function () {
    if (!selectedMonth) { setLoading(false); return; }
    setLoading(true);
    fetch("/api/summary?month=" + selectedMonth)
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.ok) { setData(d); setError(null); }
        else throw new Error(d.error || "Ошибка");
      })
      .catch(function (e) { setError(e.message); setData(null); })
      .finally(function () { setLoading(false); });
  }, [selectedMonth]);

  var totalProjects = data && data.projects ? data.projects.length : 0;
  var riskDist = data && data.riskDistribution ? data.riskDistribution : { green: 0, yellow: 0, red: 0 };

  return (
    <DkrsAppShell>
      <div className={"summary-page " + (mounted ? "mounted" : "")}>
        <div className="summary-page-header">
          <div>
            <h1 className="summary-title">📋 Сводка и аналитика</h1>
            <p className="summary-subtitle">Ключевые показатели за период</p>
          </div>
          {months.length > 0 && (
            <div className="dashboard-period-bar" style={{ margin: 0 }}>
              <span className="dashboard-period-label">📅 Период:</span>
              <select className="dkrs-select" value={selectedMonth} onChange={function (e) { setSelectedMonth(e.target.value); }}>
                {months.map(function (m) { return <option key={m} value={m}>{m}</option>; })}
              </select>
            </div>
          )}
        </div>

        {loading ? (
          <div className="centered-message"><div className="loader-spinner" /><span>Анализируем данные...</span></div>
        ) : error ? (
          <div className="centered-message error">{error}</div>
        ) : data ? (
          <React.Fragment>
            <div className="summary-two-cols">
              <div className="summary-widget glass-card">
                <div className="widget-header"><h3>🏆 Топ-3 прибыльных</h3><span className="widget-badge green">Лидеры</span></div>
                <div className="top-cards-list">
                  {(data.top_profitable || []).map(function (p, i) { return <TopCard key={p.project} project={p} index={i} variant="profit" />; })}
                  {(!data.top_profitable || data.top_profitable.length === 0) && <div className="empty-widget">Нет данных</div>}
                </div>
              </div>
              <div className="summary-widget glass-card">
                <div className="widget-header"><h3>📉 Топ-3 убыточных</h3><span className="widget-badge red">Внимание</span></div>
                <div className="top-cards-list">
                  {(data.top_unprofitable || []).map(function (p, i) { return <TopCard key={p.project} project={p} index={i} variant="loss" />; })}
                  {(!data.top_unprofitable || data.top_unprofitable.length === 0) && <div className="empty-widget">Нет убыточных</div>}
                </div>
              </div>
            </div>

            <div className="summary-two-cols">
              <div className="summary-widget glass-card">
                <div className="widget-header"><h3>🎯 Распределение рисков</h3><span className="widget-badge neutral">{totalProjects} проектов</span></div>
                <div className="risk-rings-row">
                  <RiskRing count={riskDist.green} total={totalProjects} color="#10b981" label="Низкий" />
                  <RiskRing count={riskDist.yellow} total={totalProjects} color="#f59e0b" label="Средний" />
                  <RiskRing count={riskDist.red} total={totalProjects} color="#ef4444" label="Высокий" />
                </div>
              </div>
              <div className="summary-widget glass-card">
                <div className="widget-header"><h3>📊 Структура расходов</h3><span className="widget-badge neutral">{fmtMoney((data.totals && data.totals.costs) || 0, 0)} ₽</span></div>
                <ExpenseBar totals={data.totals} />
              </div>
            </div>

            <div className="summary-widget glass-card full-width">
              <div className="widget-header"><h3>⚠️ Аномалии</h3><span className="widget-badge orange">{data.anomalies ? data.anomalies.length : 0} найдено</span></div>
              <div className="projects-table-wrapper">
                <table className="dkrs-table">
                  <thead><tr><th>Проект</th><th>Причина</th><th>Значение</th></tr></thead>
                  <tbody>
                    {data.anomalies && data.anomalies.length > 0 ? data.anomalies.map(function (item, i) {
                      return (
                        <tr key={i} className="table-row-animated" style={{ animationDelay: i * 50 + "ms" }}>
                          <td className="project-name">{item.project}</td>
                          <td><span className="anomaly-chip">{item.reason === "Штрафы" ? "⚖️" : item.reason === "Высокие расходы на рекламу" ? "📢" : "📉"} {item.reason}</span></td>
                          <td className={item.reason && item.reason.indexOf("маржинальность") !== -1 ? "negative-value" : ""}>{formatAnomalyValue(item)}</td>
                        </tr>
                      );
                    }) : (
                      <tr><td colSpan="3" className="empty-state"><div className="empty-icon">🎉</div>Аномалий не найдено!</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="summary-two-cols">
              <div className="summary-widget glass-card">
                <div className="widget-header"><h3>💡 Быстрые инсайты</h3></div>
                <div className="insights-list">
                  {(data.insights || []).map(function (ins, i) {
                    return <div key={i} className="insight-item" style={{ animationDelay: i * 80 + "ms" }}><span className="insight-icon"
