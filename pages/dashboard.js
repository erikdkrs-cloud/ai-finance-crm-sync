// pages/dashboard.js
import React, { useEffect, useMemo, useState } from "react";
import DkrsAppShell from "../components/DkrsAppShell";
import TopProjectsCards from "../components/TopProjectsCards";
import AnomaliesCard from "../components/AnomaliesCard";
import RiskBadge from "../components/RiskBadge";
import { fetchJson, tryMany } from "../lib/dkrsClient";
import { fmtMoney, fmtPct } from "../lib/format";

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
      ) : (
        <div className="kpiDelta" style={{ color: "rgba(100,116,139,0.85)" }}>
          —
        </div>
      )}
    </div>
  );
}

function safeMonthFallback() {
  // на всякий случай, если /api/months вдруг не доступен
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export default function DashboardPage() {
  const [months, setMonths] = useState([]);
  const [month, setMonth] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [totals, setTotals] = useState(null);
  const [projects, setProjects] = useState([]);

  // 1) load months
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // у тебя точно есть /api/months (по старым логам)
        const m = await fetchJson("/api/months");
        const list = m?.months || m?.data || m || [];
        if (!alive) return;

        const clean = Array.isArray(list) ? list : [];
        setMonths(clean);

        // select last available month
        const defaultMonth = clean?.[0] || clean?.[clean.length - 1] || safeMonthFallback();
        setMonth(String(defaultMonth));
      } catch (e) {
        if (!alive) return;
        setMonths([]);
        setMonth(safeMonthFallback());
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // 2) load dashboard for month
  useEffect(() => {
    if (!month) return;

    let alive = true;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const data = await tryMany([
          `/api/dashboard?month=${encodeURIComponent(month)}`,
          `/api/dashboard.js?month=${encodeURIComponent(month)}`,
        ]);

        if (!alive) return;

        if (!data?.ok) throw new Error(data?.error || "Dashboard API returned ok=false");

        setTotals(data.totals || null);
        setProjects(Array.isArray(data.projects) ? data.projects : []);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Не удалось загрузить дашборд");
        setTotals(null);
        setProjects([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [month]);

  const kpi = useMemo(() => {
    const t = totals || {};
    // margin у тебя приходит 0..1
    const marginPct = t.margin != null ? t.margin * 100 : null;
    return {
      revenue: fmtMoney(t.revenue),
      costs: fmtMoney(t.costs),
      profit: fmtMoney(t.profit),
      margin: marginPct == null ? "—" : fmtPct(marginPct),
    };
  }, [totals]);

  const titleRight = (
    <>
      <span className="dkrs-pill">
        <span className="dot" style={{ background: "rgba(167,139,250,0.9)" }} />
        Период:&nbsp;
        <b>{month || "—"}</b>
      </span>

      <select
        className="select"
        value={month}
        onChange={(e) => setMonth(e.target.value)}
        style={{ width: 140 }}
        title="Выбрать месяц"
      >
        {(months.length ? months : [month]).map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>

      <button className="btn" onClick={() => location.assign("/assistant")}>
        Сформировать отчёт
      </button>
    </>
  );

  return (
    <DkrsAppShell
      title="Дашборд"
      subtitle="Ключевые метрики, топ-проекты и аномалии"
      rightSlot={titleRight}
    >
      {err ? (
        <div className="glass strong" style={{ padding: 16, marginBottom: 14 }}>
          <div style={{ fontWeight: 900, color: "rgba(251,113,133,0.95)" }}>{err}</div>
        </div>
      ) : null}

      <div className="kpiGrid" style={{ marginBottom: 14 }}>
        <KpiCard label="Выручка" value={loading ? "…" : `${kpi.revenue} ₽`} />
        <KpiCard label="Расходы" value={loading ? "…" : `${kpi.costs} ₽`} />
        <KpiCard label="Прибыль" value={loading ? "…" : `${kpi.profit} ₽`} />
        <KpiCard label="Маржа" value={loading ? "…" : kpi.margin} />
      </div>

      {/* Top-3 block like reference */}
      <div className="glass strong" style={{ padding: 16, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 900, letterSpacing: "-0.02em" }}>Топ-3 убыточных</div>
            <div className="dkrs-sub">Проекты с отрицательной прибылью за период</div>
          </div>
          <button className="btn ghost" onClick={() => setMonth(month)}>
            Сбросить
          </button>
        </div>

        <div style={{ marginTop: 12 }}>
          <TopProjectsCards projects={projects} />
        </div>
      </div>

      {/* Main grid: projects table + anomalies */}
      <div style={{ display: "grid", gridTemplateColumns: "1.25fr 0.75fr", gap: 14 }}>
        <div className="glass strong" style={{ padding: 16, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 900, letterSpacing: "-0.02em" }}>Проекты</div>
              <div className="dkrs-sub">Таблица по всем проектам за выбранный месяц</div>
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
                  <th style={{ width: 120 }}>Риск</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ color: "rgba(100,116,139,0.9)", fontWeight: 800 }}>
                      Загрузка…
                    </td>
                  </tr>
                ) : projects.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ color: "rgba(100,116,139,0.9)", fontWeight: 800 }}>
                      Нет данных
                    </td>
                  </tr>
                ) : (
                  projects.map((p) => (
                    <tr key={p.project}>
                      <td style={{ fontWeight: 900 }}>{p.project}</td>
                      <td>{fmtMoney(p.revenue)}</td>
                      <td>{fmtMoney(p.costs)}</td>
                      <td style={{ fontWeight: 900, color: Number(p.profit) < 0 ? "rgba(251,113,133,0.95)" : "rgba(20,184,166,0.95)" }}>
                        {fmtMoney(p.profit)}
                      </td>
                      <td>
                        {p.margin == null ? "—" : fmtPct(Number(p.margin) * 100)}
                      </td>
                      <td>
                        {/* твой риск: green/yellow/red */}
                        <RiskBadge risk={p.risk} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass strong" style={{ padding: 16, minWidth: 0 }}>
          <div style={{ fontWeight: 900, letterSpacing: "-0.02em" }}>Аномалии</div>
          <div className="dkrs-sub">Штрафы, реклама, низкая маржа, отрицательная прибыль</div>
          <div style={{ marginTop: 12 }}>
            <AnomaliesCard projects={projects} />
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
