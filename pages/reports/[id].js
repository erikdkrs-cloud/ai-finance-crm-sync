import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

function toNumber(v) {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v).replace(/\s/g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function fmtMoney(n) {
  return toNumber(n).toLocaleString("ru-RU", { maximumFractionDigits: 2 });
}

function fmtPct(n) {
  // поддержим и 0..1, и 0..100
  const x = toNumber(n);
  if (x <= 1.5) return `${(x * 100).toFixed(1)}%`;
  return `${x.toFixed(1)}%`;
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

function riskStyle(r) {
  if (r === "red") return { color: "rgba(239,68,68,1)", bg: "rgba(239,68,68,.12)", border: "rgba(239,68,68,.35)" };
  if (r === "yellow") return { color: "rgba(250,173,20,1)", bg: "rgba(250,173,20,.12)", border: "rgba(250,173,20,.35)" };
  return { color: "rgba(34,197,94,1)", bg: "rgba(34,197,94,.12)", border: "rgba(34,197,94,.35)" };
}

function normalizeIssues(issues) {
  if (!issues) return [];
  if (Array.isArray(issues)) return issues;
  if (typeof issues === "object") {
    const arr = issues.items || issues.issues || issues.list;
    if (Array.isArray(arr)) return arr;
  }
  if (typeof issues === "string") return [{ level: "low", text: issues }];
  return [];
}

function IssueCard({ issue }) {
  const level = String(issue?.level || issue?.severity || "low").toLowerCase();
  const text = issue?.text || issue?.message || issue?.title || JSON.stringify(issue);

  const ui =
    level === "high"
      ? { name: "high", border: "rgba(239,68,68,.45)", dot: "rgba(239,68,68,1)", bg: "rgba(239,68,68,.08)" }
      : level === "medium"
      ? { name: "medium", border: "rgba(250,173,20,.45)", dot: "rgba(250,173,20,1)", bg: "rgba(250,173,20,.08)" }
      : { name: "low", border: "rgba(34,197,94,.45)", dot: "rgba(34,197,94,1)", bg: "rgba(34,197,94,.08)" };

  return (
    <div
      className="card"
      style={{
        background: "rgba(255,255,255,.03)",
        border: `1px solid ${ui.border}`,
        borderRadius: 14,
        padding: 16,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
        <div style={{ fontWeight: 900 }}>Сигнал</div>
        <span
          style={{
            fontSize: 12,
            padding: "4px 10px",
            borderRadius: 999,
            background: ui.bg,
            border: `1px solid ${ui.border}`,
            color: "rgba(234,240,255,.92)",
            textTransform: "uppercase",
            fontWeight: 900,
            letterSpacing: 0.6,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: 999, background: ui.dot, display: "inline-block" }} />
          {ui.name}
        </span>
      </div>
      <div style={{ whiteSpace: "pre-line", lineHeight: 1.6, color: "rgba(234,240,255,.88)" }}>{text}</div>
    </div>
  );
}

function KPI({ title, value, hint }) {
  return (
    <div
      className="card"
      style={{
        background: "rgba(255,255,255,.03)",
        border: "1px solid rgba(255,255,255,.08)",
        borderRadius: 14,
        padding: 16,
      }}
    >
      <div style={{ opacity: 0.65, marginBottom: 8, fontSize: 13 }}>{title}</div>
      <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: 0.2 }} className="mono">
        {value}
      </div>
      {hint ? <div style={{ opacity: 0.55, marginTop: 8, fontSize: 12 }}>{hint}</div> : null}
    </div>
  );
}

async function fetchJsonSafe(url) {
  const resp = await fetch(url);
  const text = await resp.text();
  try {
    return { ok: resp.ok, data: JSON.parse(text), raw: text };
  } catch (e) {
    return { ok: false, data: null, raw: text };
  }
}

function extractItem(payload) {
  if (!payload) return null;
  // варианты: {ok:true,item:{..}}, {ok:true,...fields}, или просто {..}
  if (payload.item) return payload.item;
  if (payload.ok && (payload.month || payload.risk_level || payload.summary_text)) return payload;
  if (payload.month || payload.risk_level || payload.summary_text) return payload;
  return null;
}

export default function ReportDetailsPage() {
  const router = useRouter();
  const { id } = router.query;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [item, setItem] = useState(null);

  useEffect(() => {
    if (!id) return;

    (async () => {
      setLoading(true);
      setError("");
      setItem(null);

      const key = encodeURIComponent(String(id));

      // 1) Сначала пробуем /api/report_get (у тебя он точно есть)
      let r = await fetchJsonSafe(`/api/report_get?id=${key}`);
      let rep = r.ok ? extractItem(r.data) : null;

      // 2) Если не вышло — пробуем /api/report_by_id (как было у тебя раньше)
      if (!rep) {
        const r2 = await fetchJsonSafe(`/api/report_by_id?id=${key}`);
        rep = r2.ok ? extractItem(r2.data) : null;
        if (!rep) {
          const raw = (r.raw || "").slice(0, 500);
          const raw2 = (r2.raw || "").slice(0, 500);
          setError(
            `Не удалось загрузить отчёт.\n\nreport_get:\n${raw}\n\nreport_by_id:\n${raw2}`
          );
          setLoading(false);
          return;
        }
      }

      setItem(rep);
      setLoading(false);
    })();
  }, [id]);

  const rr = useMemo(() => normalizeRisk(item?.risk_level), [item?.risk_level]);
  const rs = useMemo(() => riskStyle(rr), [rr]);

  const metrics = item?.metrics || {};
  const totals = metrics?.totals || metrics?.kpi || metrics || {};

  const revenue = totals?.revenue_no_vat ?? totals?.revenue ?? totals?.total_revenue ?? null;
  const costs = totals?.costs ?? totals?.expenses ?? totals?.total_expenses ?? null;
  const profit =
    totals?.profit ??
    totals?.total_profit ??
    (revenue !== null && costs !== null ? toNumber(revenue) - toNumber(costs) : null);
  const margin = totals?.margin ?? null;

  const issuesArr = useMemo(() => normalizeIssues(item?.issues), [item?.issues]);

  return (
    <div className="crm-wrap">
      <div className="crm-top">
        <div className="crm-title">
          <h1>AI Executive Report</h1>
          <div className="sub">структурированный отчёт • KPI • сигналы</div>
        </div>

        <div className="crm-controls" style={{ width: "100%", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", flex: 1 }}>
            {item ? (
              <>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "6px 12px",
                    borderRadius: 999,
                    background: rs.bg,
                    border: `1px solid ${rs.border}`,
                    color: "rgba(234,240,255,.95)",
                    fontWeight: 900,
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: rs.color, display: "inline-block" }} />
                  Риск: {riskRu(rr)}
                </span>

                <span className="mono" style={{ opacity: 0.9 }}>
                  Месяц: <b>{item.month}</b>
                </span>

                <span style={{ opacity: 0.55 }}>
                  Сгенерирован: {item.created_at ? new Date(item.created_at).toLocaleString("ru-RU") : "—"}
                </span>
              </>
            ) : null}
          </div>

          <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 18 }}>
            <Link href="/reports"><a className="link">← Отчёты</a></Link>
            {item?.month ? (
              <Link href={`/dashboard?month=${encodeURIComponent(item.month)}`}>
                <a className="link">Дашборд →</a>
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="report-card">Загрузка…</div>
      ) : error ? (
        <div className="report-card" style={{ borderColor: "rgba(239,68,68,.35)" }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Ошибка</div>
          <pre style={{ whiteSpace: "pre-wrap", color: "rgba(234,240,255,.85)" }}>{error}</pre>
        </div>
      ) : !item ? (
        <div className="report-card">Отчёт не найден</div>
      ) : (
        <>
          {/* KPI */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <KPI title="Выручка" value={revenue !== null ? fmtMoney(revenue) : "—"} hint="без НДС (если так настроено)" />
            <KPI title="Расходы" value={costs !== null ? fmtMoney(costs) : "—"} hint="все затраты" />
            <KPI title="Прибыль" value={profit !== null ? fmtMoney(profit) : "—"} hint="выручка − расходы" />
            <KPI title="Маржа" value={margin !== null ? fmtPct(margin) : "—"} hint="прибыль / выручка" />
          </div>

          {/* Summary */}
          <div className="report-card" style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 900, marginBottom: 10 }}>Executive Summary</div>
            <div style={{ whiteSpace: "pre-line", lineHeight: 1.7, color: "rgba(234,240,255,.88)" }}>
              {item.summary_text || "—"}
            </div>
          </div>

          {/* Issues */}
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
              <div style={{ fontWeight: 900, fontSize: 18 }}>Ключевые проблемы и сигналы</div>
              <div className="small-muted">Всего: <b>{issuesArr.length}</b></div>
            </div>

            {issuesArr.length ? (
              <div
                style={{
                  marginTop: 12,
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                  gap: 12,
                }}
              >
                {issuesArr.map((it, idx) => (
                  <IssueCard key={idx} issue={it} />
                ))}
              </div>
            ) : (
              <div className="report-card" style={{ marginTop: 12, opacity: 0.85 }}>
                Issues пустые — это нормально, если AI не нашёл проблем для этого месяца.
              </div>
            )}
          </div>

          {/* Debug */}
          <details style={{ marginTop: 14, opacity: 0.9 }}>
            <summary style={{ cursor: "pointer", userSelect: "none" }}>Показать raw (для проверки)</summary>
            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="card" style={{ background: "rgba(255,255,255,.03)" }}>
                <div style={{ fontWeight: 900 }}>Issues</div>
                <pre style={{ marginTop: 10, whiteSpace: "pre-wrap", color: "rgba(234,240,255,.82)" }}>
                  {JSON.stringify(item.issues ?? [], null, 2)}
                </pre>
              </div>
              <div className="card" style={{ background: "rgba(255,255,255,.03)" }}>
                <div style={{ fontWeight: 900 }}>Metrics</div>
                <pre style={{ marginTop: 10, whiteSpace: "pre-wrap", color: "rgba(234,240,255,.82)" }}>
                  {JSON.stringify(item.metrics ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
