// pages/reports/[id].js
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import DkrsAppShell from "../../components/DkrsAppShell";
import RiskBadge from "../../components/RiskBadge";
import { fetchJson } from "../../lib/dkrsClient";
import { fmtMoney, fmtPct } from "../../lib/format";

function fmtDateTime(dt) {
  if (!dt) return "—";
  return String(dt).replace("T", " ").slice(0, 16);
}

function normalizeReport(payload) {
  const r = payload?.item || payload || {};
  return {
    id: r.id,
    month: r.month || "—",
    risk_level: r.risk_level || "low",
    summary_text: r.summary_text || "",
    issues: r.issues ?? [],
    metrics: r.metrics ?? {},
    created_at: r.created_at || null,
  };
}

function Pill({ dotColor, children }) {
  return (
    <span className="dkrs-pill" style={{ padding: "7px 10px", gap: 8 }}>
      <span className="dot" style={{ background: dotColor }} />
      <span style={{ fontWeight: 950, fontSize: 12 }}>{children}</span>
    </span>
  );
}

function MetricCard({ label, value, sub }) {
  return (
    <div className="kpiCard">
      <div className="kpiTop">
        <div className="kpiLabel">{label}</div>
        <span className="badge">
          <span className="dot" style={{ background: "rgba(167,139,250,0.9)" }} />
          METRIC
        </span>
      </div>
      <div className="kpiValue">{value}</div>
      <div className="kpiDelta" style={{ color: "rgba(100,116,139,0.85)" }}>
        {sub || "—"}
      </div>
    </div>
  );
}

function IssueItem({ it }) {
  const title = it?.title || it?.name || it?.label || "Issue";
  const text = it?.text || it?.description || it?.details || "";
  const sev = it?.severity || it?.level || it?.risk || null;

  return (
    <div
      style={{
        borderRadius: 18,
        border: "1px solid rgba(148,163,184,0.22)",
        background: "rgba(255,255,255,0.58)",
        boxShadow: "0 14px 34px rgba(15,23,42,0.08)",
        padding: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontWeight: 950, letterSpacing: "-0.02em" }}>{title}</div>
        {sev ? <RiskBadge risk={sev} /> : null}
      </div>
      {text ? (
        <div className="dkrs-sub" style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
          {text}
        </div>
      ) : null}
    </div>
  );
}

