// pages/assistant.js
import React, { useEffect, useMemo, useState } from "react";
import DkrsAppShell from "../components/DkrsAppShell";
import AiAssistantWidget from "../components/AiAssistantWidget";
import MonthRangePicker from "../components/MonthRangePicker";
import { fetchJson } from "../lib/dkrsClient";
import { fmtMoney, fmtPct } from "../lib/format";

function calcDelta(cur, prev) {
  if (prev == null || cur == null) return { dv: null, dp: null };
  const c = Number(cur);
  const p = Number(prev);
  if (!Number.isFinite(c) || !Number.isFinite(p)) return { dv: null, dp: null };
  const dv = c - p;
  const dp = p !== 0 ? (dv / p) * 100 : null;
  return { dv, dp };
}

function MetricDot({ tone }) {
  const bg =
    tone === "teal"
      ? "linear-gradient(135deg, rgba(20,184,166,1), rgba(52,211,153,0.95))"
      : tone === "violet"
      ? "linear-gradient(135deg, rgba(167,139,250,1), rgba(196,181,253,0.95))"
      : tone === "amber"
      ? "linear-gradient(135deg, rgba(251,191,36,1), rgba(253,230,138,0.95))"
      : "linear-gradient(135deg, rgba(148,163,184,1), rgba(226,232,240,0.95))";

  return (
    <span
      style={{
        width: 20,
        height: 20,
        borderRadius: 999,
        background: bg,
        boxShadow: "0 14px 26px rgba(15,23,42,0.12)",
        border: "1px solid rgba(255,255,255,0.75)",
        display: "inline-block",
        flex: "0 0 auto",
      }}
      aria-hidden
    />
  );
}

function TotalsRow({ tone, label, value, month, deltaValue, deltaPct, deltaTone }) {
  const color =
    deltaTone === "pos"
      ? "rgba(20,184,166,0.95)"
      : deltaTone === "neg"
      ? "rgba(251,113,133,0.95)"
      : "rgba(100,116,139,0.85)";

  return (
    <div className="refRow" role="row">
      <div className="refCell refIcon" role="cell">
        <MetricDot tone={tone} />
      </div>

      <div className="refCell refLabel" role="cell">
        {label}
      </div>

      <div className="refCell refValue" role="cell">
        {value}
      </div>

      <div className="refCell refMonth" role="cell">
        {month}
      </div>

      <div className="refCell refDelta" role="cell" style={{ color }}>
        {deltaValue || "—"}
      </div>

      <div className="refCell refPct" role="cell" style={{ color }}>
        {deltaPct || "—"}
      </div>

      <div className="refCell refCode" role="cell">
        —
      </div>
    </div>
  );
}

