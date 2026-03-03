// pages/reports/[id].js
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import DkrsShell from "../../components/DkrsShell";

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
      try { j = JSON.parse(t); } catch {}
      if (r.ok && j) return { ok: true, json: j, url };
    } catch {}
  }
  return { ok: false, error: lastText || "Не удалось загрузить отчёт." };
}

function normalizeReport(payload) {
  // Accept shapes:
  // {ok:true, report:{...}} or {ok:true, data:{...}} or direct report object
  const p = payload?.ok ? (payload.report || payload.data || payload.item || payload) : payload;
  const rep = p?.report || p?.data || p?.item || p;
  return rep || {};
}

export default function ReportByIdPage() {
  const router = useRouter();
  const { id } = router.query;

  const [rep, setRep] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      setErr("");

      const rid = encodeURIComponent(String(id));
      const res = await fetchJsonAny([
        `/api/report_by_id?id=${rid}`,
        `/api/report_get?id=${rid}`,
        `/api/report?id=${rid}`,
      ]);

      if (!res.ok) {
        setErr(String(res.error || "Ошибка").slice(0, 900));
        setRep(null);
        setLoading(false);
        return;
      }

      const report = normalizeReport(res.json);
      setRep(report);
      setLoading(false);
    })();
  }, [id]);

  const view = useMemo(() => {
    const r = rep || {};
    const month = String(r.month ?? r.period ?? r.period_month ?? r.periodMonth ?? r.period_id ?? r.periodId ?? "");
    const risk_level = normalizeRisk(r.risk_level ?? r.riskLevel ?? r.risk ?? r.severity);
    const created_at = r.created_at ?? r.createdAt ?? r.ts ?? r.time ?? "";
    const summary_text = String(r.summary_text ?? r.summary ?? r.text ?? "");
    const issues = r.issues ?? r.findings ?? r.problems ?? null;
    const metrics = r.metrics ?? r.kpi ?? r.totals ?? null;
    return { month, risk_level, created_at, summary_text, issues, metrics };
  }, [rep]);

  const right = (
    <>
      <Link href="/reports" legacyBehavior>
        <a className="dkrs-link">← Back to reports</a>
      </Link>
      <Link href="/dashboard" legacyBehavior>
        <a className="dkrs-link">Dashboard →</a>
      </Link>
    </>
  );

  return (
    <DkrsShell
      title="Report"
      subtitle={view.month ? `Период: ${view.month}` : "Детали отчёта"}
      right={right}
    >
      <div className="dkrs-grid dkrs-grid-2" style={{ marginBottom: 14 }}>
        <div className="dkrs-card">
          <div className="dkrs-card-header">
            <div>
              <div className="dkrs-card-title">Статус</div>
              <div className="dkrs-small">Ключевые поля отчёта</div>
            </div>

            <span className="dkrs-badge">
              <span className={`dkrs-dot ${riskDot(view.risk_level)}`} />
              {riskRu(view.risk_level)}
            </span>
          </div>

          <div className="dkrs-card-body">
            {loading ? (
              <>
                <div className="dkrs-skel dkrs-skel-line" style={{ width: 260 }} />
                <div className="dkrs-skel dkrs-skel-line" style={{ width: 320, marginTop: 12 }} />
                <div className="dkrs-skel dkrs-skel-line" style={{ width: 220, marginTop: 12 }} />
              </>
            ) : err ? (
              <div className="dkrs-ai-error">{err}</div>
            ) : (
              <div className="dkrs-report-meta">
                <div className="dkrs-report-meta-row">
                  <div className="dkrs-report-k">Период</div>
                  <div className="dkrs-report-v dkrs-mono">{view.month || "—"}</div>
                </div>
                <div className="dkrs-report-meta-row">
                  <div className="dkrs-report-k">Риск</div>
                  <div className="dkrs-report-v">
                    <span className="dkrs-badge">
                      <span className={`dkrs-dot ${riskDot(view.risk_level)}`} />
                      {riskRu(view.risk_level)}
                    </span>
                  </div>
                </div>
                <div className="dkrs-report-meta-row">
                  <div className="dkrs-report-k">Создан</div>
                  <div className="dkrs-report-v dkrs-mono">{view.created_at ? fmtDateTime(view.created_at) : "—"}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="dkrs-card">
          <div className="dkrs-card-header">
            <div>
              <div className="dkrs-card-title">Summary</div>
              <div className="dkrs-small">Короткое резюме от AI</div>
            </div>

            <span className="dkrs-badge">
              <span className={`dkrs-dot ${loading ? "dkrs-dot-yellow" : "dkrs-dot-green"}`} />
              {loading ? "Loading" : "Ready"}
            </span>
          </div>

          <div className="dkrs-card-body">
            {loading ? (
              <>
                <div className="dkrs-skel dkrs-skel-line" style={{ width: "92%" }} />
                <div className="dkrs-skel dkrs-skel-line" style={{ width: "84%", marginTop: 10 }} />
                <div className="dkrs-skel dkrs-skel-line" style={{ width: "88%", marginTop: 10 }} />
              </>
            ) : err ? (
              <div className="dkrs-ai-error">{err}</div>
            ) : (
              <div className="dkrs-report-text">
                {view.summary_text ? view.summary_text : "—"}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="dkrs-grid dkrs-grid-2">
        <div className="dkrs-card">
          <div className="dkrs-card-header">
            <div>
              <div className="dkrs-card-title">Issues</div>
              <div className="dkrs-small">Проблемы/аномалии (JSON)</div>
            </div>
            <span className="dkrs-badge">
              <span className="dkrs-dot dkrs-dot-yellow" />
              Details
            </span>
          </div>

          <div className="dkrs-card-body">
            {loading ? (
              <>
                <div className="dkrs-skel dkrs-skel-line" style={{ width: "90%" }} />
                <div className="dkrs-skel dkrs-skel-line" style={{ width: "86%", marginTop: 10 }} />
                <div className="dkrs-skel dkrs-skel-line" style={{ width: "70%", marginTop: 10 }} />
              </>
            ) : err ? (
              <div className="dkrs-ai-error">{err}</div>
            ) : (
              <pre className="dkrs-json">
                {view.issues ? JSON.stringify(view.issues, null, 2) : "—"}
              </pre>
            )}
          </div>
        </div>

        <div className="dkrs-card">
          <div className="dkrs-card-header">
            <div>
              <div className="dkrs-card-title">Metrics</div>
              <div className="dkrs-small">Ключевые метрики (JSON)</div>
            </div>
            <span className="dkrs-badge">
              <span className="dkrs-dot dkrs-dot-green" />
              KPIs
            </span>
          </div>

          <div className="dkrs-card-body">
            {loading ? (
              <>
                <div className="dkrs-skel dkrs-skel-line" style={{ width: "88%" }} />
                <div className="dkrs-skel dkrs-skel-line" style={{ width: "78%", marginTop: 10 }} />
                <div className="dkrs-skel dkrs-skel-line" style={{ width: "83%", marginTop: 10 }} />
              </>
            ) : err ? (
              <div className="dkrs-ai-error">{err}</div>
            ) : (
              <pre className="dkrs-json">
                {view.metrics ? JSON.stringify(view.metrics, null, 2) : "—"}
              </pre>
            )}
          </div>
        </div>
      </div>
    </DkrsShell>
  );
}
