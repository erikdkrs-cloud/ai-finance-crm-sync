// pages/reports.js
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DkrsAppShell from "../components/DkrsAppShell";
import RiskBadge from "../components/RiskBadge";
import { fetchJson } from "../lib/dkrsClient";

function fmtDateTime(dt) {
  if (!dt) return "—";
  const s = String(dt);
  // Neon often returns ISO string
  // Show "YYYY-MM-DD HH:mm"
  return s.replace("T", " ").slice(0, 16);
}

function preview(text, n = 140) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (!t) return "—";
  if (t.length <= n) return t;
  return t.slice(0, n).trimEnd() + "…";
}

function normalizeRisk(r) {
  const v = String(r || "").toLowerCase();
  // поддержим старые "green/yellow/red" и новые "low/medium/high"
  if (v.includes("high") || v.includes("red") || v.includes("danger")) return "high";
  if (v.includes("med") || v.includes("yellow") || v.includes("warn")) return "medium";
  return "low";
}

export default function ReportsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");
  const [risk, setRisk] = useState("all");
  const [sort, setSort] = useState("created_desc"); // created_desc | created_asc | month_desc | month_asc

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const data = await fetchJson("/api/reports_list");
        if (!alive) return;
        if (!data?.ok) throw new Error(data?.error || "reports_list ok=false");
        setItems(Array.isArray(data.items) ? data.items : []);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Не удалось загрузить отчёты");
        setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const view = useMemo(() => {
    let arr = [...items];

    if (q.trim()) {
      const qq = q.trim().toLowerCase();
      arr = arr.filter((x) => {
        const hay = `${x.month} ${x.summary_text} ${x.id}`.toLowerCase();
        return hay.includes(qq);
      });
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
    <DkrsAppShell
      title="Отчёты"
      subtitle="Список AI отчётов по периодам"
      rightSlot={
        <>
          <input
            className="input"
            style={{ width: 260 }}
            placeholder="Поиск по summary / месяцу / id…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="btn" onClick={() => location.assign("/assistant")}>
            Сформировать отчёт
          </button>
        </>
      }
    >
      <div className="glass strong" style={{ padding: 16 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontWeight: 900, letterSpacing: "-0.02em" }}>Список отчётов</div>
            <div className="dkrs-sub" style={{ marginTop: 6 }}>
              Поиск • фильтр риска • сортировка • светлый glass UI
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <select className="select" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="created_desc">Дата ↓</option>
              <option value="created_asc">Дата ↑</option>
              <option value="month_desc">Месяц ↓</option>
              <option value="month_asc">Месяц ↑</option>
            </select>

            <select className="select" value={risk} onChange={(e) => setRisk(e.target.value)}>
              <option value="all">Все риски</option>
              <option value="low">LOW</option>
              <option value="medium">MED</option>
              <option value="high">HIGH</option>
            </select>
          </div>
        </div>

        <div className="tableWrap" style={{ marginTop: 12 }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 70 }}>ID</th>
                <th style={{ width: 110 }}>Месяц</th>
                <th>Summary</th>
                <th style={{ width: 140 }}>Риск</th>
                <th style={{ width: 170 }}>Создан</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ color: "rgba(100,116,139,0.9)", fontWeight: 800 }}>
                    Загрузка…
                  </td>
                </tr>
              ) : err ? (
                <tr>
                  <td colSpan={5} style={{ color: "rgba(251,113,133,0.95)", fontWeight: 900 }}>
                    {err}
                  </td>
                </tr>
              ) : view.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ color: "rgba(100,116,139,0.9)", fontWeight: 800 }}>
                    Ничего не найдено
                  </td>
                </tr>
              ) : (
                view.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 950 }}>
                      <Link href={`/reports/${encodeURIComponent(r.id)}`}>{r.id}</Link>
                    </td>
                    <td style={{ fontWeight: 900 }}>{r.month}</td>
                    <td>
                      <Link
                        href={`/reports/${encodeURIComponent(r.id)}`}
                        style={{ fontWeight: 900, display: "inline-block", marginBottom: 4 }}
                      >
                        Открыть отчёт →
                      </Link>
                      <div className="dkrs-sub" style={{ marginTop: 0 }}>
                        {preview(r.summary_text, 160)}
                      </div>
                    </td>
                    <td>
                      <RiskBadge risk={r.risk_level} />
                    </td>
                    <td style={{ color: "rgba(100,116,139,0.95)", fontWeight: 900 }}>
                      {fmtDateTime(r.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DkrsAppShell>
  );
}
