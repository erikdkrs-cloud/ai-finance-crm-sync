// pages/dashboard.js
import React from "react";
import DkrsAppShell from "../components/DkrsAppShell";

// Если у тебя уже есть эти компоненты — подключи обратно
import TopProjectsCards from "../components/TopProjectsCards";
import AnomaliesCard from "../components/AnomaliesCard";

function KpiCard({ label, value, delta, positive }) {
  return (
    <div className="kpiCard">
      <div className="kpiTop">
        <div className="kpiLabel">{label}</div>
        <span className="badge">
          <span className="dot" style={{ background: "rgba(20,184,166,0.9)" }} />
          KPI
        </span>
      </div>
      <div className="kpiValue">{value}</div>
      {delta ? (
        <div className={["kpiDelta", positive ? "pos" : "neg"].join(" ")}>
          {delta}
        </div>
      ) : null}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <DkrsAppShell
      title="Дашборд"
      subtitle="Ключевые метрики, топ-проекты и аномалии"
      rightSlot={
        <>
          <span className="dkrs-pill">
            <span className="dot" style={{ background: "rgba(167,139,250,0.9)" }} />
            Период: <b>2025-01</b>
          </span>
          <button className="btn">Сформировать отчёт</button>
        </>
      }
    >
      <div className="kpiGrid" style={{ marginBottom: 14 }}>
        <KpiCard label="Выручка" value="175 355 856,81 ₽" delta="+3,29% MoM" positive />
        <KpiCard label="Расходы" value="136 948 060,01 ₽" delta="-2,77% MoM" positive={false} />
        <KpiCard label="Прибыль" value="38 407 796,81 ₽" delta="+23,70% MoM" positive />
        <KpiCard label="Маржа" value="21,9%" delta="+3,0 п.п." positive />
      </div>

      <div className="glass strong" style={{ padding: 16, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 900, letterSpacing: "-0.02em" }}>Топ-3 убыточных</div>
            <div className="dkrs-sub">Быстрый обзор проблемных проектов</div>
          </div>
          <button className="btn ghost">Сбросить</button>
        </div>

        <div style={{ marginTop: 12 }}>
          {/* Блок как на референсе: карточки топ-проектов */}
          <TopProjectsCards />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.25fr 0.75fr", gap: 14 }}>
        <div className="glass strong" style={{ padding: 16, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 900, letterSpacing: "-0.02em" }}>Проекты</div>
              <div className="dkrs-sub">Таблица с фильтрами и показателями</div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <input className="input" placeholder="Поиск проекта…" />
              <select className="select" defaultValue="all">
                <option value="all">Все</option>
                <option value="green">Зелёные</option>
                <option value="yellow">Жёлтые</option>
                <option value="red">Красные</option>
              </select>
            </div>
          </div>

          <div className="tableWrap" style={{ marginTop: 12 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Проект</th>
                  <th>Выручка</th>
                  <th>Расход</th>
                  <th>Прибыль</th>
                  <th>Маржа</th>
                  <th>Риск</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Датовый мер (месяц)</td>
                  <td>175 355 856</td>
                  <td>136 948 060</td>
                  <td>38 407 796</td>
                  <td>21,9%</td>
                  <td><span className="badge ok"><span className="dot" />Низкий</span></td>
                </tr>
                <tr>
                  <td>Lamoda Казани</td>
                  <td>136 948 060</td>
                  <td>135 338 730</td>
                  <td>278 992</td>
                  <td>18,09%</td>
                  <td><span className="badge warn"><span className="dot" />Средний</span></td>
                </tr>
                <tr>
                  <td>DNS</td>
                  <td>355 407 098</td>
                  <td>95 990 958</td>
                  <td>399 189</td>
                  <td>18,02%</td>
                  <td><span className="badge danger"><span className="dot" />Высокий</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass strong" style={{ padding: 16, minWidth: 0 }}>
          <div style={{ fontWeight: 900, letterSpacing: "-0.02em" }}>Аномалии</div>
          <div className="dkrs-sub">События, отклонения и подсветка проблем</div>
          <div style={{ marginTop: 12 }}>
            <AnomaliesCard />
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 1100px) {
          div[style*="grid-template-columns: 1.25fr 0.75fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </DkrsAppShell>
  );
}
