// components/AnomaliesCard.js
import React, { useMemo } from "react";
import { fmtMoney } from "../lib/format";
import RiskBadge from "./RiskBadge";

function Row({ title, subtitle, value, badgeRisk }) {
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
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 900, letterSpacing: "-0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {title}
        </div>
        <div className="dkrs-sub" style={{ marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {subtitle}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "0 0 auto" }}>
        <div style={{ fontWeight: 950, color: "rgba(100,116,139,0.95)" }}>{value}</div>
        {badgeRisk ? <RiskBadge risk={badgeRisk} /> : null}
      </div>
    </div>
  );
}

export default function AnomaliesCard({ projects = [] }) {
  const items = useMemo(() => {
    const list = Array.isArray(projects) ? projects : [];

    // простые правила аномалий по твоим полям:
    // - penalties > 0
    // - ads заметные
    // - margin < 0.20 при revenue > 0
    // - profit < 0
    const out = [];

    // 1) top penalties
    const pen = [...list]
      .filter((p) => Number(p.penalties) > 0)
      .sort((a, b) => (Number(b.penalties) || 0) - (Number(a.penalties) || 0))
      .slice(0, 2);

    pen.forEach((p) => {
      out.push({
        key: `pen-${p.project}`,
        title: p.project,
        subtitle: "Штрафы за период",
        value: `${fmtMoney(p.penalties)} ₽`,
        risk: "yellow",
      });
    });

    // 2) top ads
    const ads = [...list]
      .filter((p) => Number(p.ads) > 0)
      .sort((a, b) => (Number(b.ads) || 0) - (Number(a.ads) || 0))
      .slice(0, 2);

    ads.forEach((p) => {
      out.push({
        key: `ads-${p.project}`,
        title: p.project,
        subtitle: "Высокие расходы на рекламу",
        value: `${fmtMoney(p.ads)} ₽`,
        risk: "green",
      });
    });

    // 3) low margin
    const lowMargin = [...list]
      .filter((p) => Number(p.revenue) > 0)
      .filter((p) => Number(p.margin) < 0.2)
      .sort((a, b) => (Number(a.margin) || 0) - (Number(b.margin) || 0))
      .slice(0, 2);

    lowMargin.forEach((p) => {
      out.push({
        key: `m-${p.project}`,
        title: p.project,
        subtitle: "Низкая маржинальность",
        value: `${(Number(p.margin) * 100).toFixed(2).replace(".", ",")}%`,
        risk: Number(p.margin) < 0.1 ? "red" : "yellow",
      });
    });

    // 4) loss
    const loss = [...list]
      .filter((p) => Number(p.profit) < 0)
      .sort((a, b) => (Number(a.profit) || 0) - (Number(b.profit) || 0))
      .slice(0, 2);

    loss.forEach((p) => {
      out.push({
        key: `loss-${p.project}`,
        title: p.project,
        subtitle: "Отрицательная прибыль",
        value: `−${fmtMoney(Math.abs(Number(p.profit || 0)))} ₽`,
        risk: "red",
      });
    });

    // uniq by key and limit like a neat card
    const seen = new Set();
    const uniq = [];
    for (const x of out) {
      if (seen.has(x.key)) continue;
      seen.add(x.key);
      uniq.push(x);
      if (uniq.length >= 6) break;
    }

    return uniq;
  }, [projects]);

  if (!items.length) {
    return <div className="dkrs-sub">Аномалии не найдены — всё выглядит стабильно.</div>;
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {items.map((it) => (
        <Row
          key={it.key}
          title={it.title}
          subtitle={it.subtitle}
          value={it.value}
          badgeRisk={it.risk}
        />
      ))}
    </div>
  );
}
