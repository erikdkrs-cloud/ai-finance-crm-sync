// pages/dashboard.js
import React, { useEffect, useMemo, useState } from "react";
import DkrsAppShell from "../components/DkrsAppShell";
import TopProjectsCards from "../components/TopProjectsCards";
import AnomaliesCard from "../components/AnomaliesCard";
import RiskBadge from "../components/RiskBadge";
import { fetchJson, tryMany } from "../lib/dkrsClient";
import { fmtMoney, fmtPct } from "../lib/format";

function KpiCard({ label, value }) {
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
      <div className="kpiDelta" style={{ color: "rgba(100,116,139,0.85)" }}>
        —
      </div>
    </div>
  );
}

function safeMonthFallback() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function Chip({ active, children, onClick, tone }) {
  const border =
    active
      ? tone === "red"
        ? "rgba(251,113,133,0.40)"
        : tone === "yellow"
        ? "rgba(251,191,36,0.40)"
        : tone === "green"
        ? "rgba(20,184,166,0.40)"
        : "rgba(167,139,250,0.40)"
      : "rgba(148,163,184,0.22)";

  const bg =
    active
      ? tone === "red"
        ? "linear-gradient(135deg, rgba(251,113,133,0.16), rgba(167,139,250,0.10))"
        : tone === "yellow"
        ? "linear-gradient(135deg, rgba(251,191,36,0.16), rgba(20,184,166,0.08))"
        : tone === "green"
        ? "linear-gradient(135deg, rgba(20,184,166,0.16), rgba(52,211,153,0.10))"
        : "linear-gradient(135deg, rgba(167,139,250,0.14), rgba(20,184,166,0.08))"
      : "rgba(255,255,255,0.60)";

  const color =
    active
      ? "rgba(15,23,42,0.86)"
      : "rgba(100,116,139,0.92)";

  return (
    <button
      type="button"
      onClick={onClick}
      className="btn ghost"
      style={{
        padding: "8px 12px",
        borderRadius: 999,
        border: `1px solid ${border}`,
        background: bg,
        boxShadow: active ? "0 14px 34px rgba(15,23,42,0.08)" : "0 10px 24px rgba(15,23,42,0.06)",
        fontWeight: 900,
        fontSize: 12,
        color,
      }}
    >
      {children}
    </button>
  );
}

function MiniPill({ dot, label, value }) {
  return (
    <span className="dkrs-pill" style={{ padding: "7px 10px", gap: 8 }}>
      <span className="dot" style={{ background: dot }} />
      <span style={{ fontWeight: 900, color: "rgba(100,116,139,0.95)" }}>{label}:</span>
      <span style={{ fontWeight: 950 }}>{value}</span>
    </span>
  );
}