export default function AssistantPage() {
  const [months, setMonths] = useState([]);
  const [startMonth, setStartMonth] = useState("");
  const [endMonth, setEndMonth] = useState("");

  const [loadingTotals, setLoadingTotals] = useState(true);
  const [totals, setTotals] = useState(null);
  const [prevTotals, setPrevTotals] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const m = await fetchJson("/api/months");
        const list = m?.months || [];
        if (!alive) return;
        setMonths(list);

        const end = list?.[0] || "";
        const start = list?.[Math.min(list.length - 1, 5)] || end;
        setStartMonth(start);
        setEndMonth(end);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Не удалось загрузить месяцы");
      }
    })();
    return () => (alive = false);
  }, []);

  useEffect(() => {
    if (!endMonth) return;
    let alive = true;

    (async () => {
      setLoadingTotals(true);
      setErr("");
      try {
        const data = await fetchJson(`/api/dashboard?month=${encodeURIComponent(endMonth)}`);
        if (!alive) return;
        if (!data?.ok) throw new Error(data?.error || "Dashboard ok=false");
        setTotals(data.totals || null);

        const idx = months.indexOf(endMonth);
        const prev = idx >= 0 ? months[idx + 1] : "";
        if (prev) {
          const prevData = await fetchJson(`/api/dashboard?month=${encodeURIComponent(prev)}`);
          if (!alive) return;
          setPrevTotals(prevData?.ok ? prevData.totals : null);
        } else {
          setPrevTotals(null);
        }
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Не удалось загрузить итоги");
        setTotals(null);
        setPrevTotals(null);
      } finally {
        if (alive) setLoadingTotals(false);
      }
    })();

    return () => (alive = false);
  }, [endMonth, months]);

  const computed = useMemo(() => {
    const t = totals || {};
    const p = prevTotals || null;

    const revenue = Number(t.revenue);
    const costs = Number(t.costs);
    const profit = Number(t.profit);
    const marginPct = t.margin != null ? Number(t.margin) * 100 : null;

    const prevRevenue = p ? Number(p.revenue) : null;
    const prevCosts = p ? Number(p.costs) : null;
    const prevProfit = p ? Number(p.profit) : null;
    const prevMarginPct = p && p.margin != null ? Number(p.margin) * 100 : null;

    const idx = months.indexOf(endMonth);
    const prevMonth = idx >= 0 ? months[idx + 1] || "" : "";

    return {
      revenue: { v: revenue, ...calcDelta(revenue, prevRevenue) },
      costs: { v: costs, ...calcDelta(costs, prevCosts) },
      profit: { v: profit, ...calcDelta(profit, prevProfit) },
      margin: { v: marginPct, ...calcDelta(marginPct, prevMarginPct) },
      hasPrev: !!p,
      prevMonth,
    };
  }, [totals, prevTotals, months, endMonth]);

  const rightSlot = (
    <>
      <MonthRangePicker
        months={months}
        startMonth={startMonth}
        endMonth={endMonth}
        onChange={({ startMonth: s, endMonth: e }) => {
          setStartMonth(s);
          setEndMonth(e);
        }}
      />
      <button className="btn" onClick={() => location.assign("/reports")} style={{ position: "relative", paddingRight: 56 }}>
        Сформировать отчёт
        <span
          aria-hidden
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: "translateY(-50%)",
            width: 34,
            height: 18,
            borderRadius: 999,
            background: "rgba(255,255,255,0.34)",
            border: "1px solid rgba(255,255,255,0.52)",
            boxShadow: "0 10px 24px rgba(15,23,42,0.10)",
          }}
        >
          <span
            style={{
              position: "absolute",
              left: 17,
              top: 2,
              width: 14,
              height: 14,
              borderRadius: 999,
              background: "rgba(255,255,255,0.92)",
              boxShadow: "0 10px 18px rgba(15,23,42,0.18)",
            }}
          />
        </span>
      </button>
    </>
  );

  return (
    <DkrsAppShell title="AI помощник" subtitle="Диалог + анализ + генерация отчётов" rightSlot={rightSlot}>
      {/* Totals block */}
      <div className="glass strong" style={{ padding: 16, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                width: 20,
                height: 20,
                borderRadius: 999,
                background: "linear-gradient(135deg, rgba(20,184,166,1), rgba(52,211,153,0.9))",
                boxShadow: "0 12px 22px rgba(20,184,166,0.20)",
              }}
            />
            <div>
              <div style={{ fontWeight: 950, letterSpacing: "-0.02em", fontSize: 16 }}>Итоги за {endMonth || "—"}</div>
              <div className="dkrs-sub" style={{ marginTop: 4 }}>
                Сравнение с предыдущим месяцем (MoM)
                {computed.prevMonth ? <> • prev: <b>{computed.prevMonth}</b></> : null}
              </div>
            </div>
          </div>

          <span className="dkrs-pill" style={{ padding: "7px 12px", gap: 8 }}>
            <span className="dot" style={{ background: "rgba(148,163,184,0.9)" }} />
            Сравнение по планам • Звёздочки <span style={{ opacity: 0.7, marginLeft: 6 }}>▾</span>
          </span>
        </div>

        {err ? <div style={{ marginTop: 10, fontWeight: 900, color: "rgba(251,113,133,0.95)" }}>{err}</div> : null}

        <div className="refTable" style={{ marginTop: 12 }}>
          <div className="refHeadRow" role="row">
            <div className="refCell refIcon" role="columnheader" />
            <div className="refCell refLabel" role="columnheader">Показатель</div>
            <div className="refCell refValue" role="columnheader">Значение</div>
            <div className="refCell refMonth" role="columnheader">{endMonth || "—"}</div>
            <div className="refCell refDelta" role="columnheader">Δ</div>
            <div className="refCell refPct" role="columnheader">%</div>
            <div className="refCell refCode" role="columnheader" />
          </div>

          {loadingTotals ? (
            <div style={{ padding: 14, fontWeight: 900, color: "rgba(100,116,139,0.90)" }}>Загрузка…</div>
          ) : !totals ? (
            <div style={{ padding: 14, fontWeight: 900, color: "rgba(100,116,139,0.90)" }}>Нет данных</div>
          ) : (
            <>
              <TotalsRow
                tone="teal"
                label="Выручка"
                value={`${fmtMoney(computed.revenue.v)} ₽`}
                month={endMonth}
                deltaValue={
                  computed.hasPrev && computed.revenue.dv != null
                    ? `${computed.revenue.dv >= 0 ? "+" : "−"}${fmtMoney(Math.abs(computed.revenue.dv))}`
                    : null
                }
                deltaPct={
                  computed.hasPrev && computed.revenue.dp != null
                    ? `${computed.revenue.dp >= 0 ? "+" : "−"}${fmtPct(Math.abs(computed.revenue.dp))}`
                    : null
                }
                deltaTone={computed.hasPrev ? (computed.revenue.dv >= 0 ? "pos" : "neg") : "muted"}
              />

              <TotalsRow
                tone="violet"
                label="Расходы"
                value={`${fmtMoney(computed.costs.v)} ₽`}
                month={endMonth}
                deltaValue={
                  computed.hasPrev && computed.costs.dv != null
                    ? `${computed.costs.dv >= 0 ? "+" : "−"}${fmtMoney(Math.abs(computed.costs.dv))}`
                    : null
                }
                deltaPct={
                  computed.hasPrev && computed.costs.dp != null
                    ? `${computed.costs.dp >= 0 ? "+" : "−"}${fmtPct(Math.abs(computed.costs.dp))}`
                    : null
                }
                deltaTone={computed.hasPrev ? (computed.costs.dv <= 0 ? "pos" : "neg") : "muted"}
              />

              <TotalsRow
                tone="amber"
                label="Прибыль"
                value={`${fmtMoney(computed.profit.v)} ₽`}
                month={endMonth}
                deltaValue={
                  computed.hasPrev && computed.profit.dv != null
                    ? `${computed.profit.dv >= 0 ? "+" : "−"}${fmtMoney(Math.abs(computed.profit.dv))}`
                    : null
                }
                deltaPct={
                  computed.hasPrev && computed.profit.dp != null
                    ? `${computed.profit.dp >= 0 ? "+" : "−"}${fmtPct(Math.abs(computed.profit.dp))}`
                    : null
                }
                deltaTone={computed.hasPrev ? (computed.profit.dv >= 0 ? "pos" : "neg") : "muted"}
              />

              <TotalsRow
                tone="teal"
                label="Маржа"
                value={computed.margin.v == null ? "—" : fmtPct(computed.margin.v)}
                month={endMonth}
                deltaValue={
                  computed.hasPrev && computed.margin.dv != null
                    ? `${computed.margin.dv >= 0 ? "+" : "−"}${fmtPct(Math.abs(computed.margin.dv))}`
                    : null
                }
                deltaPct={null}
                deltaTone={computed.hasPrev ? (computed.margin.dv >= 0 ? "pos" : "neg") : "muted"}
              />
            </>
          )}
        </div>
      </div>

      {/* Chat widget (оставь как тебе нужно) */}
      <div className="glass strong" style={{ padding: 16 }}>
        {/* если у тебя виджет принимает только month — замени на month={endMonth} */}
        <AiAssistantWidget month={endMonth} />
      </div>

      {/* FIX: жёстко задаём grid через scoped styles, чтобы ничего не перебивало */}
      <style jsx>{`
        .refTable {
          border-radius: 22px;
          border: 1px solid rgba(148,163,184,0.22);
          background: rgba(255,255,255,0.58);
          box-shadow: 0 16px 40px rgba(15,23,42,0.08);
          overflow: hidden;
        }

        .refHeadRow, .refRow {
          display: grid !important;
          grid-template-columns: 34px minmax(180px, 1.2fr) minmax(160px, 0.8fr) minmax(90px, 0.55fr) minmax(140px, 0.7fr) minmax(90px, 0.55fr) minmax(70px, 0.55fr) !important;
          gap: 12px;
          align-items: center;
          padding: 12px 12px;
          min-width: 0;
        }

        .refHeadRow {
          font-size: 12px;
          font-weight: 900;
          color: rgba(100,116,139,0.90);
          background: linear-gradient(180deg, rgba(255,255,255,0.78), rgba(255,255,255,0.55));
          border-bottom: 1px solid rgba(148,163,184,0.20);
        }

        .refRow { border-bottom: 1px solid rgba(148,163,184,0.16); }
        .refRow:last-child { border-bottom: 0; }
        .refRow:hover { background: rgba(20,184,166,0.05); }

        .refCell {
          min-width: 0;
          display: flex;
          align-items: center;
        }

        .refIcon { justify-content: flex-start; }
        .refLabel { font-weight: 950; color: rgba(15,23,42,0.82); }
        .refValue, .refDelta, .refPct, .refCode {
          justify-content: flex-end;
          text-align: right;
          font-weight: 950;
          color: rgba(15,23,42,0.86);
          white-space: nowrap;
        }

        .refMonth {
          justify-content: flex-end;
          text-align: right;
          font-weight: 850;
          color: rgba(100,116,139,0.80);
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 12px;
          white-space: nowrap;
        }

        @media (max-width: 740px) {
          .refHeadRow, .refRow {
            grid-template-columns: 34px 1fr minmax(130px, 0.9fr) !important;
          }
          .refMonth, .refDelta, .refPct, .refCode { display: none; }
        }
      `}</style>
    </DkrsAppShell>
  );
}
