// pages/assistant.js
import React, { useEffect, useMemo, useState } from "react";
import DkrsAppShell from "../components/DkrsAppShell";
import AiAssistantWidget from "../components/AiAssistantWidget";
import MonthRangePicker from "../components/MonthRangePicker";
import { fetchJson } from "../lib/dkrsClient";
import { fmtMoney, fmtPct } from "../lib/format";

function MetricIcon({ tone }) {
  const color =
    tone === "teal"
      ? "linear-gradient(135deg, rgba(20,184,166,1), rgba(52,211,153,0.9))"
      : tone === "violet"
      ? "linear-gradient(135deg, rgba(167,139,250,1), rgba(196,181,253,0.9))"
      : tone === "amber"
      ? "linear-gradient(135deg, rgba(251,191,36,1), rgba(253,230,138,0.9))"
      : "linear-gradient(135deg, rgba(148,163,184,1), rgba(226,232,240,0.9))";

  return (
    <span
      style={{
        width: 22,
        height: 22,
        borderRadius: 999,
        background: color,
        boxShadow: "0 12px 24px rgba(15,23,42,0.14)",
        border: "1px solid rgba(255,255,255,0.75)",
        display: "inline-block",
      }}
      aria-hidden
    />
  );
}

function Row({
  tone,
  label,
  value,
  month,
  deltaValue,
  deltaPct,
  deltaTone, // "pos" | "neg" | "muted"
}) {
  const color =
    deltaTone === "pos"
      ? "rgba(20,184,166,0.95)"
      : deltaTone === "neg"
      ? "rgba(251,113,133,0.95)"
      : "rgba(100,116,139,0.85)";

  return (
    <div className="refRow">
      <div className="refCell icon">
        <MetricIcon tone={tone} />
      </div>
      <div className="refCell label">{label}</div>
      <div className="refCell value">{value}</div>
      <div className="refCell month">{month}</div>
      <div className="refCell delta" style={{ color }}>
        {deltaValue || "—"}
      </div>
      <div className="refCell pct" style={{ color }}>
        {deltaPct || "—"}
      </div>
      <div className="refCell code">—</div>
    </div>
  );
}

