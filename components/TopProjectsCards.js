import React, { useMemo } from "react";

function n(x) {
  const v = Number(x);
  return Number.isFinite(v) ? v : 0;
}

function fmtMoney(x) {
  return n(x).toLocaleString("ru-RU");
}
function fmtPct(x) {
  return `${(n(x) * 100).toFixed(1)}%`;
}

function riskRu(r) {
  if (r === "red") return "красный";
  if (r === "yellow") return "жёлтый";
  return "зелёный";
}

export default function TopProjectsCards({ projects, month }) {
  const list = Array.isArray(projects) ? projects : [];

  const topProfit = useMemo(() => {
    return [...list]
      .sort((a, b) => n(b.profit) - n(a.profit))
      .slice(0, 3);
  }, [list]);

  const topLoss = useMemo(() => {
    return [...list]
      .sort((a, b) => n(a.profit) - n(b.profit)) // самые отрицательные сверху
      .slice(0, 3);
  }, [list]);

  const hasAny = list.length > 0;

  function Row({ p, kind }) {
    const profit = n(p.profit);
    const negative = profit < 0;

    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          gap: 10,
          alignItems: "center",
          padding: "10px 0",
          borderTop: "1px solid rgba(255,255,255,.06)",
        }}
      >
        <span className={`badge ${p.risk_level || "green"}`} style={{ justifySelf: "start" }}>
          <span className="dot" />
          {riskRu(p.risk_level)}
        </span>

        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {p.project_name || "—"}
          </div>
          <div style={{ opacity: 0.65, fontSize: 12, marginTop: 2 }}>
            Выручка: <span className="mono">{fmtMoney(p.revenue)}</span> • Маржа:{" "}
            <span className="mono">{fmtPct(p.margin)}</span>
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div
            className="mono"
            style={{
              fontWeight: 900,
              color: negative ? "rgba(239,68,68,.95)" : "rgba(34,197,94,.95)",
            }}
          >
            {negative ? "−" : "+"}{fmtMoney(Math.abs(profit))}
          </div>
          <div style={{ opacity: 0.55, fontSize: 12 }}>
            {kind === "profit" ? "прибыль" : "убыток"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
      <div
        className="card"
        style={{
          background: "rgba(255,255,255,.03)",
          border: "1px solid rgba(255,255,255,.08)",
          borderRadius: 14,
          padding: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>Топ-3 прибыльных</div>
          <div style={{ opacity: 0.6, fontSize: 12 }} className="mono">{month || ""}</div>
        </div>

        {!hasAny ? (
          <div style={{ marginTop: 10, opacity: 0.75 }}>Нет данных по проектам.</div>
        ) : topProfit.length ? (
          <div style={{ marginTop: 8 }}>
            {topProfit.map((p, i) => (
              <Row key={`tp-${p.project_name}-${i}`} p={p} kind="profit" />
            ))}
          </div>
        ) : (
          <div style={{ marginTop: 10, opacity: 0.75 }}>Нет прибыльных проектов.</div>
        )}
      </div>

      <div
        className="card"
        style={{
          background: "rgba(255,255,255,.03)",
          border: "1px solid rgba(255,255,255,.08)",
          borderRadius: 14,
          padding: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>Топ-3 убыточных</div>
          <div style={{ opacity: 0.6, fontSize: 12 }} className="mono">{month || ""}</div>
        </div>

        {!hasAny ? (
          <div style={{ marginTop: 10, opacity: 0.75 }}>Нет данных по проектам.</div>
        ) : topLoss.length ? (
          <div style={{ marginTop: 8 }}>
            {topLoss.map((p, i) => (
              <Row key={`tl-${p.project_name}-${i}`} p={p} kind="loss" />
            ))}
          </div>
        ) : (
          <div style={{ marginTop: 10, opacity: 0.75 }}>Нет убыточных проектов.</div>
        )}
      </div>
    </div>
  );
}
