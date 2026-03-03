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
    <div className="dkrs-list-row">
      <span className="dkrs-badge">
        <span className={`dkrs-dot ${riskDotClass(p.risk_level || "green")}`} />
        {riskRu(p.risk_level)}
      </span>

      <div className="dkrs-row-main">
        <div className="dkrs-row-title" title={p.project_name || "—"}>
          {p.project_name || "—"}
        </div>
        <div className="dkrs-row-sub">
          Выручка: <span className="dkrs-mono">{fmtMoney(p.revenue)}</span> • Маржа:{" "}
          <span className="dkrs-mono">{fmtPct(p.margin)}</span>
        </div>
      </div>

      <div className="dkrs-row-right">
        <div className={`dkrs-mono dkrs-row-profit ${negative ? "dkrs-delta-neg" : "dkrs-delta-pos"}`}>
          {negative ? "−" : "+"}
          {fmtMoney(Math.abs(profit))}
        </div>
        <div className="dkrs-row-hint">{kind === "profit" ? "прибыль" : "убыток"}</div>
      </div>
    </div>
  );
}

export default function TopProjectsCards({ projects, month }) {
  const list = Array.isArray(projects) ? projects : [];

  const topProfit = useMemo(() => {
    return [...list].sort((a, b) => n(b.profit) - n(a.profit)).slice(0, 3);
  }, [list]);

  const topLoss = useMemo(() => {
    return [...list].sort((a, b) => n(a.profit) - n(b.profit)).slice(0, 3);
  }, [list]);

  const hasAny = list.length > 0;

  return (
    <div className="dkrs-grid dkrs-grid-2" style={{ margin: 0 }}>
      <div className="dkrs-card">
        <div className="dkrs-card-header">
          <div className="dkrs-card-title">Топ-3 прибыльных</div>
          <span className="dkrs-badge">
            <span className="dkrs-dot dkrs-dot-green" />
            <span className="dkrs-mono">{month || ""}</span>
          </span>
        </div>

        <div className="dkrs-card-body" style={{ paddingTop: 10 }}>
          {!hasAny ? (
            <div className="dkrs-empty">Нет данных по проектам.</div>
          ) : topProfit.length ? (
            <div className="dkrs-list">
              {topProfit.map((p, i) => (
                <Row key={`tp-${p.project_name}-${i}`} p={p} kind="profit" />
              ))}
            </div>
          ) : (
            <div className="dkrs-empty">Нет прибыльных проектов.</div>
          )}
        </div>
      </div>

      <div className="dkrs-card">
        <div className="dkrs-card-header">
          <div className="dkrs-card-title">Топ-3 убыточных</div>
          <span className="dkrs-badge">
            <span className="dkrs-dot dkrs-dot-red" />
            <span className="dkrs-mono">{month || ""}</span>
          </span>
        </div>

        <div className="dkrs-card-body" style={{ paddingTop: 10 }}>
          {!hasAny ? (
            <div className="dkrs-empty">Нет данных по проектам.</div>
          ) : topLoss.length ? (
            <div className="dkrs-list">
              {topLoss.map((p, i) => (
                <Row key={`tl-${p.project_name}-${i}`} p={p} kind="loss" />
              ))}
            </div>
          ) : (
            <div className="dkrs-empty">Нет убыточных проектов.</div>
          )}
        </div>
      </div>
    </div>
  );
}
