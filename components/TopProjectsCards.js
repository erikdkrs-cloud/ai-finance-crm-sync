// components/TopProjectsCards.js
import React, { useMemo } from "react";
import { fmtMoney } from "../lib/format";

function RowIcon({ tone = "teal" }) {
  const bg =
    tone === "rose"
      ? "linear-gradient(135deg, rgba(251,113,133,0.95), rgba(167,139,250,0.65))"
      : tone === "amber"
      ? "linear-gradient(135deg, rgba(251,191,36,0.95), rgba(20,184,166,0.65))"
      : "linear-gradient(135deg, rgba(20,184,166,0.95), rgba(52,211,153,0.75))";

  return (
    <div
      style={{
        width: 34,
        height: 34,
        borderRadius: 14,
        border: "1px solid rgba(148,163,184,0.28)",
        background: "rgba(255,255,255,0.70)",
        boxShadow: "0 10px 24px rgba(15,23,42,0.06)",
        display: "grid",
        placeItems: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: 8,
          background: bg,
          boxShadow: "0 14px 28px rgba(20,184,166,0.18)",
        }}
      />
    </div>
  );
}

function CardRow({ name, sub, value, valueTone = "pos" }) {
  const color =
    valueTone === "neg"
      ? "rgba(251,113,133,0.95)"
      : valueTone === "warn"
      ? "rgba(251,191,36,0.95)"
      : "rgba(20,184,166,0.95)";

  return (
    <div
      style={{
        borderRadius: 18,
        border: "1px solid rgba(148,163,184,0.22)",
        background: "rgba(255,255,255,0.58)",
        boxShadow: "0 14px 34px rgba(15,23,42,0.08)",
        padding: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <RowIcon tone={valueTone === "neg" ? "rose" : valueTone === "warn" ? "amber" : "teal"} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 900, letterSpacing: "-0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {name}
          </div>
          <div className="dkrs-sub" style={{ marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {sub}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "0 0 auto" }}>
        <div style={{ fontWeight: 950, color }}>{value}</div>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 14,
            border: "1px solid rgba(148,163,184,0.22)",
            background: "rgba(255,255,255,0.64)",
            display: "grid",
            placeItems: "center",
            boxShadow: "0 10px 24px rgba(15,23,42,0.06)",
            color: "rgba(100,116,139,0.9)",
            fontWeight: 900,
          }}
        >
          ›
        </div>
      </div>
    </div>
  );
}

export default function TopProjectsCards({ projects = [] }) {
  const topLoss = useMemo(() => {
    const list = Array.isArray(projects) ? projects : [];
    return list
      .filter((p) => Number(p.revenue) > 0) // чтобы не тащить пустые
      .sort((a, b) => (Number(a.profit) || 0) - (Number(b.profit) || 0))
      .slice(0, 4); // в рефе визуально 2х2, но заголовок Top-3 — покажем до 4 красивее
  }, [projects]);

  // Разбиваем на 2 колонки как в референсе
  const left = topLoss.filter((_, i) => i % 2 === 0);
  const right = topLoss.filter((_, i) => i % 2 === 1);

  if (!topLoss.length) {
    return <div className="dkrs-sub">Нет убыточных проектов за период.</div>;
  }

  const render = (p) => {
    const profit = Number(p.profit || 0);
    const margin = Number(p.margin || 0) * 100;
    const tone = profit < 0 ? "neg" : margin < 20 ? "warn" : "pos";

    return (
      <CardRow
        key={p.project}
        name={p.project}
        sub={`Выручка: ${fmtMoney(p.revenue)} • Маржа: ${margin.toFixed(2).replace(".", ",")}%`}
        value={`${profit < 0 ? "−" : "+"}${fmtMoney(Math.abs(profit))}`}
        valueTone={tone}
      />
    );
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <div style={{ display: "grid", gap: 10 }}>{left.map(render)}</div>
      <div style={{ display: "grid", gap: 10 }}>{right.map(render)}</div>

      <style jsx>{`
        @media (max-width: 980px) {
          div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
