// pages/reports.js
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DkrsAppShell from "../components/DkrsAppShell";

function normalizeRisk(r) {
  if (!r) return "green";
  const s = String(r).toLowerCase();
  if (s.includes("red") || s.includes("крас")) return "red";
  if (s.includes("yellow") || s.includes("жел")) return "yellow";
  return "green";
}

function riskRu(r) {
  if (r === "red") return "красный";
  if (r === "yellow") return "жёлтый";
  return "зелёный";
}

export default function ReportsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");
  const [riskFilter, setRiskFilter] = useState("all"); // all|green|yellow|red

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      try {
        // ✅ твой текущий endpoint
        const r = await fetch("/api/reports_list");
        const t = await r.text();
        let j = null;
        try {
          j = JSON.parse(t);
        } catch {
          j = null;
        }

        if (!r.ok) {
          setErr(t.slice(0, 800));
          setItems([]);
          return;
        }

        // ожидаем: { ok:true, items:[...] } или просто массив
        const list = j?.items || j?.reports || j || [];
        setItems(Array.isArray(list) ? list : []);
      } catch (e) {
        setErr(String(e?.message || e));
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();

    let list = items.map((x) => {
      const risk = normalizeRisk(x?.risk_level || x?.risk || x?.riskLevel);
      return { ...x, _risk: risk };
    });

    if (riskFilter !== "all") list = list.filter((x) => x._risk === riskFilter);

    if (qq) {
      list = list.filter((x) => {
        const period = String(x?.month || x?.period || x?.period_month || "");
        const summary = String(x?.summary_text || x?.summary || x?.short || x?.kpi_text || "");
        const created = String(x?.created_at || x?.created || "");
        return (
          period.toLowerCase().includes(qq) ||
          summary.toLowerCase().includes(qq) ||
          created.toLowerCase().includes(qq) ||
          String(x?.id || "").toLowerCase().includes(qq)
        );
      });
    }

    return list;
  }, [items, q, riskFilter]);

  const count = filtered.length;

  const right = (
    <>
      <span className="dkrs-badge">
        <span className="dkrs-dot dkrs-dot-green" />
        Найдено: <span className="dkrs-mono">{count}</span>
      </span>

      <Link href="/dashboard" legacyBehavior>
        <a className="dkrs-btn dkrs-btn-ghost">Дашборд →</a>
      </Link>
    </>
  );

  return (
    <DkrsAppShell
      title="Отчёты"
      subtitle="AI отчёты по периодам: риски, метрики и рекомендации"
      right={right}
    >
      {/* Filters */}
      <div className="dkrs-card" style={{ marginBottom: 14 }}>
        <div className="dkrs-card-body">
          <div className="dkrs-controls" style={{ gridTemplateColumns: "1fr 1fr auto" }}>
            <div className="dkrs-field">
              <div className="dkrs-field-label">Поиск</div>
              <input
                className="dkrs-input"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder='например: 2026-01 или "штрафы"...'
              />
            </div>

            <div>
              <div className="dkrs-field-label">Риск</div>
              <div className="dkrs-pills">
                <button className={`dkrs-pill ${riskFilter === "all" ? "dkrs-pill-active" : ""}`} onClick={() => setRiskFilter("all")}>Все</button>
                <button className={`dkrs-pill ${riskFilter === "green" ? "dkrs-pill-active" : ""}`} onClick={() => setRiskFilter("green")}>Зелёные</button>
                <button className={`dkrs-pill ${riskFilter === "yellow" ? "dkrs-pill-active" : ""}`} onClick={() => setRiskFilter("yellow")}>Жёлтые</button>
                <button className={`dkrs-pill ${riskFilter === "red" ? "dkrs-pill-active" : ""}`} onClick={() => setRiskFilter("red")}>Красные</button>
              </div>
            </div>

            <div className="dkrs-actions">
              <button className="dkrs-btn dkrs-btn-ghost" onClick={() => { setQ(""); setRiskFilter("all"); }}>
                Сбросить
              </button>
            </div>
          </div>

          {err ? (
            <div className="dkrs-ai-error" style={{ marginTop: 10 }}>
              Ошибка: {err}
            </div>
          ) : null}
        </div>
      </div>

      {/* List */}
      <div className="dkrs-card">
        <div className="dkrs-card-header">
          <div>
            <div className="dkrs-card-title">Список отчётов</div>
            <div className="dkrs-small">Открой отчёт, чтобы увидеть summary, issues и metrics.</div>
          </div>
          <span className="dkrs-badge">
            <span className="dkrs-dot dkrs-dot-green" />
            Enterprise view
          </span>
        </div>

        <div className="dkrs-card-body" style={{ padding: 0 }}>
          <div style={{ overflowX: "auto" }}>
            <table className="dkrs-table">
              <thead>
                <tr>
                  <th>Период</th>
                  <th>Риск</th>
                  <th>Создан</th>
                  <th>Кратко</th>
                  <th style={{ textAlign: "right" }}>Открыть</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="dkrs-row">
                      <td><div className="dkrs-skel dkrs-skel-line" style={{ width: 70 }} /></td>
                      <td><div className="dkrs-skel dkrs-skel-line" style={{ width: 90 }} /></td>
                      <td><div className="dkrs-skel dkrs-skel-line" style={{ width: 160 }} /></td>
                      <td><div className="dkrs-skel dkrs-skel-line" style={{ width: 520 }} /></td>
                      <td style={{ textAlign: "right" }}><div className="dkrs-skel dkrs-skel-line" style={{ width: 70 }} /></td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 16, color: "rgba(255,255,255,0.65)" }}>
                      Нет отчётов по текущим фильтрам.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r, idx) => {
                    const id = r?.id ?? r?.report_id ?? r?._id ?? idx;
                    const month = r?.month || r?.period || r?.period_month || "—";
                    const created = r?.created_at || r?.created || "";
                    const risk = normalizeRisk(r?.risk_level || r?.risk || r?.riskLevel);
                    const short =
                      String(r?.summary_text || r?.summary || r?.short || "")
                        .replace(/\s+/g, " ")
                        .trim()
                        .slice(0, 140) + (String(r?.summary_text || r?.summary || r?.short || "").length > 140 ? "…" : "");

                    const dotClass = risk === "red" ? "dkrs-dot-red" : risk === "yellow" ? "dkrs-dot-yellow" : "dkrs-dot-green";

                    return (
                      <tr key={String(id)} className="dkrs-row">
                        <td className="dkrs-strong">{month}</td>
                        <td>
                          <span className="dkrs-badge">
                            <span className={`dkrs-dot ${dotClass}`} />
                            {riskRu(risk)}
                          </span>
                        </td>
                        <td className="dkrs-mono">{created ? String(created).replace("T", ", ").slice(0, 19) : "—"}</td>
                        <td style={{ maxWidth: 720, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {short || "—"}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <Link href={`/reports/${id}`} legacyBehavior>
                            <a className="dkrs-btn dkrs-btn-ghost">Open</a>
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DkrsAppShell>
  );
}
