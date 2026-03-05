import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DkrsAppShell from "../components/DkrsAppShell";
import RiskBadge from "../components/RiskBadge";
import AiFloatingButton from "../components/AiFloatingButton";

function fmtDateTime(dt) {
  if (!dt) return "—";
  return String(dt).replace("T", " ").slice(0, 16);
}

function preview(text, n = 180) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (!t) return "—";
  if (t.length <= n) return t;
  return t.slice(0, n).trimEnd() + "…";
}

function normalizeRisk(r) {
  const v = String(r || "").toLowerCase();
  if (v.includes("high") || v.includes("red") || v.includes("danger")) return "high";
  if (v.includes("med") || v.includes("yellow") || v.includes("warn")) return "medium";
  return "low";
}

function riskToInternal(r) {
  const n = normalizeRisk(r);
  if (n === "high") return "red";
  if (n === "medium") return "yellow";
  return "green";
}

export default function ReportsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [mounted, setMounted] = useState(false);
  const [q, setQ] = useState("");
  const [risk, setRisk] = useState("all");
  const [sort, setSort] = useState("created_desc");

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setErr("");
      try {
        const res = await fetch("/api/reports_list");
        const data = await res.json();
        if (!alive) return;
        if (!data?.ok) throw new Error(data?.error || "Ошибка загрузки");
        setItems(Array.isArray(data.items) ? data.items : []);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Не удалось загрузить отчёты");
        setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const riskCounts = useMemo(() => {
    const c = { all: 0, low: 0, medium: 0, high: 0 };
    items.forEach((x) => { c.all++; c[normalizeRisk(x.risk_level)]++; });
    return c;
  }, [items]);

  const view = useMemo(() => {
    let arr = [...items];
    if (q.trim()) {
      const qq = q.trim().toLowerCase();
      arr = arr.filter((x) => `${x.month} ${x.summary_text} ${x.id}`.toLowerCase().includes(qq));
    }
    if (risk !== "all") {
      arr = arr.filter((x) => normalizeRisk(x.risk_level) === risk);
    }
    const sorters = {
      created_desc: (a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")),
      created_asc: (a, b) => String(a.created_at || "").localeCompare(String(b.created_at || "")),
      month_desc: (a, b) => String(b.month || "").localeCompare(String(a.month || "")),
      month_asc: (a, b) => String(a.month || "").localeCompare(String(b.month || "")),
    };
    arr.sort(sorters[sort] || sorters.created_desc);
    return arr;
  }, [items, q, risk, sort]);

  return (
    <DkrsAppShell>
      <div className={`reports-page ${mounted ? "mounted" : ""}`}>
        <div className="reports-page-header">
          <div>
            <h1 className="reports-title">📄 Отчёты</h1>
            <p className="reports-subtitle">AI-отчёты по финансовым периодам</p>
          </div>
          <Link href="/assistant" className="reports-generate-btn">✨ Сформировать отчёт</Link>
        </div>

        <div className="reports-card glass-card">
          <div className="reports-controls">
            <div className="dashboard-search">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="dkrs-input"
                placeholder="Поиск по месяцу, тексту, ID..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <div className="dashboard-risk-filters">
              {[
                { key: "all", label: "Все" },
                { key: "low", label: "Низкий", color: "green" },
                { key: "medium", label: "Средний", color: "yellow" },
                { key: "high", label: "Высокий", color: "red" },
              ].map((f) => (
                <button
                  key={f.key}
                  className={`risk-filter-btn ${risk === f.key ? "active" : ""} ${f.color || ""}`}
                  onClick={() => setRisk(f.key)}
                >
                  {f.label} <span className="risk-count">{riskCounts[f.key]}</span>
                </button>
              ))}
            </div>

            <select className="dkrs-select" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="created_desc">Дата ↓</option>
              <option value="created_asc">Дата ↑</option>
              <option value="month_desc">Месяц ↓</option>
              <option value="month_asc">Месяц ↑</option>
            </select>
          </div>

          <div className="reports-list">
            {loading ? (
              <div className="centered-message"><div className="loader-spinner" /><span>Загрузка отчётов...</span></div>
            ) : err ? (
              <div className="centered-message error">{err}</div>
            ) : view.length === 0 ? (
              <div className="centered-message"><div style={{ fontSize: 40 }}>📭</div>Отчёты не найдены</div>
            ) : (
              view.map((r, i) => (
                <Link key={r.id} href={`/reports/${encodeURIComponent(r.id)}`} className="report-card-link">
                  <div className="report-card" style={{ animationDelay: `${i * 50}ms` }}>
                    <div className="report-card-top">
                      <div className="report-card-left">
                        <div className="report-card-icon">📊</div>
                        <div className="report-card-info">
                          <div className="report-card-title">Отчёт #{r.id}</div>
                          <div className="report-card-date">{fmtDateTime(r.created_at)}</div>
                        </div>
                      </div>
                      <div className="report-card-right">
                        <span className="report-month-pill">{r.month}</span>
                        <RiskBadge riskLevel={riskToInternal(r.risk_level)} />
                        <span className="report-card-arrow">→</span>
                      </div>
                    </div>
                    <div className="report-card-preview">{preview(r.summary_text, 200)}</div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
      <AiFloatingButton />
    </DkrsAppShell>
  );
}
