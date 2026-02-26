import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

function fmtMoney(n) {
  const x = Number(n || 0);
  return x.toLocaleString("ru-RU");
}
function fmtPct(n) {
  const x = Number(n || 0);
  return `${(x * 100).toFixed(1)}%`;
}
function riskRu(r) {
  if (r === "red") return "красный";
  if (r === "yellow") return "жёлтый";
  return "зелёный";
}

export default function DashboardPage() {
  const [months, setMonths] = useState([]);
  const [month, setMonth] = useState("");

  const [riskFilter, setRiskFilter] = useState("all"); // all | yellow_red | red | green
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load months
  useEffect(() => {
    (async () => {
      const r = await fetch("/api/months");
      const j = await r.json();

      // поддерживаем оба формата: {months:[...]} или просто [...]
      const list = j?.months || j || [];
      setMonths(list);
      setMonth(list?.[0] || "");
    })();
  }, []);

  // Load dashboard
  useEffect(() => {
    if (!month) return;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/dashboard?month=${encodeURIComponent(month)}`);
        const j = await r.json();
        setData(j);
      } finally {
        setLoading(false);
      }
    })();
  }, [month]);

  const filteredProjects = useMemo(() => {
    const p = data?.projects || [];
    if (riskFilter === "all") return p;
    if (riskFilter === "red") return p.filter((x) => x.risk_level === "red");
    if (riskFilter === "green") return p.filter((x) => x.risk_level === "green");
    return p.filter((x) => x.risk_level === "yellow" || x.risk_level === "red");
  }, [data, riskFilter]);

  // Sort: lowest margin first (как у тебя на скрине)
  const sortedProjects = useMemo(() => {
    return [...filteredProjects].sort((a, b) => (a.margin ?? 0) - (b.margin ?? 0));
  }, [filteredProjects]);

  const totals = data?.totals || null;
  const projectsCount = totals?.projects_count ?? (data?.projects ? data.projects.length : 0);

  return (
    <div className="crm-wrap">
      <div className="crm-top">
        <div className="crm-title">
          <h1>Дашборд</h1>
          <div className="sub">
            AI Finance CRM • {month ? `Период: ${month}` : "загрузка периода…"}
          </div>
        </div>

        <div className="crm-controls">
          <div className="select">
            <label>Месяц</label>
            <select value={month} onChange={(e) => setMonth(e.target.value)}>
              {months.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="pills" style={{ marginTop: 18 }}>
            <button className={`pill ${riskFilter === "all" ? "active" : ""}`} onClick={() => setRiskFilter("all")}>
              Все
            </button>
            <button
              className={`pill ${riskFilter === "yellow_red" ? "active" : ""}`}
              onClick={() => setRiskFilter("yellow_red")}
            >
              Жёлтые+красные
            </button>
            <button className={`pill ${riskFilter === "red" ? "active" : ""}`} onClick={() => setRiskFilter("red")}>
              Только красные
            </button>
            <button className={`pill ${riskFilter === "green" ? "active" : ""}`} onClick={() => setRiskFilter("green")}>
              Только зелёные
            </button>
          </div>

          <div className="actions" style={{ marginTop: 18 }}>
            <button
              className="btn primary"
              onClick={async () => {
                if (!month) return;
                await fetch(`/api/report?month=${encodeURIComponent(month)}`, { method: "POST" });
                window.location.href = "/reports";
              }}
            >
              Сгенерировать отчёт
            </button>

            <Link className="link" href="/reports">
              Отчёты →
            </Link>
          </div>
        </div>
      </div>

      {/* KPI */}
      <div className="kpi-grid">
        <div className="card kpi">
          <div className="label">Выручка</div>
          <div className="value mono">{totals ? fmtMoney(totals.revenue_no_vat) : "—"}</div>
          <div className="hint">без НДС</div>
        </div>

        <div className="card kpi">
          <div className="label">Расходы</div>
          <div className="value mono">{totals ? fmtMoney(totals.costs) : "—"}</div>
          <div className="hint">все затраты</div>
        </div>

        <div className="card kpi">
          <div className="label">Прибыль</div>
          <div className={`value mono ${totals && totals.profit < 0 ? "neg" : "pos"}`}>
            {totals ? fmtMoney(totals.profit) : "—"}
          </div>
          <div className="hint">выручка − расходы</div>
        </div>

        <div className="card kpi">
          <div className="label">Маржа</div>
          <div className="value mono">{totals ? fmtPct(totals.margin) : "—"}</div>
          <div className="hint">прибыль / выручка</div>
        </div>

        <div className="card kpi">
          <div className="label">Проектов</div>
          <div className="value mono">{totals ? projectsCount : "—"}</div>
          <div className="hint">{loading ? "обновляем…" : "в выбранном месяце"}</div>
        </div>
      </div>

      <div className="section-title">
        <h2>Проекты (сначала самые низкие по марже)</h2>
        <div className="small">
          Показано: <b>{sortedProjects.length}</b>
        </div>
      </div>

      <div className="table-wrap">
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Риск</th>
                <th>Проект</th>
                <th>Выручка</th>
                <th>Расходы</th>
                <th>Прибыль</th>
                <th>Маржа</th>
                <th>Штрафы</th>
                <th>Реклама</th>
                <th>ФОТ (рабочие)</th>
              </tr>
            </thead>

            <tbody>
              {sortedProjects.map((p, idx) => (
                <tr key={`${p.project_name}-${idx}`}>
                  <td>
                    <span className={`badge ${p.risk_level}`}>
                      <span className="dot" />
                      {riskRu(p.risk_level)}
                    </span>
                  </td>
                  <td className="strong">{p.project_name}</td>
                  <td className="num">{fmtMoney(p.revenue_no_vat)}</td>
                  <td className="num">{fmtMoney(p.costs)}</td>
                  <td className={`num strong ${p.profit < 0 ? "neg" : ""}`}>{fmtMoney(p.profit)}</td>
                  <td className="num">{fmtPct(p.margin)}</td>
                  <td className="num">{fmtMoney(p.penalties ?? 0)}</td>
                  <td className="num">{fmtMoney(p.ads ?? 0)}</td>
                  <td className="num">{fmtMoney(p.salary_workers ?? 0)}</td>
                </tr>
              ))}

              {sortedProjects.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: 16, color: "rgba(234,240,255,.65)" }}>
                    Нет данных (проверь месяц или фильтр).
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
