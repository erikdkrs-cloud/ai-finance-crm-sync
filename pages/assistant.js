// pages/assistant.js
import React, { useEffect, useMemo, useState } from "react";
import DkrsAppShell from "../components/DkrsAppShell";
import AiAssistantWidget from "../components/AiAssistantWidget";
import MonthRangePicker from "../components/MonthRangePicker";
import { fetchJson } from "../lib/dkrsClient";
import { fmtMoney, fmtPct } from "../lib/format";

function StatRow({ label, value, deltaValue, deltaPct, positiveHint }) {
  const pos = positiveHint === true;
  const neg = positiveHint === false;

  const deltaColor = neg
    ? "rgba(251,113,133,0.95)"
    : pos
    ? "rgba(20,184,166,0.95)"
    : "rgba(100,116,139,0.90)";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "28px 1.15fr 0.85fr 0.85fr 0.85fr",
        gap: 12,
        alignItems: "center",
        padding: "12px 10px",
        borderBottom: "1px solid rgba(148,163,184,0.18)",
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 10,
          border: "1px solid rgba(148,163,184,0.26)",
          background: "rgba(255,255,255,0.70)",
          boxShadow: "0 10px 24px rgba(15,23,42,0.06)",
        }}
      />
      <div style={{ fontWeight: 900, color: "rgba(15,23,42,0.82)" }}>{label}</div>
      <div style={{ fontWeight: 900, textAlign: "right" }}>{value}</div>

      <div style={{ fontWeight: 900, textAlign: "right", color: deltaColor }}>
        {deltaValue || "—"}
      </div>
      <div style={{ fontWeight: 900, textAlign: "right", color: deltaColor }}>
        {deltaPct || "—"}
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

  // load months
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const m = await fetchJson("/api/months");
        const list = m?.months || [];
        if (!alive) return;

        setMonths(list);

        // default like “range” in ref: start older, end newer
        const end = list?.[0] || "";
        const start = list?.[Math.min(list.length - 1, 5)] || end;

        setStartMonth(start);
        setEndMonth(end);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Не удалось загрузить месяцы");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // load totals for endMonth + previous month for MoM
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

        // prev month in DESC list: next index
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

    return () => {
      alive = false;
    };
  }, [endMonth, months]);

  const computed = useMemo(() => {
    const t = totals || {};
    const p = prevTotals || null;

    function delta(cur, prev) {
      if (!p) return { dv: null, dp: null };
      const c = Number(cur);
      const pr = Number(prev);
      if (!Number.isFinite(c) || !Number.isFinite(pr)) return { dv: null, dp: null };
      const dv = c - pr;
      const dp = pr !== 0 ? (dv / pr) * 100 : null;
      return { dv, dp };
    }

    const revenue = Number(t.revenue);
    const costs = Number(t.costs);
    const profit = Number(t.profit);
    const marginPct = t.margin != null ? Number(t.margin) * 100 : null;

    const prevRevenue = p ? Number(p.revenue) : null;
    const prevCosts = p ? Number(p.costs) : null;
    const prevProfit = p ? Number(p.profit) : null;
    const prevMarginPct = p && p.margin != null ? Number(p.margin) * 100 : null;

    return {
      revenue: {
        v: revenue,
        ...delta(revenue, prevRevenue),
      },
      costs: {
        v: costs,
        ...delta(costs, prevCosts),
      },
      profit: {
        v: profit,
        ...delta(profit, prevProfit),
      },
      margin: {
        v: marginPct,
        ...delta(marginPct, prevMarginPct),
      },
    };
  }, [totals, prevTotals]);

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
      <button className="btn" onClick={() => location.assign("/reports")}>
        Сформировать отчёт
      </button>
    </>
  );

  return (
    <DkrsAppShell
      title="AI помощник"
      subtitle="Диалог + анализ + генерация отчётов"
      rightSlot={rightSlot}
    >
      {/* Banner like reference */}
      <div className="glass strong" style={{ padding: 0, overflow: "hidden", marginBottom: 14 }}>
        <div
          style={{
            position: "relative",
            padding: 18,
            minHeight: 190,
            display: "grid",
            gridTemplateColumns: "1.35fr 0.65fr",
            gap: 12,
            alignItems: "center",
            background:
              "radial-gradient(520px 240px at 20% 20%, rgba(167,139,250,0.35), transparent 60%)," +
              "radial-gradient(520px 240px at 80% 70%, rgba(20,184,166,0.22), transparent 62%)," +
              "linear-gradient(180deg, rgba(255,255,255,0.65), rgba(255,255,255,0.45))",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 16,
                  background:
                    "radial-gradient(18px 18px at 30% 30%, rgba(255,255,255,0.95), rgba(255,255,255,0.15))," +
                    "linear-gradient(135deg, rgba(20,184,166,1), rgba(167,139,250,0.90))",
                  boxShadow: "0 14px 28px rgba(20,184,166,0.18)",
                  border: "1px solid rgba(148,163,184,0.30)",
                }}
              />
              <div style={{ fontWeight: 950, letterSpacing: "-0.02em" }}>Здравствуйте!</div>
            </div>

            <div className="dkrs-sub" style={{ maxWidth: 560 }}>
              • Попроси подвести итоги за период<br />
              • Найду проблемы (маржа, штрафы, расходы)<br />
              • Сформирую отчёт и рекомендации
            </div>

            <div
              style={{
                marginTop: 14,
                borderRadius: 18,
                border: "1px solid rgba(148,163,184,0.26)",
                background: "rgba(255,255,255,0.60)",
                boxShadow: "0 14px 34px rgba(15,23,42,0.08)",
                padding: 14,
                maxWidth: 680,
              }}
            >
              <div style={{ fontWeight: 900, letterSpacing: "-0.02em" }}>
                Подведи итог по всем проектам
              </div>
              <div className="dkrs-sub" style={{ marginTop: 6 }}>
                Период: <b>{startMonth || "—"}</b> → <b>{endMonth || "—"}</b><br />
                Покажи доходность и проблемные зоны.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <img
              src="/robot-assistant.svg"
              alt="AI Assistant"
              style={{
                width: 220,
                height: "auto",
                filter: "drop-shadow(0 24px 40px rgba(15,23,42,0.18))",
              }}
            />
          </div>
        </div>
      </div>

      {/* Totals block like reference */}
      <div className="glass strong" style={{ padding: 16, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 900, letterSpacing: "-0.02em" }}>
              Итоги за {endMonth || "—"}
            </div>
            <div className="dkrs-sub" style={{ marginTop: 6 }}>
              Сравнение с предыдущим месяцем (MoM)
            </div>
          </div>

          {err ? (
            <div style={{ fontWeight: 900, color: "rgba(251,113,133,0.95)" }}>{err}</div>
          ) : null}
        </div>

        <div
          style={{
            marginTop: 12,
            borderRadius: 22,
            border: "1px solid rgba(148,163,184,0.26)",
            background: "rgba(255,255,255,0.58)",
            boxShadow: "0 14px 34px rgba(15,23,42,0.08)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "28px 1.15fr 0.85fr 0.85fr 0.85fr",
              gap: 12,
              padding: "12px 10px",
              color: "rgba(15,23,42,0.55)",
              fontWeight: 900,
              fontSize: 12,
              borderBottom: "1px solid rgba(148,163,184,0.20)",
              background: "linear-gradient(180deg, rgba(255,255,255,0.75), rgba(255,255,255,0.55))",
            }}
          >
            <div />
            <div>Показатель</div>
            <div style={{ textAlign: "right" }}>Значение</div>
            <div style={{ textAlign: "right" }}>Δ</div>
            <div style={{ textAlign: "right" }}>%</div>
          </div>

          {loadingTotals ? (
            <div style={{ padding: 14, fontWeight: 900, color: "rgba(100,116,139,0.90)" }}>
              Загрузка…
            </div>
          ) : !totals ? (
            <div style={{ padding: 14, fontWeight: 900, color: "rgba(100,116,139,0.90)" }}>
              Нет данных
            </div>
          ) : (
            <>
              <StatRow
                label="Выручка"
                value={`${fmtMoney(computed.revenue.v)} ₽`}
                deltaValue={
                  prevTotals ? `${computed.revenue.dv >= 0 ? "+" : "−"}${fmtMoney(Math.abs(computed.revenue.dv))}` : null
                }
                deltaPct={
                  prevTotals && computed.revenue.dp != null
                    ? `${computed.revenue.dp >= 0 ? "+" : "−"}${fmtPct(Math.abs(computed.revenue.dp))}`
                    : null
                }
                positiveHint={prevTotals ? computed.revenue.dv >= 0 : null}
              />
              <StatRow
                label="Расходы"
                value={`${fmtMoney(computed.costs.v)} ₽`}
                deltaValue={
                  prevTotals ? `${computed.costs.dv >= 0 ? "+" : "−"}${fmtMoney(Math.abs(computed.costs.dv))}` : null
                }
                deltaPct={
                  prevTotals && computed.costs.dp != null
                    ? `${computed.costs.dp >= 0 ? "+" : "−"}${fmtPct(Math.abs(computed.costs.dp))}`
                    : null
                }
                // рост расходов — это “плохо”, поэтому инвертируем подсказку
                positiveHint={prevTotals ? computed.costs.dv <= 0 : null}
              />
              <StatRow
                label="Прибыль"
                value={`${fmtMoney(computed.profit.v)} ₽`}
                deltaValue={
                  prevTotals ? `${computed.profit.dv >= 0 ? "+" : "−"}${fmtMoney(Math.abs(computed.profit.dv))}` : null
                }
                deltaPct={
                  prevTotals && computed.profit.dp != null
                    ? `${computed.profit.dp >= 0 ? "+" : "−"}${fmtPct(Math.abs(computed.profit.dp))}`
                    : null
                }
                positiveHint={prevTotals ? computed.profit.dv >= 0 : null}
              />
              <StatRow
                label="Маржа"
                value={computed.margin.v == null ? "—" : fmtPct(computed.margin.v)}
                deltaValue={
                  prevTotals && computed.margin.dv != null
                    ? `${computed.margin.dv >= 0 ? "+" : "−"}${fmtPct(Math.abs(computed.margin.dv))}`
                    : null
                }
                deltaPct={null}
                positiveHint={prevTotals ? computed.margin.dv >= 0 : null}
              />
            </>
          )}
        </div>

        <style jsx>{`
          @media (max-width: 980px) {
            div[style*="grid-template-columns: 1.35fr 0.65fr"] {
              grid-template-columns: 1fr !important;
            }
            img {
              width: 200px !important;
            }
          }
          @media (max-width: 720px) {
            /* hide delta columns on small screens for clean enterprise look */
            div[style*="grid-template-columns: 28px 1.15fr 0.85fr 0.85fr 0.85fr"],
            div[style*="gridTemplateColumns: 28px 1.15fr 0.85fr 0.85fr 0.85fr"] {
              grid-template-columns: 28px 1fr 0.9fr !important;
            }
            div[style*="grid-template-columns: 28px 1.15fr 0.85fr 0.85fr 0.85fr"] > div:nth-child(4),
            div[style*="grid-template-columns: 28px 1.15fr 0.85fr 0.85fr 0.85fr"] > div:nth-child(5) {
              display: none;
            }
          }
        `}</style>
      </div>

      {/* Assistant widget */}
      <div className="glass strong" style={{ padding: 16 }}>
        <AiAssistantWidget startMonth={startMonth} endMonth={endMonth} />
      </div>
    </DkrsAppShell>
  );
}
