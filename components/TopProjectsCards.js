// components/TopProjectsCards.js
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
function riskDotClass(r) {
  if (r === "red") return "dkrs-dot-red";
  if (r === "yellow") return "dkrs-dot-yellow";
  return "dkrs-dot-green";
}

function Row({ p, kind }) {
  const profit = n(p.profit);
  const negative = profit < 0;

  return (
    <div
      className="dkrs-list-row"
      style={{
        gridTemplateColumns: "auto 1fr auto",
        gap: 12,
        padding: "12px 0",
      }}
    >
      <span className="dkrs-badge" style={{ justifySelf: "start" }}>
        <span className={`dkrs-dot ${riskDotClass(p.risk_level || "green")}`} />
        {riskRu(p.risk_level)}
      </span>

      <div className="dkrs-row-main" style={{ minWidth: 0 }}>
        <div
          className="dkrs-row-title"
          title={p.project_name || "—"}
          style={{
            fontSize: 14,
            lineHeight: 1.15,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {p.project_name || "—"}
        </div>

        <div className="dkrs-row-sub" style={{ marginTop: 4 }}>
          Выручка: <span className="dkrs-mono">{fmtMoney(p.revenue)}</span> • Маржа:{" "}
          <span className="dkrs-mono">{fmtPct(p.margin)}</span>
        </div>
      </div>

      <div className="dkrs-row-right" style={{ textAlign: "right" }}>
        <div
          className={`dkrs-mono ${negative ? "dkrs-delta-neg" : "dkrs-delta-pos"}`}
          style={{ fontWeight: 900, fontSize: 14, letterSpacing: "-0.01em" }}
        >
          {negative ? "−" : "+"}
          {fmtMoney(Math.abs(profit))}
        </div>
        <div className="dkrs-row-hint" style={{ marginTop: 4 }}>
          {kind === "profit" ? "прибыль" : "убыток"}
        </div>
      </div>
    </div>
  );
}

function Block({ title, month, accentDotClass, emptyText, rows, kind }) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(255,255,255,0.02)",
        borderRadius: 14,
        padding: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
        <div style={{ fontWeight: 900, fontSize: 14 }}>{title}</div>
        <span className="dkrs-badge">
          <span className={`dkrs-dot ${accentDotClass}`} />
          <span className="dkrs-mono">{month || ""}</span>
        </span>
      </div>

      <div style={{ marginTop: 10 }}>
        {rows.length ? (
          <div className="dkrs-list">
            {rows.map((p, i) => (
              <Row key={`${kind}-${p.project_name}-${i}`} p={p} kind={kind} />
            ))}
          </div>
        ) : (
          <div className="dkrs-empty">{emptyText}</div>
        )}
      </div>
    </div>
  );
}

/**
 * ВАЖНО:
 * Этот компонент теперь делает "как раньше":
 *  - 2 блока (прибыльные / убыточные) ВНУТРИ одной карточки
 *  - каждый блок имеет свой заголовок и нормальную ширину строки
 *  - цифры справа, названия не ломают сетку
 */
export default function TopProjectsCards({ projects, month }) {
  const list = Array.isArray(projects) ? projects : [];
  const hasAny = list.length > 0;

  const topProfit = useMemo(() => {
    return [...list].sort((a, b) => n(b.profit) - n(a.profit)).slice(0, 3);
  }, [list]);

  const topLoss = useMemo(() => {
    return [...list].sort((a, b) => n(a.profit) - n(b.profit)).slice(0, 3);
  }, [list]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {!hasAny ? (
        <div className="dkrs-empty">Нет данных по проектам.</div>
      ) : (
        <>
          <Block
            title="Топ-3 прибыльных"
            month={month}
            accentDotClass="dkrs-dot-green"
            emptyText="Нет прибыльных проектов."
            rows={topProfit}
            kind="profit"
          />

          <Block
            title="Топ-3 убыточных"
            month={month}
            accentDotClass="dkrs-dot-red"
            emptyText="Нет убыточных проектов."
            rows={topLoss}
            kind="loss"
          />
        </>
      )}
    </div>
  );
}
