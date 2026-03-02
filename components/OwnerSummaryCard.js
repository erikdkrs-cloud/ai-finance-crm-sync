import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

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
  if (r === "red")
    return { color: "rgba(239,68,68,1)", bg: "rgba(239,68,68,.12)", border: "rgba(239,68,68,.35)" };
  if (r === "yellow")
    return { color: "rgba(250,173,20,1)", bg: "rgba(250,173,20,.12)", border: "rgba(250,173,20,.35)" };
  return { color: "rgba(34,197,94,1)", bg: "rgba(34,197,94,.12)", border: "rgba(34,197,94,.35)" };
}

async function fetchJsonSafe(url) {
  const resp = await fetch(url);
  const text = await resp.text();
  try {
    return { ok: resp.ok, data: JSON.parse(text), raw: text };
  } catch {
    return { ok: false, data: null, raw: text };
  }
}

export default function OwnerSummaryCard({ month }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [report, setReport] = useState(null);

  useEffect(() => {
    if (!month) return;

    (async () => {
      setLoading(true);
      setErr("");
      setReport(null);

      // 1) список отчётов
      const rl = await fetchJsonSafe("/api/reports_list");
      if (!rl.ok || !rl.data) {
        setErr(`Не удалось загрузить отчёты: ${(rl.raw || "").slice(0, 200)}`);
        setLoading(false);
        return;
      }

      const items =
        rl.data?.items ||
        rl.data?.reports ||
        rl.data?.rows ||
        rl.data?.data ||
        rl.data ||
        [];

      const arr = Array.isArray(items) ? items : [];
      const sameMonth = arr.filter((x) => String(x.month) === String(month));

      if (!sameMonth.length) {
        setErr("Для этого месяца ещё нет AI-отчёта. Нажми «Сгенерировать отчёт».");
        setLoading(false);
        return;
      }

      // 2) самый свежий (по id)
      sameMonth.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
      const latest = sameMonth[0];

      // 3) детали отчёта
      const rg = await fetchJsonSafe(`/api/report_get?id=${encodeURIComponent(String(latest.id))}`);
      if (!rg.ok || !rg.data) {
        setErr(`Не удалось загрузить детали отчёта: ${(rg.raw || "").slice(0, 200)}`);
        setLoading(false);
        return;
      }

      const item = rg.data?.item ? rg.data.item : rg.data;
      setReport(item);
      setLoading(false);
    })();
  }, [month]);

  const rr = useMemo(() => normalizeRisk(report?.risk_level), [report?.risk_level]);
  const rs = useMemo(() => riskStyle(rr), [rr]);

  return (
    <div
      className="card"
      style={{
        background: "rgba(255,255,255,.03)",
        border: "1px solid rgba(255,255,255,.08)",
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>Owner Summary</div>

        {report ? (
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
        ) : null}
      </div>

      <div style={{ marginTop: 10, opacity: 0.7 }} className="mono">
        Месяц: <b>{month}</b>
      </div>

      {loading ? (
        <div style={{ marginTop: 12, opacity: 0.8 }}>Загрузка AI summary…</div>
      ) : err ? (
        <div style={{ marginTop: 12, color: "rgba(239,68,68,.9)", fontWeight: 800, whiteSpace: "pre-wrap" }}>
          {err}
        </div>
      ) : (
        <>
          <div style={{ marginTop: 12, whiteSpace: "pre-line", lineHeight: 1.65, color: "rgba(234,240,255,.88)" }}>
            {report?.summary_text || "—"}
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href={`/reports/${report.id}`}>
              <a className="btn">Открыть полный отчёт</a>
            </Link>
            <Link href="/reports">
              <a className="btn">Все отчёты</a>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
