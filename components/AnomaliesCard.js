// components/AnomaliesCard.js
import React, { useMemo, useState } from "react";

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

function sevRu(sev) {
  if (sev === "high") return "HIGH";
  if (sev === "medium") return "MEDIUM";
  return "LOW";
}

function sevDotClass(sev) {
  if (sev === "high") return "dkrs-dot-red";
  if (sev === "medium") return "dkrs-dot-yellow";
  return "dkrs-dot-green";
}

function maxSev(items) {
  if (items.some((x) => x.sev === "high")) return "high";
  if (items.some((x) => x.sev === "medium")) return "medium";
  return "low";
}

export default function AnomaliesCard({ projects, month }) {
  const [open, setOpen] = useState(false);

  const items = useMemo(() => {
    const list = Array.isArray(projects) ? projects : [];
    const out = [];

    for (const p of list) {
      const revenue = n(p.revenue);
      const costs = n(p.costs);
      const profit = n(p.profit);
      const margin = revenue > 0 ? profit / revenue : n(p.margin);

      const penalties = n(p.penalties);
      const ads = n(p.ads);
      const transport = n(p.transport);
      const sw = n(p.salary_workers);
      const team = n(p.team_payroll);

      const name = String(p.project_name || "—");

      if (profit < 0) {
        out.push({
          sev: "high",
          project: name,
          title: "Проект убыточный",
          detail: `Убыток: ${fmtMoney(profit)} • Маржа: ${fmtPct(margin)}`,
          score: 100 + Math.min(50, Math.abs(profit) / 10000),
        });
      }

      if (revenue > 0 && margin >= 0 && margin < 0.12) {
        out.push({
          sev: "medium",
          project: name,
          title: "Низкая маржа",
          detail: `Маржа: ${fmtPct(margin)} • Прибыль: ${fmtMoney(profit)}`,
          score: 70 + (0.12 - margin) * 200,
        });
      }

      if (revenue > 0 && costs / revenue >= 0.9) {
        out.push({
          sev: costs > revenue ? "high" : "medium",
          project: name,
          title: "Расходы съедают выручку",
          detail: `Расходы/выручка: ${fmtPct(costs / revenue)} • Расходы: ${fmtMoney(costs)}`,
          score: 85 + (costs / revenue) * 10,
        });
      }

      if (penalties > 0) {
        out.push({
          sev: penalties > 50000 ? "high" : "medium",
          project: name,
          title: "Есть штрафы",
          detail: `Штрафы: ${fmtMoney(penalties)} • Доля от выручки: ${revenue > 0 ? fmtPct(penalties / revenue) : "—"}`,
          score: 60 + Math.min(40, penalties / 2000),
        });
      }

      if (revenue > 0 && ads / revenue >= 0.18) {
        out.push({
          sev: ads / revenue >= 0.3 ? "high" : "medium",
          project: name,
          title: "Высокая доля рекламы",
          detail: `Реклама: ${fmtMoney(ads)} • Доля: ${fmtPct(ads / revenue)}`,
          score: 55 + (ads / revenue) * 80,
        });
      }

      if (revenue > 0 && transport / revenue >= 0.12) {
        out.push({
          sev: transport / revenue >= 0.2 ? "high" : "medium",
          project: name,
          title: "Высокие транспортные",
          detail: `Транспорт: ${fmtMoney(transport)} • Доля: ${fmtPct(transport / revenue)}`,
          score: 50 + (transport / revenue) * 70,
        });
      }

      const payroll = sw + team;
      if (revenue > 0 && payroll / revenue >= 0.45) {
        out.push({
          sev: payroll / revenue >= 0.6 ? "high" : "medium",
          project: name,
          title: "Высокий ФОТ относительно выручки",
          detail: `ФОТ: ${fmtMoney(payroll)} • Доля: ${fmtPct(payroll / revenue)}`,
          score: 58 + (payroll / revenue) * 60,
        });
      }
    }

    const uniq = [];
    const seen = new Set();
    for (const it of out) {
      const key = `${it.project}__${it.title}`;
      if (seen.has(key)) continue;
      seen.add(key);
      uniq.push(it);
    }

    uniq.sort((a, b) => (b.score || 0) - (a.score || 0));
    return uniq.slice(0, 8);
  }, [projects]);

  const severity = useMemo(() => (items.length ? maxSev(items) : "low"), [items]);

  return (
    <div>
      <button
        className="dkrs-anom-head"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open ? "true" : "false"}
      >
        <div className="dkrs-anom-left">
          <div className="dkrs-anom-title">
            Аномалии месяца <span className="dkrs-mono dkrs-anom-month">{month || ""}</span>
          </div>
          <div className="dkrs-small">
            {items.length ? `Найдено: ${items.length}` : "Аномалий не найдено"}
          </div>
        </div>

        <div className="dkrs-anom-right">
          <span className="dkrs-badge">
            <span className={`dkrs-dot ${sevDotClass(severity)}`} />
            {sevRu(severity)}
          </span>
          <span className="dkrs-mono" style={{ opacity: 0.75, fontWeight: 900 }}>
            {open ? "▲" : "▼"}
          </span>
        </div>
      </button>

      {open ? (
        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {items.length === 0 ? (
            <div className="dkrs-empty">Пока всё выглядит нормально (или данных мало).</div>
          ) : (
            items.map((it, idx) => (
              <div key={`${it.project}-${it.title}-${idx}`} className="dkrs-anom-item">
                <div className="dkrs-anom-item-top">
                  <div className="dkrs-anom-item-main">
                    <div className="dkrs-row-title" title={it.project}>{it.project}</div>
                    <div className="dkrs-row-sub">{it.title}</div>
                  </div>

                  <span className="dkrs-badge">
                    <span className={`dkrs-dot ${sevDotClass(it.sev)}`} />
                    {sevRu(it.sev)}
                  </span>
                </div>

                <div className="dkrs-mono" style={{ opacity: 0.9, marginTop: 8 }}>
                  {it.detail}
                </div>
              </div>
            ))
          )}

          <div className="dkrs-small" style={{ opacity: 0.55 }}>
            Правила MVP: убыток, низкая маржа, расходы≈выручка, штрафы, высокая доля рекламы/транспорта/ФОТ.
          </div>
        </div>
      ) : null}
    </div>
  );
}
