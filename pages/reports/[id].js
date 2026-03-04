// pages/reports/[id].js
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import DkrsAppShell from "../../components/DkrsAppShell";
import RiskBadge from "../../components/RiskBadge";
import { tryMany } from "../../lib/dkrsClient";
import { fmtMoney, fmtPct } from "../../lib/format";

function normalizeReport(payload) {
  const r = payload?.report || payload?.data || payload;

  return {
    id: r?.id ?? r?.report_id ?? r?.ai_report_id ?? null,
    period: r?.month ?? r?.period ?? r?.period_month ?? r?.period_id ?? "—",
    project: r?.project ?? r?.project_name ?? r?.name ?? "—",
    risk: r?.risk_level ?? r?.risk ?? "low",
    summary: r?.summary_text ?? r?.summary ?? "",
    issues: r?.issues ?? [],
    metrics: r?.metrics ?? {},
    createdAt: r?.created_at ?? r?.createdAt ?? null,
  };
}

function IssueItem({ item }) {
  const title = item?.title || item?.name || item?.label || "Пункт";
  const text = item?.text || item?.description || item?.details || "";
  const severity = item?.severity || item?.level || item?.risk || null;

  return (
    <div
      style={{
        borderRadius: 18,
        border: "1px solid rgba(148,163,184,0.26)",
        background: "rgba(255,255,255,0.60)",
        boxShadow: "0 14px 34px rgba(15,23,42,0.08)",
        padding: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontWeight: 900, letterSpacing: "-0.02em" }}>{title}</div>
        {severity ? <RiskBadge risk={severity} /> : null}
      </div>
      {text ? <div className="dkrs-sub" style={{ marginTop: 8 }}>{text}</div> : null}
    </div>
  );
}

function MetricsGrid({ metrics }) {
  const items = useMemo(() => {
    // универсальный показ самых частых метрик
    const m = metrics || {};
    return [
      { k: "revenue", label: "Выручка", v: m.revenue ?? m.revenue_no_vat, fmt: fmtMoney },
      { k: "expense", label: "Расходы", v: m.expense ?? m.costs, fmt: fmtMoney },
      { k: "profit", label: "Прибыль", v: m.profit, fmt: fmtMoney },
      { k: "margin", label: "Маржа", v: m.margin, fmt: fmtPct },
    ].filter((x) => x.v !== undefined);
  }, [metrics]);

  if (!items.length) {
    return <div className="dkrs-sub">Метрики не найдены в отчёте.</div>;
  }

  return (
    <div className="kpiGrid">
      {items.map((x) => (
        <div key={x.k} className="kpiCard">
          <div className="kpiTop">
            <div className="kpiLabel">{x.label}</div>
            <span className="badge">
              <span className="dot" style={{ background: "rgba(20,184,166,0.9)" }} />
              METRIC
            </span>
          </div>
          <div className="kpiValue">{x.fmt(x.v)}</div>
          <div className="kpiDelta" style={{ color: "rgba(100,116,139,0.85)" }}>
            {x.k}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ReportViewPage() {
  const router = useRouter();
  const id = router.query.id;

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [report, setReport] = useState(null);

  useEffect(() => {
    if (!id) return;
    let alive = true;

    (async () => {
      setLoading(true);
      setErr("");
      try {
        const data = await tryMany([
          `/api/report_by_id?id=${encodeURIComponent(id)}`,
          `/api/report_get?id=${encodeURIComponent(id)}`,
          `/api/report?id=${encodeURIComponent(id)}`,
        ]);
        if (!alive) return;
        setReport(normalizeReport(data));
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Не удалось загрузить отчёт");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [id]);

  return (
    <DkrsAppShell
      title="Отчёт"
      subtitle={report ? `${report.project} • ${report.period}` : "Просмотр отчёта"}
      rightSlot={
        <>
          <Link className="btn ghost" href="/reports">Назад</Link>
          {report ? <RiskBadge risk={report.risk} /> : null}
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
                  {report.project}
                </div>
                <div className="dkrs-sub" style={{ marginTop: 6 }}>
                  Период: <b>{report.period}</b>
                  {report.createdAt ? <> • создан: <b>{String(report.createdAt).slice(0, 19).replace("T", " ")}</b></> : null}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button className="btn ghost" onClick={() => window.print()}>Печать</button>
                <button className="btn" onClick={() => location.assign("/assistant")}>Спросить AI</button>
              </div>
            </div>

            <div
              style={{
                marginTop: 14,
                borderRadius: 18,
                border: "1px solid rgba(148,163,184,0.26)",
                background: "rgba(255,255,255,0.60)",
                boxShadow: "0 14px 34px rgba(15,23,42,0.08)",
                padding: 14,
              }}
            >
              <div style={{ fontWeight: 900, letterSpacing: "-0.02em" }}>Summary</div>
              <div className="dkrs-sub" style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
                {report.summary || "—"}
              </div>
            </div>
          </>
        ) : null}
      </div>

      {report ? (
        <>
          <div className="glass strong" style={{ padding: 16, marginBottom: 14 }}>
            <div style={{ fontWeight: 900, letterSpacing: "-0.02em" }}>Метрики</div>
            <div className="dkrs-sub" style={{ marginTop: 6 }}>
              Ключевые показатели (выручка/расходы/прибыль/маржа)
            </div>
            <div style={{ marginTop: 12 }}>
              <MetricsGrid metrics={report.metrics} />
            </div>
          </div>

          <div className="glass strong" style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 900, letterSpacing: "-0.02em" }}>Проблемы и риски</div>
                <div className="dkrs-sub" style={{ marginTop: 6 }}>Список issues из AI отчёта</div>
              </div>
              <span className="badge">
                <span className="dot" style={{ background: "rgba(167,139,250,0.9)" }} />
                {Array.isArray(report.issues) ? report.issues.length : 0} items
              </span>
            </div>

            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {(Array.isArray(report.issues) ? report.issues : []).map((it, i) => (
                <IssueItem key={i} item={it} />
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
