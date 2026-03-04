// pages/reports/[id].js
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import DkrsAppShell from "../../components/DkrsAppShell";

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

export default function ReportByIdPage() {
  const router = useRouter();
  const { id } = router.query;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!id) return;

    (async () => {
      setLoading(true);
      setErr("");
      try {
        // ✅ твой текущий endpoint (если другой — скажешь, подстрою)
        const r = await fetch(`/api/report_by_id?id=${encodeURIComponent(String(id))}`);
        const t = await r.text();
        let j = null;
        try { j = JSON.parse(t); } catch {}

        if (!r.ok) {
          setErr(t.slice(0, 900));
          setData(null);
          return;
        }

        const obj = j?.report || j?.item || j || null;
        setData(obj);
      } catch (e) {
        setErr(String(e?.message || e));
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const risk = useMemo(() => normalizeRisk(data?.risk_level || data?.risk || data?.riskLevel), [data]);
  const dotClass = risk === "red" ? "dkrs-dot-red" : risk === "yellow" ? "dkrs-dot-yellow" : "dkrs-dot-green";

  const right = (
    <>
      <Link href="/reports" legacyBehavior>
        <a className="dkrs-btn dkrs-btn-ghost">← К списку</a>
      </Link>

      <span className="dkrs-badge">
        <span className={`dkrs-dot ${dotClass}`} />
        {riskRu(risk)}
      </span>
    </>
  );

  return (
    <DkrsAppShell
      title="Отчёт"
      subtitle={id ? `ID: ${id}` : "Загрузка…"}
      right={right}
    >
      {err ? (
        <div className="dkrs-card" style={{ marginBottom: 14 }}>
          <div className="dkrs-card-body">
            <div className="dkrs-ai-error">Ошибка: {err}</div>
          </div>
        </div>
      ) : null}

      <div className="dkrs-card" style={{ marginBottom: 14 }}>
        <div className="dkrs-card-header">
          <div>
            <div className="dkrs-card-title">Summary</div>
            <div className="dkrs-small">Краткий вывод AI</div>
          </div>
          {loading ? <span className="dkrs-spinner" /> : null}
        </div>
        <div className="dkrs-card-body">
          <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.45, color: "rgba(255,255,255,0.88)" }}>
            {data?.summary_text || data?.summary || (loading ? "Загружаем…" : "—")}
          </div>
        </div>
      </div>

      <div className="dkrs-grid dkrs-grid-2" style={{ marginBottom: 14 }}>
        <div className="dkrs-card">
          <div className="dkrs-card-header">
            <div>
              <div className="dkrs-card-title">Issues</div>
              <div className="dkrs-small">Проблемы / зоны риска</div>
            </div>
          </div>
          <div className="dkrs-card-body">
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.4, color: "rgba(255,255,255,0.85)" }}>
              {data?.issues ? JSON.stringify(data.issues, null, 2) : (loading ? "Загружаем…" : "—")}
            </pre>
          </div>
        </div>

        <div className="dkrs-card">
          <div className="dkrs-card-header">
            <div>
              <div className="dkrs-card-title">Metrics</div>
              <div className="dkrs-small">Ключевые метрики</div>
            </div>
          </div>
          <div className="dkrs-card-body">
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.4, color: "rgba(255,255,255,0.85)" }}>
              {data?.metrics ? JSON.stringify(data.metrics, null, 2) : (loading ? "Загружаем…" : "—")}
            </pre>
          </div>
        </div>
      </div>
    </DkrsAppShell>
  );
}
