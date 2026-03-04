// pages/dashboard.js
import React, { useEffect, useMemo, useState } from "react";
import DkrsAppShell from "../components/DkrsAppShell";
import RiskBadge from "../components/RiskBadge";
import { fetchJson, tryMany } from "../lib/dkrsClient";
import { fmtMoney, fmtPct } from "../lib/format";

function safeMonthFallback() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function ruSortLabel(v) {
  const s = String(v || "");
  if (s === "profit_desc") return "Прибыль ↓";
  if (s === "profit_asc") return "Прибыль ↑";
  if (s === "revenue_desc") return "Выручка ↓";
  if (s === "revenue_asc") return "Выручка ↑";
  if (s === "margin_desc") return "Маржа ↓";
  if (s === "margin_asc") return "Маржа ↑";
  return s;
}

export default function DashboardPage() {
  const [months, setMonths] = useState([]);
  const [month, setMonth] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [totals, setTotals] = useState(null);
  const [projects, setProjects] = useState([]);

  const [q, setQ] = useState("");
  const [risk, setRisk] = useState("all"); // all | green | yellow | red
  const [sort, setSort] = useState("profit_desc");

  // months
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const m = await fetchJson("/api/months");
        const list = m?.months || [];
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

  // data
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
        if (!data?.ok) throw new Error(data?.error || "Dashboard API ok=false");

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
    };
  }, [totals]);

  const filtered = useMemo(() => {
    let list = Array.isArray(projects) ? [...projects] : [];

    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter((p) => String(p.project || "").toLowerCase().includes(s));
    }

    if (risk !== "all") {
      list = list.filter((p) => String(p.risk || "").toLowerCase() === risk);
    }

    const key = sort;
    const get = (p) => {
      if (key.startsWith("profit")) return Number(p.profit || 0);
      if (key.startsWith("revenue")) return Number(p.revenue || 0);
      if (key.startsWith("margin")) return Number(p.margin || 0);
      return Number(p.profit || 0);
    };
    list.sort((a, b) => {
      const da = get(a);
      const db = get(b);
      if (key.endsWith("asc")) return da - db;
      return db - da;
    });

    return list;
  }, [projects, q, risk, sort]);

  const titleRight = (
    <>
      <span className="dkrs-pill">
        <span className="dot" style={{ background: "rgba(167,139,250,0.9)" }} />
        Период:&nbsp;<b>{month || "—"}</b>
      </span>

      <select className="select" value={month} onChange={(e) => setMonth(e.target.value)} style={{ width: 140 }}>
        {(months.length ? months : [month]).map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>

      <button className="btn" onClick={() => location.assign("/assistant")}>
        AI помощник
      </button>
    </>
  );

  return (
    <DkrsAppShell title="Дашборд" subtitle="Таблица проектов + фильтры + сортировка" rightSlot={titleRight}>
      {err ? (
        <div className="glass strong" style={{ padding: 16, marginBottom: 14 }}>
          <div style={{ fontWeight: 900, color: "rgba(251,113,133,0.95)" }}>{err}</div>
        </div>
      ) : null}

      {/* KPI */}
      <div className="kpiGrid" style={{ marginBottom: 14 }}>
        <div className="kpiCard">
          <div className="kpiTop">
            <div className="kpiLabel">Выручка</div>
            <span className="badge">
              <span className="dot" style={{ background: "rgba(20,184,166,0.9)" }} />
              KPI
            </span>
          </div>
          <div className="kpiValue">{loading ? "…" : `${kpi.revenue} ₽`}</div>
        </div>

        <div className="kpiCard">
          <div className="kpiTop">
            <div className="kpiLabel">Расходы</div>
            <span className="badge">
              <span className="dot" style={{ background: "rgba(167,139,250,0.9)" }} />
              KPI
            </span>
          </div>
          <div className="kpiValue">{loading ? "…" : `${kpi.costs} ₽`}</div>
        </div>

        <div className="kpiCard">
          <div className="kpiTop">
            <div className="kpiLabel">Прибыль</div>
            <span className="badge">
              <span className="dot" style={{ background: "rgba(52,211,153,0.9)" }} />
              KPI
            </span>
          </div>
          <div className="kpiValue">{loading ? "…" : `${kpi.profit} ₽`}</div>
        </div>

        <div className="kpiCard">
          <div className="kpiTop">
            <div className="kpiLabel">Маржа</div>
            <span className="badge">
              <span className="dot" style={{ background: "rgba(251,191,36,0.9)" }} />
              KPI
            </span>
          </div>
          <div className="kpiValue">{loading ? "…" : kpi.margin}</div>
        </div>
      </div>

      {/* Main card: table + filters */}
      <div className="glass strong" style={{ padding: 16, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 900, letterSpacing: "-0.02em" }}>Проекты</div>
            <div className="dkrs-sub">Поиск • фильтры риска • сортировка — в одной карточке</div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <span className="dkrs-pill" style={{ padding: "8px 12px" }}>
              <span className="dot" style={{ background: "rgba(167,139,250,0.9)" }} />
              Выручка:&nbsp;<b>{loading ? "…" : `${kpi.revenue} ₽`}</b>
            </span>
            <span className="dkrs-pill" style={{ padding: "8px 12px" }}>
              <span className="dot" style={{ background: "rgba(20,184,166,0.9)" }} />
              Прибыль:&nbsp;<b>{loading ? "…" : `${kpi.profit} ₽`}</b>
            </span>
            <span className="dkrs-pill" style={{ padding: "8px 12px" }}>
              <span className="dot" style={{ background: "rgba(251,191,36,0.9)" }} />
              Маржа:&nbsp;<b>{loading ? "…" : kpi.margin}</b>
            </span>
          </div>
        </div>

        {/* filters */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, marginTop: 12, alignItems: "center" }}>
          <input className="input" placeholder="Поиск проекта…" value={q} onChange={(e) => setQ(e.target.value)} />

          <select className="select" value={sort} onChange={(e) => setSort(e.target.value)} style={{ width: 160 }}>
            <option value="profit_desc">{ruSortLabel("profit_desc")}</option>
            <option value="profit_asc">{ruSortLabel("profit_asc")}</option>
            <option value="revenue_desc">{ruSortLabel("revenue_desc")}</option>
            <option value="revenue_asc">{ruSortLabel("revenue_asc")}</option>
            <option value="margin_desc">{ruSortLabel("margin_desc")}</option>
            <option value="margin_asc">{ruSortLabel("margin_asc")}</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
          <button className={`btn ghost ${risk === "all" ? "dkrs-active" : ""}`} onClick={() => setRisk("all")}>
            Все
          </button>
          <button className={`btn ghost ${risk === "green" ? "dkrs-active" : ""}`} onClick={() => setRisk("green")}>
            Зелёные
          </button>
          <button className={`btn ghost ${risk === "yellow" ? "dkrs-active" : ""}`} onClick={() => setRisk("yellow")}>
            Жёлтые
          </button>
          <button className={`btn ghost ${risk === "red" ? "dkrs-active" : ""}`} onClick={() => setRisk("red")}>
            Красные
          </button>
        </div>

        {/* table */}
        <div className="tableWrap" style={{ marginTop: 12 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Проект</th>
                <th>Выручка</th>
                <th>Расходы</th>
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
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ color: "rgba(100,116,139,0.9)", fontWeight: 800 }}>
                    Нет данных
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.project}>
                    <td style={{ fontWeight: 900 }}>{p.project}</td>
                    <td>{fmtMoney(p.revenue)}</td>
                    <td>{fmtMoney(p.costs)}</td>
                    <td style={{ fontWeight: 900, color: Number(p.profit) < 0 ? "rgba(251,113,133,0.95)" : "rgba(20,184,166,0.95)" }}>
                      {fmtMoney(p.profit)}
                    </td>
                    <td>{p.margin == null ? "—" : fmtPct(Number(p.margin) * 100)}</td>
                    <td>
                      <RiskBadge risk={p.risk} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <style jsx>{`
          .dkrs-active {
            border-color: rgba(20,184,166,0.35) !important;
            background: rgba(20,184,166,0.10) !important;
          }
          @media (max-width: 920px) {
            div[style*="grid-template-columns: 1fr auto"] {
              grid-template-columns: 1fr !important;
            }
            select[style*="width: 160"] {
              width: 100% !important;
            }
          }
        `}</style>
      </div>
    </DkrsAppShell>
  );
}
