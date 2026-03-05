import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import DkrsAppShell from "../../components/DkrsAppShell";
import RiskBadge from "../../components/RiskBadge";
import AiFloatingButton from "../../components/AiFloatingButton";
import { fmtMoney, fmtPct } from "../../lib/format";

function fmtDateTime(dt) {
  if (!dt) return "—";
  return String(dt).replace("T", " ").slice(0, 16);
}

function riskToInternal(r) {
  const v = String(r || "").toLowerCase();
  if (v.includes("high") || v.includes("red")) return "red";
  if (v.includes("med") || v.includes("yellow")) return "yellow";
  return "green";
}

export default function ReportViewPage() {
  const router = useRouter();
  const id = router.query.id;

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [report, setReport] = useState(null);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await fetch(`/api/report_get?id=${encodeURIComponent(id)}`);
        const data = await res.json();
        if (!alive) return;
        if (!data?.ok) throw new Error(data?.error || "Ошибка");
        const r = data.item || data;
        setReport({
          id: r.id,
          month: r.month || "—",
          risk_level: r.risk_level || "low",
          summary_text: r.summary_text || "",
          issues: r.issues ?? [],
          metrics: r.metrics ?? {},
          created_at: r.created_at || null,
        });
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Не удалось загрузить отчёт");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  const metrics = useMemo(() => {
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
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }

  return (
    <DkrsAppShell>
      <div className={`report-view-page ${mounted ? "mounted" : ""}`}>
        {/* Back button */}
        <div className="report-back-bar">
          <Link href="/reports" className="report-back-link">
            ← Назад к отчётам
          </Link>
        </div>

        {loading ? (
          <div className="centered-message">
            <div className="loader-spinner" />
            <span>Загрузка отчёта...</span>
          </div>
        ) : err ? (
          <div className="centered-message error">{err}</div>
        ) : report ? (
          <>
            {/* Header card */}
            <div className="report-header-card glass-card">
              <div className="report-header-top">
                <div className="report-header-left">
                  <div className="report-header-icon">📊</div>
                  <div>
                    <h1 className="report-header-title">
                      AI Отчёт #{report.id}
                    </h1>
                    <div className="report-header-meta">
                      <span>📅 {report.month}</span>
                      <span>🕐 {fmtDateTime(report.created_at)}</span>
                    </div>
                  </div>
                </div>
                <div className="report-header-actions">
                  <RiskBadge riskLevel={riskToInternal(report.risk_level)} />
                  <button className="report-action-btn" onClick={copyId}>
                    {copied ? "✅ Скопировано" : "📋 ID"}
                  </button>
                  <button className="report-action-btn" onClick={() => window.print()}>
                    🖨️ Печать
                  </button>
                  <Link href="/assistant" className="report-action-btn primary">
                    🤖 Спросить AI
                  </Link>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="report-section glass-card">
              <div className="widget-header">
                <h3>📝 Резюме отчёта</h3>
              </div>
              <div className="report-summary-text">
                {report.summary_text || "Текст отчёта отсутствует"}
              </div>
            </div>

            {/* Metrics */}
            <div className="report-metrics-grid">
              {[
                { label: "Выручка", value: metrics.revenue, icon: "💰", gradient: "linear-gradient(135deg, #667eea, #764ba2)" },
                { label: "Расходы", value: metrics.costs, icon: "💸", gradient: "linear-gradient(135deg, #f093fb, #f5576c)" },
                { label: "Прибыль", value: metrics.profit, icon: "📈", gradient: "linear-gradient(135deg, #00b09b, #96c93d)" },
                { label: "Маржа", value: metrics.marginPct, icon: "📊", gradient: "linear-gradient(135deg, #4facfe, #00f2fe)", isMarg: true },
              ].map((m, i) => (
                <div key={i} className="report-metric-card glass-card" style={{ animationDelay: `${i * 80}ms` }}>
                  <div className="report-metric-icon" style={{ background: m.gradient }}>
                    {m.icon}
                  </div>
                  <div className="report-metric-label">{m.label}</div>
                  <div className="report-metric-value">
                    {m.value == null ? "—" : m.isMarg ? `${Number(m.value).toFixed(1)}%` : fmtMoney(m.value, 0)}
                  </div>
                </div>
              ))}
            </div>

            {/* Issues */}
            <div className="report-section glass-card">
              <div className="widget-header">
                <h3>⚠️ Проблемы и риски</h3>
                <span className="widget-badge orange">
                  {Array.isArray(report.issues) ? report.issues.length : 0} найдено
                </span>
              </div>
              {Array.isArray(report.issues) && report.issues.length > 0 ? (
                <div className="report-issues-grid">
                  {report.issues.map((it, i) => {
                    const title = it?.title || it?.name || it?.label || "Проблема";
                    const text = it?.text || it?.description || it?.details || "";
                    const sev = it?.severity || it?.level || it?.risk || null;
                    return (
                      <div key={i} className="report-issue-card" style={{ animationDelay: `${i * 60}ms` }}>
                        <div className="report-issue-header">
                          <span className="report-issue-title">{title}</span>
                          {sev && <RiskBadge riskLevel={riskToInternal(sev)} />}
                        </div>
                        {text && <div className="report-issue-text">{text}</div>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-widget">
                  <div className="empty-icon">🎉</div>
                  Проблемы не обнаружены
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>

      <AiFloatingButton />
    </DkrsAppShell>
  );
}