function calcDelta(cur, prev) {
  if (prev == null || cur == null) return { dv: null, dp: null };
  const c = Number(cur);
  const p = Number(prev);
  if (!Number.isFinite(c) || !Number.isFinite(p)) return { dv: null, dp: null };
  const dv = c - p;
  const dp = p !== 0 ? (dv / p) * 100 : null;
  return { dv, dp };
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

  // load totals for endMonth + prev month (MoM)
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

    return {
      revenue: { v: revenue, ...calcDelta(revenue, prevRevenue) },
      costs: { v: costs, ...calcDelta(costs, prevCosts) },
      profit: { v: profit, ...calcDelta(profit, prevProfit) },
      margin: { v: marginPct, ...calcDelta(marginPct, prevMarginPct) },
      hasPrev: !!p,
      prevMonth: (() => {
        const idx = months.indexOf(endMonth);
        return idx >= 0 ? months[idx + 1] || "" : "";
      })(),
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

      {/* реф-кнопка: зелёная + маленький toggle “внутри” */}
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
            background: "rgba(255,255,255,0.35)",
            border: "1px solid rgba(255,255,255,0.50)",
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
      {/* Banner — максимально близко к рефу */}
      <div className="glass strong refBanner" style={{ marginBottom: 14 }}>
        <div className="refBannerInner">
          <div className="refBannerLeft">
            <div className="refAvatar">
              <div className="refAvatarFace" />
            </div>

            <div style={{ minWidth: 0 }}>
              <div className="refHello">Здравствуйте!</div>
              <div className="refBullets">
                <div>• Попроси подвести итоги за период</div>
                <div>• Найду проблемы (маржа, штрафы, расходы)</div>
                <div>• Сформирую отчёт и рекомендации</div>
              </div>

              <div className="refPrompt">
                <div className="refPromptTitle">Подведи итог по всем проектам</div>
                <div className="refPromptSub">
                  Период: <b>{startMonth || "—"}</b> → <b>{endMonth || "—"}</b>
                  <br />
                  Покажи доходность и проблемные зоны.
                </div>
              </div>
            </div>
          </div>

          <div className="refBannerRight">
            {/* ВАЖНО: для 1-в-1 положи сюда PNG/WEBP робота из рефа */}
            <img className="refRobot" src="/robot-assistant.png" alt="AI Robot" />
            <div className="refStars" aria-hidden />
          </div>
        </div>
      </div>

      {/* Totals — табличный блок “как в рефе” */}
      <div className="glass strong" style={{ padding: 16, marginBottom: 14 }}>
        <div className="refTotalsHead">
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
              <div className="refTotalsTitle">Итоги за {endMonth || "—"}</div>
              <div className="dkrs-sub" style={{ marginTop: 4 }}>
                Сравнение с предыдущим месяцем (MoM)
                {computed.prevMonth ? <> • prev: <b>{computed.prevMonth}</b></> : null}
              </div>
            </div>
          </div>

          <span className="dkrs-pill" style={{ padding: "7px 12px", gap: 8 }}>
            <span className="dot" style={{ background: "rgba(148,163,184,0.9)" }} />
            Сравнение по % и по планам • Звёздочки
            <span style={{ opacity: 0.7, marginLeft: 6 }}>▾</span>
          </span>
        </div>

        {err ? <div style={{ marginTop: 10, fontWeight: 900, color: "rgba(251,113,133,0.95)" }}>{err}</div> : null}

        <div className="refTable" style={{ marginTop: 12 }}>
          <div className="refHeadRow">
            <div className="refCell icon" />
            <div className="refCell label">Показатель</div>
            <div className="refCell value">Значение</div>
            <div className="refCell month">{endMonth || "—"}</div>
            <div className="refCell delta">Δ</div>
            <div className="refCell pct">%</div>
            <div className="refCell code" />
          </div>

          {loadingTotals ? (
            <div style={{ padding: 14, fontWeight: 900, color: "rgba(100,116,139,0.90)" }}>Загрузка…</div>
          ) : !totals ? (
            <div style={{ padding: 14, fontWeight: 900, color: "rgba(100,116,139,0.90)" }}>Нет данных</div>
          ) : (
            <>
              <Row
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

              <Row
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
                // рост расходов — “плохо” (в рефе часто красным)
                deltaTone={computed.hasPrev ? (computed.costs.dv <= 0 ? "pos" : "neg") : "muted"}
              />

              <Row
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

              <Row
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

      {/* Assistant widget */}
      <div className="glass strong" style={{ padding: 16 }}>
        <AiAssistantWidget startMonth={startMonth} endMonth={endMonth} />
      </div>

      {/* local styles to match reference */}
      <style jsx>{`
        .refBanner {
          padding: 0;
          overflow: hidden;
        }
        .refBannerInner {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          align-items: stretch;
          gap: 0;
          min-height: 210px;
          background:
            radial-gradient(760px 260px at 35% 15%, rgba(167,139,250,0.30), transparent 62%),
            radial-gradient(760px 280px at 88% 62%, rgba(20,184,166,0.22), transparent 62%),
            radial-gradient(520px 260px at 92% 82%, rgba(52,211,153,0.14), transparent 62%),
            linear-gradient(180deg, rgba(255,255,255,0.78), rgba(255,255,255,0.52));
        }
        .refBannerLeft {
          display: flex;
          gap: 14px;
          padding: 18px 18px 18px 18px;
          min-width: 0;
        }
        .refAvatar {
          width: 56px;
          height: 56px;
          border-radius: 18px;
          border: 1px solid rgba(148,163,184,0.28);
          background:
            radial-gradient(22px 22px at 28% 28%, rgba(255,255,255,0.95), rgba(255,255,255,0.15)),
            linear-gradient(135deg, rgba(20,184,166,1), rgba(167,139,250,0.90));
          box-shadow: 0 18px 40px rgba(20,184,166,0.18);
          display: grid;
          place-items: center;
          flex: 0 0 auto;
        }
        .refAvatarFace {
          width: 34px;
          height: 24px;
          border-radius: 12px;
          background: linear-gradient(180deg, rgba(11,43,44,1), rgba(17,60,62,1));
          box-shadow: inset 0 0 0 2px rgba(255,255,255,0.10);
          position: relative;
        }
        .refAvatarFace:before,
        .refAvatarFace:after {
          content: "";
          position: absolute;
          top: 9px;
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: rgba(124,248,234,0.95);
          box-shadow: 0 10px 18px rgba(124,248,234,0.20);
        }
        .refAvatarFace:before { left: 9px; }
        .refAvatarFace:after { right: 9px; }

        .refHello {
          font-weight: 950;
          letter-spacing: -0.02em;
          font-size: 18px;
          color: rgba(15,23,42,0.86);
        }
        .refBullets {
          margin-top: 6px;
          color: rgba(100,116,139,0.90);
          font-weight: 700;
          font-size: 12px;
          line-height: 1.5;
        }
        .refPrompt {
          margin-top: 12px;
          border-radius: 18px;
          border: 1px solid rgba(148,163,184,0.22);
          background: rgba(255,255,255,0.62);
          box-shadow: 0 18px 44px rgba(15,23,42,0.08);
          padding: 14px;
          max-width: 640px;
          position: relative;
          overflow: hidden;
        }
        .refPrompt:after {
          content: "";
          position: absolute;
          right: -60px;
          top: -60px;
          width: 200px;
          height: 200px;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.55), rgba(255,255,255,0));
          transform: rotate(18deg);
          pointer-events: none;
        }
        .refPromptTitle {
          font-weight: 950;
          letter-spacing: -0.02em;
          color: rgba(15,23,42,0.84);
        }
        .refPromptSub {
          margin-top: 6px;
          color: rgba(100,116,139,0.92);
          font-weight: 700;
          font-size: 12px;
          line-height: 1.45;
        }

        .refBannerRight {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding: 10px 12px;
          overflow: hidden;
        }
        .refRobot {
          width: 280px;
          height: auto;
          filter: drop-shadow(0 26px 44px rgba(15,23,42,0.18));
          opacity: 0.98;
        }
        .refStars {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 86% 26%, rgba(255,255,255,0.9) 0 2px, transparent 3px),
            radial-gradient(circle at 78% 36%, rgba(255,255,255,0.7) 0 1px, transparent 2px),
            radial-gradient(circle at 90% 54%, rgba(255,255,255,0.8) 0 2px, transparent 3px),
            radial-gradient(circle at 74% 62%, rgba(255,255,255,0.6) 0 1px, transparent 2px),
            radial-gradient(circle at 88% 78%, rgba(255,255,255,0.7) 0 1px, transparent 2px);
          opacity: 0.35;
          pointer-events: none;
        }

        .refTotalsHead {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .refTotalsTitle {
          font-weight: 950;
          letter-spacing: -0.02em;
          font-size: 16px;
        }

        .refTable {
          border-radius: 22px;
          border: 1px solid rgba(148,163,184,0.22);
          background: rgba(255,255,255,0.58);
          box-shadow: 0 16px 40px rgba(15,23,42,0.08);
          overflow: hidden;
        }
        .refHeadRow,
        .refRow {
          display: grid;
          grid-template-columns: 34px 1.2fr 0.8fr 0.55fr 0.7fr 0.55fr 0.55fr;
          gap: 12px;
          align-items: center;
          padding: 12px 12px;
        }
        .refHeadRow {
          font-size: 12px;
          font-weight: 900;
          color: rgba(100,116,139,0.90);
          background: linear-gradient(180deg, rgba(255,255,255,0.78), rgba(255,255,255,0.55));
          border-bottom: 1px solid rgba(148,163,184,0.20);
        }
        .refRow {
          border-bottom: 1px solid rgba(148,163,184,0.16);
        }
        .refRow:last-child {
          border-bottom: 0;
        }
        .refCell.value,
        .refCell.delta,
        .refCell.pct,
        .refCell.code {
          text-align: right;
          font-weight: 950;
          color: rgba(15,23,42,0.86);
        }
        .refCell.label {
          font-weight: 950;
          color: rgba(15,23,42,0.82);
        }
        .refCell.month {
          text-align: right;
          font-weight: 850;
          color: rgba(100,116,139,0.80);
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 12px;
        }

        @media (max-width: 980px) {
          .refBannerInner {
            grid-template-columns: 1fr;
          }
          .refBannerRight {
            justify-content: center;
            padding-bottom: 16px;
          }
          .refRobot {
            width: 240px;
          }
        }

        @media (max-width: 740px) {
          .refHeadRow,
          .refRow {
            grid-template-columns: 34px 1fr 0.9fr;
          }
          .refCell.month,
          .refCell.delta,
          .refCell.pct,
          .refCell.code {
            display: none;
          }
        }
      `}</style>
    </DkrsAppShell>
  );
}