export default function DashboardPage() {
  const [months, setMonths] = useState([]);
  const [month, setMonth] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [totals, setTotals] = useState(null);
  const [projects, setProjects] = useState([]);

  // table controls
  const [q, setQ] = useState("");
  const [riskFilter, setRiskFilter] = useState("all"); // all | green | yellow | red
  const [sort, setSort] = useState("profit_asc"); // profit_asc | profit_desc | margin_asc | margin_desc | revenue_desc | costs_desc

  // load months
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const m = await fetchJson("/api/months");
        const list = m?.months || m?.data || m || [];
        if (!alive) return;

        const clean = Array.isArray(list) ? list : [];
        setMonths(clean);

        const defaultMonth = clean?.[0] || clean?.[clean.length - 1] || safeMonthFallback();
        setMonth(String(defaultMonth));
      } catch {
        if (!alive) return;
        setMonths([]);
        setMonth(safeMonthFallback());
      }
    })();
    return () => (alive = false);
  }, []);

  // load dashboard for month
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

    return () => (alive = false);
  }, [month]);

  const kpi = useMemo(() => {
    const t = totals || {};
    const marginPct = t.margin != null ? t.margin * 100 : null;
    return {
      revenue: fmtMoney(t.revenue),
      costs: fmtMoney(t.costs),
      profit: fmtMoney(t.profit),
      margin: marginPct == null ? "—" : fmtPct(marginPct),
      marginPct,
    };
  }, [totals]);

  const filteredProjects = useMemo(() => {
    let arr = [...projects];

    if (q.trim()) {
      const qq = q.trim().toLowerCase();
      arr = arr.filter((p) => String(p.project || "").toLowerCase().includes(qq));
    }

    if (riskFilter !== "all") {
      arr = arr.filter((p) => String(p.risk || "").toLowerCase() === riskFilter);
    }

    const sorter = {
      profit_asc: (a, b) => (Number(a.profit) || 0) - (Number(b.profit) || 0),
      profit_desc: (a, b) => (Number(b.profit) || 0) - (Number(a.profit) || 0),
      margin_asc: (a, b) => (Number(a.margin) || 0) - (Number(b.margin) || 0),
      margin_desc: (a, b) => (Number(b.margin) || 0) - (Number(a.margin) || 0),
      revenue_desc: (a, b) => (Number(b.revenue) || 0) - (Number(a.revenue) || 0),
      costs_desc: (a, b) => (Number(b.costs) || 0) - (Number(a.costs) || 0),
    }[sort];

    if (sorter) arr.sort(sorter);
    return arr;
  }, [projects, q, riskFilter, sort]);

  const titleRight = (
    <>
      <span className="dkrs-pill">
        <span className="dot" style={{ background: "rgba(167,139,250,0.9)" }} />
        Период:&nbsp;<b>{month || "—"}</b>
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

      {/* Top-3 block */}
      <div className="glass strong" style={{ padding: 16, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 950, letterSpacing: "-0.02em" }}>Топ-3 убыточных</div>
            <div className="dkrs-sub">Проекты с отрицательной прибылью за период</div>
          </div>
          <button className="btn ghost" onClick={() => { setQ(""); setRiskFilter("all"); setSort("profit_asc"); }}>
            Сбросить фильтры
          </button>
        </div>

        <div style={{ marginTop: 12 }}>
          <TopProjectsCards projects={projects} />
        </div>
      </div>

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.25fr 0.75fr", gap: 14 }}>
        {/* Projects card with filters like reference */}
        <div className="glass strong" style={{ padding: 16, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 950, letterSpacing: "-0.02em" }}>Проекты</div>
              <div className="dkrs-sub" style={{ marginTop: 6 }}>
                Поиск • фильтры риска • сортировка — в одной карточке
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <MiniPill dot="rgba(167,139,250,0.9)" label="Revenue" value={loading ? "…" : `${kpi.revenue} ₽`} />
              <MiniPill dot="rgba(20,184,166,0.9)" label="Profit" value={loading ? "…" : `${kpi.profit} ₽`} />
              <MiniPill dot="rgba(52,211,153,0.9)" label="Margin" value={loading ? "…" : kpi.margin} />
            </div>
          </div>

          <div
            style={{
              marginTop: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <input
              className="input"
              style={{ width: 280 }}
              placeholder="Поиск проекта…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Chip active={riskFilter === "all"} onClick={() => setRiskFilter("all")}>All</Chip>
              <Chip active={riskFilter === "green"} tone="green" onClick={() => setRiskFilter("green")}>Green</Chip>
              <Chip active={riskFilter === "yellow"} tone="yellow" onClick={() => setRiskFilter("yellow")}>Yellow</Chip>
              <Chip active={riskFilter === "red"} tone="red" onClick={() => setRiskFilter("red")}>Red</Chip>

              <select className="select" value={sort} onChange={(e) => setSort(e.target.value)} style={{ width: 160 }}>
                <option value="profit_asc">Profit ↑</option>
                <option value="profit_desc">Profit ↓</option>
                <option value="margin_asc">Margin ↑</option>
                <option value="margin_desc">Margin ↓</option>
                <option value="revenue_desc">Revenue ↓</option>
                <option value="costs_desc">Costs ↓</option>
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
                ) : filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ color: "rgba(100,116,139,0.9)", fontWeight: 800 }}>
                      Нет данных
                    </td>
                  </tr>
                ) : (
                  filteredProjects.map((p) => {
                    const profit = Number(p.profit || 0);
                    const marginPct = p.margin == null ? null : Number(p.margin) * 100;

                    const marginTone =
                      marginPct == null ? "muted" : marginPct < 10 ? "red" : marginPct < 20 ? "yellow" : "green";

                    return (
                      <tr
                        key={p.project}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(255,255,255,0.55)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                        }}
                        style={{ transition: "background .14s ease" }}
                      >
                        <td style={{ fontWeight: 950 }}>{p.project}</td>
                        <td>{fmtMoney(p.revenue)}</td>
                        <td>{fmtMoney(p.costs)}</td>
                        <td
                          style={{
                            fontWeight: 950,
                            color: profit < 0 ? "rgba(251,113,133,0.95)" : "rgba(20,184,166,0.95)",
                          }}
                        >
                          {fmtMoney(p.profit)}
                        </td>
                        <td
                          style={{
                            fontWeight: 950,
                            color:
                              marginTone === "red"
                                ? "rgba(251,113,133,0.95)"
                                : marginTone === "yellow"
                                ? "rgba(251,191,36,0.95)"
                                : "rgba(20,184,166,0.95)",
                          }}
                        >
                          {marginPct == null ? "—" : fmtPct(marginPct)}
                        </td>
                        <td>
                          <RiskBadge risk={p.risk} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Anomalies */}
        <div className="glass strong" style={{ padding: 16, minWidth: 0 }}>
          <div style={{ fontWeight: 950, letterSpacing: "-0.02em" }}>Аномалии</div>
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
