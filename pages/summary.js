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
