// pages/reports.js
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DkrsAppShell from "../components/DkrsAppShell";
import RiskBadge from "../components/RiskBadge";
import { fetchJson } from "../lib/dkrsClient";

function fmtDateTime(dt) {
  if (!dt) return "—";
  return String(dt).replace("T", " ").slice(0, 16);
}

function preview(text, n = 170) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (!t) return "—";
  if (t.length <= n) return t;
  return t.slice(0, n).trimEnd() + "…";
}

function MonthPill({ month }) {
  return (
    <span className="dkrs-pill" style={{ padding: "7px 10px", gap: 8 }}>
      <span className="dot" style={{ background: "rgba(167,139,250,0.9)" }} />
      <span style={{ fontWeight: 950, fontSize: 12 }}>{month}</span>
    </span>
  );
}

function normalizeRisk(r) {
  const v = String(r || "").toLowerCase();
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
  const [sort, setSort] = useState("created_desc");

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
    return () => (alive = false);
  }, []);

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
    <DkrsAppShell
      title="Отчёты"
      subtitle="Список AI отчётов по периодам"
      rightSlot={
        <>
          <input
            className="input"
            style={{ width: 280 }}
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 950, letterSpacing: "-0.02em" }}>Список отчётов</div>
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

        {/* “Cards list” like reference */}
        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {loading ? (
            <div className="dkrs-sub" style={{ fontWeight: 900 }}>Загрузка…</div>
          ) : err ? (
            <div style={{ fontWeight: 900, color: "rgba(251,113,133,0.95)" }}>{err}</div>
          ) : view.length === 0 ? (
            <div className="dkrs-sub" style={{ fontWeight: 900 }}>Ничего не найдено</div>
          ) : (
            view.map((r) => (
              <Link
                key={r.id}
                href={`/reports/${encodeURIComponent(r.id)}`}
                style={{ display: "block" }}
              >
                <div
                  style={{
                    borderRadius: 18,
                    border: "1px solid rgba(148,163,184,0.22)",
                    background: "rgba(255,255,255,0.58)",
                    boxShadow: "0 14px 34px rgba(15,23,42,0.08)",
                    padding: 12,
                    transition: "transform .14s ease, background .14s ease, border-color .14s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.background = "rgba(255,255,255,0.66)";
                    e.currentTarget.style.borderColor = "rgba(20,184,166,0.22)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0px)";
                    e.currentTarget.style.background = "rgba(255,255,255,0.58)";
                    e.currentTarget.style.borderColor = "rgba(148,163,184,0.22)";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 16,
                          border: "1px solid rgba(148,163,184,0.28)",
                          background:
                            "radial-gradient(18px 18px at 30% 30%, rgba(255,255,255,0.95), rgba(255,255,255,0.15))," +
                            "linear-gradient(135deg, rgba(20,184,166,1), rgba(167,139,250,0.90))",
                          boxShadow: "0 14px 28px rgba(20,184,166,0.18)",
                        }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 950, letterSpacing: "-0.02em" }}>
                          Отчёт #{r.id}
                        </div>
                        <div className="dkrs-sub" style={{ marginTop: 4 }}>
                          {fmtDateTime(r.created_at)}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <MonthPill month={r.month} />
                      <RiskBadge risk={r.risk_level} />
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 14,
                          border: "1px solid rgba(148,163,184,0.22)",
                          background: "rgba(255,255,255,0.64)",
                          display: "grid",
                          placeItems: "center",
                          boxShadow: "0 10px 24px rgba(15,23,42,0.06)",
                          color: "rgba(100,116,139,0.9)",
                          fontWeight: 900,
                        }}
                        aria-hidden
                      >
                        →
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      borderRadius: 16,
                      border: "1px solid rgba(148,163,184,0.18)",
                      background: "rgba(255,255,255,0.52)",
                      padding: 10,
                    }}
                  >
                    <div className="dkrs-sub" style={{ marginTop: 0 }}>
                      {preview(r.summary_text, 210)}
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </DkrsAppShell>
  );
}