export default function ReportViewPage() {
  const router = useRouter();
  const id = router.query.id;

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [report, setReport] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    let alive = true;

    (async () => {
      setLoading(true);
      setErr("");
      try {
        const data = await fetchJson(`/api/report_get?id=${encodeURIComponent(id)}`);
        if (!alive) return;
        if (!data?.ok) throw new Error(data?.error || "report_get ok=false");
        setReport(normalizeReport(data));
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Не удалось загрузить отчёт");
        setReport(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => (alive = false);
  }, [id]);

  const metricsView = useMemo(() => {
    const m = report?.metrics || {};
    const revenue = m.revenue ?? m.revenue_no_vat ?? null;
    const costs = m.costs ?? m.expense ?? null;
    const profit = m.profit ?? null;
    const margin = m.margin ?? null;
    const marginPct = margin == null ? null : Number(margin) <= 1.2 ? Number(margin) * 100 : Number(margin);
    return { revenue, costs, profit, marginPct };
  }, [report]);

  async function copyId() {
    try {
      await navigator.clipboard.writeText(String(report?.id || ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 900);
    } catch {
      setCopied(false);
    }
  }

  return (
    <DkrsAppShell
      title="Отчёт"
      subtitle={report ? `${report.month} • ID ${report.id}` : "Просмотр отчёта"}
      rightSlot={
        <>
          <Link className="btn ghost" href="/reports">
            Назад
          </Link>
          {report ? <RiskBadge risk={report.risk_level} /> : null}
        </>
      }
    >
      <div className="glass strong" style={{ padding: 16, marginBottom: 14 }}>
        {loading ? (
          <div style={{ fontWeight: 900, color: "rgba(100,116,139,0.9)" }}>Загрузка…</div>
        ) : err ? (
          <div style={{ fontWeight: 900, color: "rgba(251,113,133,0.95)" }}>{err}</div>
        ) : report ? (
          <>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 950, letterSpacing: "-0.02em", fontSize: 18 }}>
                  AI Report
                </div>
                <div className="dkrs-sub" style={{ marginTop: 6 }}>
                  Полный разбор + issues + метрики
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <Pill dotColor="rgba(167,139,250,0.9)">Month: {report.month}</Pill>
                <Pill dotColor="rgba(20,184,166,0.9)">Created: {fmtDateTime(report.created_at)}</Pill>
                <Pill dotColor="rgba(100,116,139,0.85)">ID: {report.id}</Pill>

                <button className="btn ghost" onClick={copyId} type="button">
                  {copied ? "✅ Copied" : "📋 Copy ID"}
                </button>

                <button className="btn ghost" onClick={() => window.print()} type="button">
                  🖨️ Печать
                </button>

                <button className="btn" onClick={() => location.assign("/assistant")} type="button">
                  Спросить AI
                </button>
              </div>
            </div>

            <div
              style={{
                marginTop: 14,
                borderRadius: 18,
                border: "1px solid rgba(148,163,184,0.22)",
                background: "rgba(255,255,255,0.58)",
                boxShadow: "0 14px 34px rgba(15,23,42,0.08)",
                padding: 12,
              }}
            >
              <div style={{ fontWeight: 950, letterSpacing: "-0.02em" }}>Summary</div>
              <div className="dkrs-sub" style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
                {report.summary_text || "—"}
              </div>
            </div>
          </>
        ) : null}
      </div>

      {report ? (
        <>
          <div className="glass strong" style={{ padding: 16, marginBottom: 14 }}>
            <div style={{ fontWeight: 950, letterSpacing: "-0.02em" }}>Метрики</div>
            <div className="dkrs-sub" style={{ marginTop: 6 }}>
              Если metrics пустые — отображаем “—”.
            </div>

            <div className="kpiGrid" style={{ marginTop: 12 }}>
              <MetricCard label="Выручка" value={metricsView.revenue == null ? "—" : `${fmtMoney(metricsView.revenue)} ₽`} sub="revenue" />
              <MetricCard label="Расходы" value={metricsView.costs == null ? "—" : `${fmtMoney(metricsView.costs)} ₽`} sub="costs" />
              <MetricCard label="Прибыль" value={metricsView.profit == null ? "—" : `${fmtMoney(metricsView.profit)} ₽`} sub="profit" />
              <MetricCard label="Маржа" value={metricsView.marginPct == null ? "—" : fmtPct(metricsView.marginPct)} sub="margin" />
            </div>
          </div>

          <div className="glass strong" style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 950, letterSpacing: "-0.02em" }}>Проблемы и риски</div>
                <div className="dkrs-sub" style={{ marginTop: 6 }}>Issues из AI отчёта</div>
              </div>

              <span className="badge">
                <span className="dot" style={{ background: "rgba(167,139,250,0.9)" }} />
                {Array.isArray(report.issues) ? report.issues.length : 0} items
              </span>
            </div>

            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {(Array.isArray(report.issues) ? report.issues : []).map((it, i) => (
                <IssueItem key={i} it={it} />
              ))}
              {(!Array.isArray(report.issues) || report.issues.length === 0) ? (
                <div className="dkrs-sub">Issues отсутствуют или пустые.</div>
              ) : null}
            </div>

            <style jsx>{`
              @media (max-width: 980px) {
                div[style*="grid-template-columns: 1fr 1fr"] {
                  grid-template-columns: 1fr !important;
                }
              }
            `}</style>
          </div>
        </>
      ) : null}
    </DkrsAppShell>
  );
}
