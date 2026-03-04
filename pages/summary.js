// pages/summary.js
import React, { useEffect, useState } from "react";
import DkrsAppShell from "../components/DkrsAppShell";
import TopProjectsCards from "../components/TopProjectsCards";
import AnomaliesCard from "../components/AnomaliesCard";
import { fetchJson, tryMany } from "../lib/dkrsClient";

function safeMonthFallback() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export default function SummaryPage() {
  const [months, setMonths] = useState([]);
  const [month, setMonth] = useState("");
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // months
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const m = await fetchJson("/api/months");
        const list = m?.months || [];
        if (!alive) return;
        setMonths(list);
        const defaultMonth = list?.[0] || list?.[list.length - 1] || safeMonthFallback();
        setMonth(String(defaultMonth));
      } catch {
        if (!alive) return;
        setMonths([]);
        setMonth(safeMonthFallback());
      }
    })();
    return () => (alive = false);
  }, []);

  // data
  useEffect(() => {
    if (!month) return;
    let alive = true;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const data = await tryMany([
          `/api/dashboard?month=${encodeURIComponent(month)}`,
          `/api/dashboard.js?month=${encodeURIComponent(month)}`,
        ]);
        if (!alive) return;
        if (!data?.ok) throw new Error(data?.error || "Dashboard API ok=false");
        setProjects(Array.isArray(data.projects) ? data.projects : []);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Не удалось загрузить сводку");
        setProjects([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => (alive = false);
  }, [month]);

  const rightSlot = (
    <>
      <span className="dkrs-pill">
        <span className="dot" style={{ background: "rgba(167,139,250,0.9)" }} />
        Период:&nbsp;<b>{month || "—"}</b>
      </span>

      <select className="select" value={month} onChange={(e) => setMonth(e.target.value)} style={{ width: 140 }}>
        {(months.length ? months : [month]).map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>

      <button className="btn" onClick={() => location.assign("/assistant")}>
        AI помощник
      </button>
    </>
  );

  return (
    <DkrsAppShell title="Сводка" subtitle="Топ-проекты и аномалии за период" rightSlot={rightSlot}>
      {err ? (
        <div className="glass strong" style={{ padding: 16, marginBottom: 14 }}>
          <div style={{ fontWeight: 900, color: "rgba(251,113,133,0.95)" }}>{err}</div>
        </div>
      ) : null}

      {/* Top-3 */}
      <div className="glass strong" style={{ padding: 16, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 900, letterSpacing: "-0.02em" }}>Топ-3 убыточных</div>
            <div className="dkrs-sub">Проекты с отрицательной прибылью за период</div>
          </div>
          <button className="btn ghost" onClick={() => setMonth(month)} disabled={loading}>
            Сбросить фильтры
          </button>
        </div>

        <div style={{ marginTop: 12 }}>
          <TopProjectsCards projects={projects} loading={loading} />
        </div>
      </div>

      {/* grid: Projects anomalies */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 0.9fr", gap: 14 }}>
        <div className="glass strong" style={{ padding: 16, minWidth: 0 }}>
          <div style={{ fontWeight: 900, letterSpacing: "-0.02em" }}>Аномалии</div>
          <div className="dkrs-sub">Штрафы, реклама, низкая маржа, отрицательная прибыль</div>
          <div style={{ marginTop: 12 }}>
            <AnomaliesCard projects={projects} loading={loading} />
          </div>
        </div>

        <div className="glass strong" style={{ padding: 16, minWidth: 0 }}>
          <div style={{ fontWeight: 900, letterSpacing: "-0.02em" }}>Подсказки</div>
          <div className="dkrs-sub">Быстрые вопросы для AI по текущему периоду</div>

          <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 10 }}>
            <button className="btn ghost" onClick={() => location.assign(`/assistant`)}>
              Подведи итоги за {month}
            </button>
            <button className="btn ghost" onClick={() => location.assign(`/assistant`)}>
              Где низкая маржа и почему?
            </button>
            <button className="btn ghost" onClick={() => location.assign(`/assistant`)}>
              Какие проекты убыточны и что делать?
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 1100px) {
          div[style*="grid-template-columns: 1fr 0.9fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </DkrsAppShell>
  );
}
