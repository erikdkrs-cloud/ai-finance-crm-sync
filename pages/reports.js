// pages/reports.js
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DkrsAppShell from "../components/DkrsAppShell";
import RiskBadge from "../components/RiskBadge";
import { fmtMoney, fmtPct, clampRisk } from "../lib/format";
import { tryMany } from "../lib/dkrsClient";

function normalizeRows(payload) {
  // ожидаем либо {rows:[...]} либо просто [...]
  const arr = Array.isArray(payload) ? payload : payload?.rows || payload?.data || [];
  return arr.map((r, idx) => ({
    id: r.id ?? r.report_id ?? r.ai_report_id ?? String(idx + 1),
    month: r.month ?? r.period ?? r.period_month ?? r.period_id ?? "—",
    project: r.project ?? r.project_name ?? r.name ?? "—",
    revenue: r.revenue ?? r.revenue_no_vat ?? r.metrics?.revenue ?? r.metrics?.revenue_no_vat ?? null,
    expense: r.expense ?? r.costs ?? r.metrics?.expense ?? r.metrics?.costs ?? null,
    profit: r.profit ?? r.metrics?.profit ?? null,
    margin: r.margin ?? r.metrics?.margin ?? null,
    risk: r.risk_level ?? r.risk ?? r.level ?? "low",
  }));
}

export default function ReportsPage() {
  const [q, setQ] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [sort, setSort] = useState("month_desc");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const data = await tryMany([
          "/api/reports_list",
          "/api/reports",
        ]);
        if (!alive) return;
        setRows(normalizeRows(data));
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Не удалось загрузить отчёты");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const view = useMemo(() => {
    let r = [...rows];

    if (q.trim()) {
      const qq = q.trim().toLowerCase();
      r = r.filter((x) => `${x.project} ${x.month}`.toLowerCase().includes(qq));
    }

    if (riskFilter !== "all") {
      r = r.filter((x) => clampRisk(x.risk) === riskFilter);
    }

    const sorters = {
      month_desc: (a, b) => String(b.month).localeCompare(String(a.month)),
      month_asc: (a, b) => String(a.month).localeCompare(String(b.month)),
      profit_desc: (a, b) => (Number(b.profit) || -Infinity) - (Number(a.profit) || -Infinity),
      profit_asc: (a, b) => (Number(a.profit) || Infinity) - (Number(b.profit) || Infinity),
    };

    r.sort(sorters[sort] || sorters.month_desc);
    return r;
  }, [rows, q, riskFilter, sort]);

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
          <button className="btn" onClick={() => location.assign("/assistant")}>
            Сформировать отчёт
          </button>
        </>
      }
    >
      <div className="glass strong" style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 900, letterSpacing: "-0.02em" }}>Список отчётов</div>
            <div className="dkrs-sub">Поиск, сортировка и бейджи риска в светлом glass-стиле</div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <select className="select" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="month_desc">Месяц ↓</option>
              <option value="month_asc">Месяц ↑</option>
              <option value="profit_desc">Прибыль ↓</option>
              <option value="profit_asc">Прибыль ↑</option>
            </select>
            <select className="select" value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}>
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
              {loading ? (
                <tr><td colSpan={8} style={{ color: "rgba(100,116,139,0.9)", fontWeight: 800 }}>Загрузка…</td></tr>
              ) : err ? (
                <tr><td colSpan={8} style={{ color: "rgba(251,113,133,0.95)", fontWeight: 900 }}>{err}</td></tr>
              ) : view.length === 0 ? (
                <tr><td colSpan={8} style={{ color: "rgba(100,116,139,0.9)", fontWeight: 800 }}>Ничего не найдено</td></tr>
              ) : (
                view.map((r, idx) => (
                  <tr key={r.id}>
                    <td>{idx + 1}</td>
                    <td>{r.month}</td>
                    <td>
                      <Link href={`/reports/${encodeURIComponent(r.id)}`} style={{ fontWeight: 900 }}>
                        {r.project}
                      </Link>
                    </td>
                    <td>{fmtMoney(r.revenue)}</td>
                    <td>{fmtMoney(r.expense)}</td>
                    <td>{fmtMoney(r.profit)}</td>
                    <td>{fmtPct(r.margin)}</td>
                    <td><RiskBadge risk={r.risk} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DkrsAppShell>
  );
}
