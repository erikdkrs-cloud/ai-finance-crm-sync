// pages/reports.js
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DkrsShell from "../components/DkrsShell";

function n(x) {
  const v = Number(x);
  return Number.isFinite(v) ? v : 0;
}

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
function riskDot(r) {
  if (r === "red") return "dkrs-dot-red";
  if (r === "yellow") return "dkrs-dot-yellow";
  return "dkrs-dot-green";
}

function fmtDateTime(x) {
  try {
    const d = new Date(x);
    if (Number.isNaN(d.getTime())) return String(x || "");
    return d.toLocaleString("ru-RU");
  } catch {
    return String(x || "");
  }
}

async function fetchJsonAny(urls) {
  let lastText = "";
  for (const url of urls) {
    try {
      const r = await fetch(url);
      const t = await r.text();
      lastText = t;
      let j = null;
      try {
        j = JSON.parse(t);
      } catch {
        j = null;
      }
      if (r.ok && j) return { ok: true, json: j, url };
      // if ok but not json — still return text error
      if (!r.ok) continue;
    } catch {}
  }
  return { ok: false, error: lastText || "Не удалось загрузить отчёты." };
}

function normalizeList(payload) {
  // Accept many shapes:
  // {ok:true, reports:[...]}
  // {reports:[...]}
  // [...]
  const list =
    (payload && payload.reports) ||
    (payload && payload.items) ||
    (Array.isArray(payload) ? payload : null) ||
    [];
  return Array.isArray(list) ? list : [];
}

export default function ReportsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // filters
  const [q, setQ] = useState("");
  const [risk, setRisk] = useState("all"); // all|green|yellow|red

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");

      const res = await fetchJsonAny([
        "/api/reports_list",
        "/api/reports",
        "/api/report_get?mode=list",
      ]);

      if (!res.ok) {
        setErr(String(res.error || "Ошибка").slice(0, 900));
        setItems([]);
        setLoading(false);
        return;
      }

      const payload = res.json?.ok ? res.json : res.json;
      const list = normalizeList(payload);
      setItems(list);
      setLoading(false);
    })();
  }, []);

  const normalized = useMemo(() => {
    return (items || []).map((it) => {
      const id = it?.id ?? it?.report_id ?? it?.reportId ?? it?.uuid ?? "";
      const month = it?.month ?? it?.period ?? it?.period_month ?? it?.periodMonth ?? it?.period_id ?? it?.periodId ?? "";
      const risk_level = normalizeRisk(it?.risk_level ?? it?.riskLevel ?? it?.risk ?? it?.severity);
      const created_at = it?.created_at ?? it?.createdAt ?? it?.ts ?? it?.time ?? "";
      const summary = it?.summary_text ?? it?.summary ?? it?.text ?? "";
      return { id: String(id), month: String(month), risk_level, created_at, summary: String(summary || "") };
    });
  }, [items]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    let list = normalized;

    if (risk !== "all") list = list.filter((x) => x.risk_level === risk);
    if (qq) list = list.filter((x) => (x.month || "").toLowerCase().includes(qq) || (x.summary || "").toLowerCase().includes(qq));

    // newest first by created_at if possible
    return [...list].sort((a, b) => {
      const ta = Date.parse(a.created_at) || 0;
      const tb = Date.parse(b.created_at) || 0;
      return tb - ta;
    });
  }, [normalized, q, risk]);

  const right = (
    <>
      <Link href="/dashboard" legacyBehavior>
        <a className="dkrs-link">Dashboard →</a>
      </Link>
      <button
        className="dkrs-btn dkrs-btn-ghost"
        onClick={async () => {
          await fetch("/api/auth/logout");
          window.location.href = "/login";
        }}
      >
        Выйти
      </button>
    </>
  );

  return (
    <DkrsShell title="Reports" subtitle="AI отчёты по периодам: риски, метрики и рекомендации" right={right}>
      <div className="dkrs-card" style={{ marginBottom: 14 }}>
        <div className="dkrs-card-body">
          <div className="dkrs-reports-toolbar">
            <div>
              <div className="dkrs-field-label">Поиск</div>
              <input
                className="dkrs-input"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="например: 2026-01 или «штрафы»…"
              />
            </div>

            <div>
              <div className="dkrs-field-label">Риск</div>
              <div className="dkrs-pills">
                <button className={`dkrs-pill ${risk === "all" ? "dkrs-pill-active" : ""}`} onClick={() => setRisk("all")}>
                  Все
                </button>
                <button className={`dkrs-pill ${risk === "green" ? "dkrs-pill-active" : ""}`} onClick={() => setRisk("green")}>
                  Зелёные
                </button>
                <button className={`dkrs-pill ${risk === "yellow" ? "dkrs-pill-active" : ""}`} onClick={() => setRisk("yellow")}>
                  Жёлтые
                </button>
                <button className={`dkrs-pill ${risk === "red" ? "dkrs-pill-active" : ""}`} onClick={() => setRisk("red")}>
                  Красные
                </button>
              </div>
            </div>

            <div style={{ justifySelf: "end" }}>
              <div className="dkrs-field-label">Статус</div>
              <span className="dkrs-badge">
                <span className={`dkrs-dot ${loading ? "dkrs-dot-yellow" : "dkrs-dot-green"}`} />
                {loading ? "Loading" : `Найдено: ${filtered.length}`}
              </span>
            </div>
          </div>

          {err ? <div className="dkrs-ai-error" style={{ marginTop: 12 }}>{err}</div> : null}
        </div>
      </div>

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

              {loading ? (
                <tbody>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="dkrs-row">
                      <td><div className="dkrs-skel dkrs-skel-line" style={{ width: 90 }} /></td>
                      <td><div className="dkrs-skel dkrs-skel-line" style={{ width: 120 }} /></td>
                      <td><div className="dkrs-skel dkrs-skel-line" style={{ width: 140 }} /></td>
                      <td><div className="dkrs-skel dkrs-skel-line" style={{ width: 360 }} /></td>
                      <td><div className="dkrs-skel dkrs-skel-line" style={{ width: 70, marginLeft: "auto" }} /></td>
                    </tr>
                  ))}
                </tbody>
              ) : (
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id || `${r.month}-${r.created_at}`} className="dkrs-row">
                      <td className="dkrs-mono">{r.month || "—"}</td>

                      <td>
                        <span className="dkrs-badge">
                          <span className={`dkrs-dot ${riskDot(r.risk_level)}`} />
                          {riskRu(r.risk_level)}
                        </span>
                      </td>

                      <td className="dkrs-mono" style={{ opacity: 0.9 }}>
                        {r.created_at ? fmtDateTime(r.created_at) : "—"}
                      </td>

                      <td style={{ color: "rgba(255,255,255,0.78)" }}>
                        <span className="dkrs-reports-ellipsis" title={r.summary || ""}>
                          {r.summary || "—"}
                        </span>
                      </td>

                      <td style={{ textAlign: "right" }}>
                        {r.id ? (
                          <Link href={`/reports/${encodeURIComponent(r.id)}`} legacyBehavior>
                            <a className="dkrs-btn dkrs-btn-ghost">Open</a>
                          </Link>
                        ) : (
                          <span style={{ opacity: 0.55 }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: 16, color: "rgba(234,240,255,.65)" }}>
                        Нет отчётов (или фильтры скрыли результат).
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              )}
            </table>
          </div>
        </div>
      </div>
    </DkrsShell>
  );
}
