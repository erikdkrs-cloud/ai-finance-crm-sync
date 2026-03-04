// pages/reports.js
import React, { useMemo, useState } from "react";
import Link from "next/link";
import DkrsAppShell from "../components/DkrsAppShell";

function RiskBadge({ level }) {
  const map = {
    low: { cls: "ok", label: "LOW" },
    medium: { cls: "warn", label: "MED" },
    high: { cls: "danger", label: "HIGH" },
  };
  const x = map[level] || map.low;
  return (
    <span className={`badge ${x.cls}`}>
      <span className="dot" />
      {x.label}
    </span>
  );
}

export default function ReportsPage() {
  // позже заменим на реальные данные с твоего API (/api/reports_list и т.п.)
  const [q, setQ] = useState("");
  const rows = useMemo(
    () => [
      { id: "1", month: "2026-01", project: "Датые рса", revenue: 175355856.81, expense: 727295783, profit: 300287, margin: 31.9, risk: "low" },
      { id: "2", month: "2026-01", project: "Lamoda Казани", revenue: 136948060.01, expense: 135338730, profit: 278992, margin: 18.09, risk: "high" },
      { id: "3", month: "2025-01", project: "Датский Мер (СЦА)", revenue: 136948760.01, expense: 175827122, profit: 227612, margin: 18.05, risk: "medium" },
    ].filter((r) => (r.project + r.month).toLowerCase().includes(q.toLowerCase())),
    [q]
  );

  return (
    <DkrsAppShell
      title="Отчёты"
      subtitle="Список отчётов по периодам и проектам"
      rightSlot={
        <>
          <input
            className="input"
            style={{ width: 260 }}
            placeholder="Поиск…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="btn">Сформировать отчёт</button>
        </>
      }
    >
      <div className="glass strong" style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 900, letterSpacing: "-0.02em" }}>Список отчётов</div>
            <div className="dkrs-sub">Сортировка/поиск/бейджи риска — как в референсе</div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <select className="select" defaultValue="month_desc">
              <option value="month_desc">Месяц ↓</option>
              <option value="month_asc">Месяц ↑</option>
              <option value="profit_desc">Прибыль ↓</option>
              <option value="profit_asc">Прибыль ↑</option>
            </select>
            <select className="select" defaultValue="all">
              <option value="all">Все риски</option>
              <option value="low">LOW</option>
              <option value="medium">MED</option>
              <option value="high">HIGH</option>
            </select>
          </div>
        </div>

        <div className="tableWrap" style={{ marginTop: 12 }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 56 }}>#</th>
                <th>Месяц</th>
                <th>Проект</th>
                <th>Выручка</th>
                <th>Расход</th>
                <th>Прибыль</th>
                <th>Маржа</th>
                <th style={{ width: 120 }}>Риск</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={r.id}>
                  <td>{idx + 1}</td>
                  <td>{r.month}</td>
                  <td>
                    <Link href={`/reports/${r.id}`} style={{ fontWeight: 900 }}>
                      {r.project}
                    </Link>
                  </td>
                  <td>{Math.round(r.revenue).toLocaleString("ru-RU")}</td>
                  <td>{Math.round(r.expense).toLocaleString("ru-RU")}</td>
                  <td>{Math.round(r.profit).toLocaleString("ru-RU")}</td>
                  <td>{String(r.margin).replace(".", ",")}%</td>
                  <td><RiskBadge level={r.risk} /></td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ color: "rgba(100,116,139,0.9)", fontWeight: 800 }}>
                    Ничего не найдено
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </DkrsAppShell>
  );
}
