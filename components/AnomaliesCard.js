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

function sevStyle(sev) {
  if (sev === "high") return { bg: "rgba(239,68,68,.12)", border: "rgba(239,68,68,.35)", dot: "rgba(239,68,68,1)" };
  if (sev === "medium") return { bg: "rgba(250,173,20,.12)", border: "rgba(250,173,20,.35)", dot: "rgba(250,173,20,1)" };
  return { bg: "rgba(34,197,94,.12)", border: "rgba(34,197,94,.35)", dot: "rgba(34,197,94,1)" };
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

      // 1) Убыток
      if (profit < 0) {
        out.push({
          sev: "high",
          project: name,
          title: "Проект убыточный",
          detail: `Убыток: ${fmtMoney(profit)} • Маржа: ${fmtPct(margin)}`,
          score: 100 + Math.min(50, Math.abs(profit) / 10000),
        });
      }

      // 2) Низкая маржа
      if (revenue > 0 && margin >= 0 && margin < 0.12) {
        out.push({
          sev: "medium",
          project: name,
          title: "Низкая маржа",
          detail: `Маржа: ${fmtPct(margin)} • Прибыль: ${fmtMoney(profit)}`,
          score: 70 + (0.12 - margin) * 200,
        });
      }

      // 3) Расходы≈выручка
      if (revenue > 0 && costs / revenue >= 0.9) {
        out.push({
          sev: costs > revenue ? "high" : "medium",
          project: name,
          title: "Расходы съедают выручку",
          detail: `Расходы/выручка: ${fmtPct(costs / revenue)} • Расходы: ${fmtMoney(costs)}`,
          score: 85 + (costs / revenue) * 10,
        });
      }

      // 4) Штрафы
      if (penalties > 0) {
        out.push({
          sev: penalties > 50000 ? "high" : "medium",
          project: name,
          title: "Есть штрафы",
          detail: `Штрафы: ${fmtMoney(penalties)} • Доля от выручки: ${revenue > 0 ? fmtPct(penalties / revenue) : "—"}`,
          score: 60 + Math.min(40, penalties / 2000),
        });
      }

      // 5) Реклама доля
      if (revenue > 0 && ads / revenue >= 0.18) {
        out.push({
          sev: ads / revenue >= 0.3 ? "high" : "medium",
          project: name,
          title: "Высокая доля рекламы",
          detail: `Реклама: ${fmtMoney(ads)} • Доля: ${fmtPct(ads / revenue)}`,
          score: 55 + (ads / revenue) * 80,
        });
      }

      // 6) Транспорт доля
      if (revenue > 0 && transport / revenue >= 0.12) {
        out.push({
          sev: transport / revenue >= 0.2 ? "high" : "medium",
          project: name,
          title: "Высокие транспортные",
          detail: `Транспорт: ${fmtMoney(transport)} • Доля: ${fmtPct(transport / revenue)}`,
          score: 50 + (transport / revenue) * 70,
        });
      }

      // 7) ФОТ доля
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

    // uniq by project+title
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
  const st = useMemo(() => sevStyle(severity), [severity]);

  return (
    <div
      className="card"
      style={{
        background: "rgba(255,255,255,.03)",
        border: "1px solid rgba(255,255,255,.08)",
        borderRadius: 14,
        padding: 14,
        marginBottom: 12,
      }}
    >
      {/* HEADER (compact widget) */}
      <button
        className="btn"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          background: "transparent",
          border: "1px solid rgba(255,255,255,.08)",
          padding: "10px 12px",
          borderRadius: 12,
        }}
        aria-expanded={open ? "true" : "false"}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 15, display: "flex", gap: 10, alignItems: "center" }}>
            Аномалии месяца
            <span className="mono" style={{ opacity: 0.65, fontWeight: 700, fontSize: 12 }}>
              {month || ""}
            </span>
          </div>
          <div style={{ opacity: 0.7, fontSize: 12 }}>
            {items.length ? `Найдено: ${items.length}` : "Аномалий не найдено"}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 10px",
              borderRadius: 999,
              background: st.bg,
              border: `1px solid ${st.border}`,
              fontWeight: 900,
              color: "rgba(234,240,255,.95)",
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: 999, background: st.dot, display: "inline-block" }} />
            {sevRu(severity)}
          </span>

          <span className="mono" style={{ opacity: 0.7, fontWeight: 900 }}>
            {open ? "▲" : "▼"}
          </span>
        </div>
      </button>

      {/* BODY (collapsible) */}
      {open ? (
        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {items.length === 0 ? (
            <div style={{ opacity: 0.75, padding: "6px 2px" }}>
              Пока всё выглядит нормально (или данных мало).
            </div>
          ) : (
            items.map((it, idx) => {
              const itSt = sevStyle(it.sev);
              return (
                <div
                  key={`${it.project}-${it.title}-${idx}`}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    background: "rgba(0,0,0,.15)",
                    border: "1px solid rgba(255,255,255,.06)",
                  }}
                >
                  <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {it.project}
                      </div>
                      <div style={{ opacity: 0.75, marginTop: 2 }}>{it.title}</div>
                    </div>

                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 10px",
                        borderRadius: 999,
                        background: itSt.bg,
                        border: `1px solid ${itSt.border}`,
                        fontWeight: 900,
                        color: "rgba(234,240,255,.95)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: 999, background: itSt.dot, display: "inline-block" }} />
                      {sevRu(it.sev)}
                    </span>
                  </div>

                  <div style={{ marginTop: 8, opacity: 0.85 }} className="mono">
                    {it.detail}
                  </div>
                </div>
              );
            })
          )}

          <div style={{ opacity: 0.55, fontSize: 12 }}>
            Правила MVP: убыток, низкая маржа, расходы≈выручка, штрафы, высокая доля рекламы/транспорта/ФОТ.
          </div>
        </div>
      ) : null}
    </div>
  );
}
