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
      aria-hidden
      style={{
        width: 20,
        height: 20,
        borderRadius: 999,
        background: bg,
        boxShadow: "0 14px 26px rgba(15,23,42,0.12)",
        border: "1px solid rgba(255,255,255,0.75)",
        display: "inline-block",
      }}
    />
  );
}

function cellStyle(alignRight = false, mono = false) {
  return {
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: alignRight ? "flex-end" : "flex-start",
    textAlign: alignRight ? "right" : "left",
    whiteSpace: "nowrap",
    fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' : undefined,
  };
}

function TotalsRow({ tone, label, value, month, deltaValue, deltaPct, deltaTone, isMobile }) {
  const color =
    deltaTone === "pos"
      ? "rgba(20,184,166,0.95)"
      : deltaTone === "neg"
      ? "rgba(251,113,133,0.95)"
      : "rgba(100,116,139,0.85)";

  const rowGrid = isMobile
    ? "34px 1fr minmax(130px, 0.9fr)"
    : "34px minmax(180px, 1.2fr) minmax(160px, 0.8fr) minmax(90px, 0.55fr) minmax(140px, 0.7fr) minmax(90px, 0.55fr) minmax(70px, 0.55fr)";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: rowGrid,
        gap: 12,
        alignItems: "center",
        padding: "12px 12px",
        borderBottom: "1px solid rgba(148,163,184,0.16)",
      }}
    >
      <div style={cellStyle(false)}><MetricDot tone={tone} /></div>
      <div style={{ ...cellStyle(false), fontWeight: 950, color: "rgba(15,23,42,0.82)" }}>{label}</div>
      <div style={{ ...cellStyle(true), fontWeight: 950, color: "rgba(15,23,42,0.86)" }}>{value}</div>

      {!isMobile ? (
        <>
          <div style={{ ...cellStyle(true, true), fontWeight: 850, color: "rgba(100,116,139,0.80)", fontSize: 12 }}>{month}</div>
          <div style={{ ...cellStyle(true), fontWeight: 950, color }}>{deltaValue || "—"}</div>
          <div style={{ ...cellStyle(true), fontWeight: 950, color }}>{deltaPct || "—"}</div>
          <div style={{ ...cellStyle(true), fontWeight: 850, color: "rgba(100,116,139,0.75)" }}>—</div>
        </>
      ) : null}
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

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 740);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // months
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

  // totals end + prev
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
      {/* ✅ Баннер возвращаем (робот справа) */}
      <div className="glass strong" style={{ padding: 0, overflow: "hidden", marginBottom: 14 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.15fr 0.85fr",
            alignItems: "stretch",
            minHeight: 220,
            background:
              "radial-gradient(820px 280px at 35% 12%, rgba(167,139,250,0.34), transparent 62%)," +
              "radial-gradient(900px 320px at 88% 62%, rgba(20,184,166,0.22), transparent 62%)," +
              "radial-gradient(680px 320px at 92% 86%, rgba(52,211,153,0.14), transparent 62%)," +
              "linear-gradient(180deg, rgba(255,255,255,0.80), rgba(255,255,255,0.54))",
          }}
        >
          <div style={{ display: "flex", gap: 14, padding: 18, minWidth: 0 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 18,
                border: "1px solid rgba(148,163,184,0.26)",
                background:
                  "radial-gradient(22px 22px at 28% 28%, rgba(255,255,255,0.95), rgba(255,255,255,0.15))," +
                  "linear-gradient(135deg, rgba(20,184,166,1), rgba(167,139,250,0.90))",
                boxShadow: "0 18px 40px rgba(20,184,166,0.18)",
                display: "grid",
                placeItems: "center",
                flex: "0 0 auto",
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 24,
                  borderRadius: 12,
                  background: "linear-gradient(180deg, rgba(11,43,44,1), rgba(17,60,62,1))",
                  boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.10)",
                  position: "relative",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 9,
                    left: 9,
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: "rgba(124,248,234,0.95)",
                    boxShadow: "0 10px 18px rgba(124,248,234,0.20)",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    top: 9,
                    right: 9,
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: "rgba(124,248,234,0.95)",
                    boxShadow: "0 10px 18px rgba(124,248,234,0.20)",
                  }}
                />
              </div>
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 950, letterSpacing: "-0.02em", fontSize: 18, color: "rgba(15,23,42,0.86)" }}>
                Здравствуйте!
              </div>
              <div style={{ marginTop: 6, color: "rgba(100,116,139,0.90)", fontWeight: 750, fontSize: 12, lineHeight: 1.5 }}>
                <div>• Попроси подвести итоги за период</div>
                <div>• Найду проблемы (маржа, штрафы, расходы)</div>
                <div>• Сформирую отчёт и рекомендации</div>
              </div>

              <div
                style={{
                  marginTop: 12,
                  borderRadius: 18,
                  border: "1px solid rgba(148,163,184,0.22)",
                  background: "rgba(255,255,255,0.64)",
                  boxShadow: "0 18px 44px rgba(15,23,42,0.08)",
                  padding: 14,
                  maxWidth: 660,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div style={{ fontWeight: 950, letterSpacing: "-0.02em", color: "rgba(15,23,42,0.84)" }}>
                  Подведи итог по всем проектам
                </div>
                <div style={{ marginTop: 6, color: "rgba(100,116,139,0.92)", fontWeight: 750, fontSize: 12, lineHeight: 1.45 }}>
                  Период: <b>{startMonth || "—"}</b> → <b>{endMonth || "—"}</b>
                  <br />
                  Покажи доходность и проблемные зоны.
                </div>
              </div>
            </div>
          </div>

          <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "flex-end", overflow: "hidden" }}>
            {/* glow */}
            <div style={{ position: "absolute", right: -80, bottom: -70, width: 320, height: 320, borderRadius: 999, filter: "blur(10px)", background: "radial-gradient(circle, rgba(20,184,166,0.32), transparent 68%)" }} />
            <div style={{ position: "absolute", right: 40, top: -90, width: 340, height: 340, borderRadius: 999, filter: "blur(10px)", background: "radial-gradient(circle, rgba(167,139,250,0.28), transparent 70%)" }} />
            <div style={{ position: "absolute", right: 10, bottom: 40, width: 260, height: 260, borderRadius: 999, filter: "blur(10px)", background: "radial-gradient(circle, rgba(52,211,153,0.16), transparent 70%)" }} />

            {/* stars */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "radial-gradient(circle at 86% 26%, rgba(255,255,255,0.9) 0 2px, transparent 3px)," +
                  "radial-gradient(circle at 78% 36%, rgba(255,255,255,0.7) 0 1px, transparent 2px)," +
                  "radial-gradient(circle at 90% 54%, rgba(255,255,255,0.8) 0 2px, transparent 3px)," +
                  "radial-gradient(circle at 74% 62%, rgba(255,255,255,0.6) 0 1px, transparent 2px)," +
                  "radial-gradient(circle at 88% 78%, rgba(255,255,255,0.7) 0 1px, transparent 2px)",
                opacity: 0.38,
                pointerEvents: "none",
              }}
            />

            {/* ✅ робот */}
            <img
              src="/robot-assistant.png"
              alt="AI Robot"
              style={{
                width: 308,
                height: "auto",
                transform: "translateX(18px)",
                filter: "drop-shadow(0 26px 44px rgba(15,23,42,0.18))",
                opacity: 0.98,
                position: "relative",
                zIndex: 2,
                userSelect: "none",
                WebkitUserDrag: "none",
                marginRight: 6,
              }}
              onError={(e) => {
                // если вдруг путь неверный — покажет в консоли, но страницу не сломает
                // eslint-disable-next-line no-console
                console.warn("Robot image not found at /robot-assistant.png");
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
        </div>

        <style jsx>{`
          @media (max-width: 980px) {
            div[style*="grid-template-columns: 1.15fr 0.85fr"] {
              grid-template-columns: 1fr !important;
            }
            img[alt="AI Robot"] {
              width: 270px !important;
              transform: none !important;
              margin: 0 auto 14px !important;
            }
          }
        `}</style>
      </div>

      {/* ✅ Итоги (таблица) — grid inline, не ломается */}
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

        <div
          style={{
            marginTop: 12,
            borderRadius: 22,
            border: "1px solid rgba(148,163,184,0.22)",
            background: "rgba(255,255,255,0.58)",
            boxShadow: "0 16px 40px rgba(15,23,42,0.08)",
            overflow: "hidden",
          }}
        >
          {/* header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "34px 1fr minmax(130px, 0.9fr)"
                : "34px minmax(180px, 1.2fr) minmax(160px, 0.8fr) minmax(90px, 0.55fr) minmax(140px, 0.7fr) minmax(90px, 0.55fr) minmax(70px, 0.55fr)",
              gap: 12,
              alignItems: "center",
              padding: "12px 12px",
              fontSize: 12,
              fontWeight: 900,
              color: "rgba(100,116,139,0.90)",
              background: "linear-gradient(180deg, rgba(255,255,255,0.78), rgba(255,255,255,0.55))",
              borderBottom: "1px solid rgba(148,163,184,0.20)",
            }}
          >
            <div />
            <div>Показатель</div>
            <div style={{ textAlign: "right" }}>Значение</div>
            {!isMobile ? (
              <>
                <div style={{ textAlign: "right" }}>{endMonth || "—"}</div>
                <div style={{ textAlign: "right" }}>Δ</div>
                <div style={{ textAlign: "right" }}>%</div>
                <div />
              </>
            ) : null}
          </div>

          {loadingTotals ? (
            <div style={{ padding: 14, fontWeight: 900, color: "rgba(100,116,139,0.90)" }}>Загрузка…</div>
          ) : !totals ? (
            <div style={{ padding: 14, fontWeight: 900, color: "rgba(100,116,139,0.90)" }}>Нет данных</div>
          ) : (
            <>
              <TotalsRow
                isMobile={isMobile}
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
                isMobile={isMobile}
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
                isMobile={isMobile}
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
                isMobile={isMobile}
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

              {/* убираем нижнюю границу у последней строки визуально */}
              <div style={{ height: 1, background: "transparent" }} />
            </>
          )}
        </div>
      </div>

      {/* AI widget */}
      <div className="glass strong" style={{ padding: 16 }}>
        <AiAssistantWidget month={endMonth} />
      </div>
    </DkrsAppShell>
  );
}
