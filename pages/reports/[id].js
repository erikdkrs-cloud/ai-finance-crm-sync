import { useEffect, useState } from "react";
import { useRouter } from "next/router";

function pillStyle(risk){
  if (risk === "red") return { background: "#ffcccc", color: "#990000" };
  if (risk === "yellow") return { background: "#fff2cc", color: "#7f6000" };
  return { background: "#d9ead3", color: "#274e13" };
}

export default function ReportDetail() {
  const router = useRouter();
  const { id } = router.query;

  const [item, setItem] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!id) return;
    setErr("");
    setItem(null);

    fetch(`/api/report_by_id?id=${encodeURIComponent(id)}`)
      .then(r => r.json())
      .then(j => {
        if (!j.ok) throw new Error(j.error || "load error");
        setItem(j.item);
      })
      .catch(e => setErr(String(e)));
  }, [id]);

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <a href="/reports">← Reports</a>
        <a href="/dashboard" style={{ marginLeft: "auto" }}>Dashboard</a>
      </div>

      {err && <div style={{ marginTop: 16, color: "#990000" }}>{err}</div>}
      {!item && !err && <div style={{ marginTop: 16 }}>Загрузка…</div>}

      {item && (
        <>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 14 }}>
            <span style={{ padding: "4px 8px", borderRadius: 999, ...pillStyle(item.risk_level) }}>
              {item.risk_level}
            </span>
            <b>{item.month}</b>
            <span style={{ marginLeft: "auto", fontSize: 12, opacity: 0.7 }}>
              {new Date(item.created_at).toLocaleString()}
            </span>
          </div>

          <h1 style={{ marginTop: 14, marginBottom: 8 }}>AI Report #{item.id}</h1>

          <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Summary</div>
            <pre style={{ whiteSpace: "pre-wrap", marginTop: 8, fontFamily: "inherit" }}>
              {item.summary_text}
            </pre>
          </div>

          <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
            <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Issues (json)</div>
              <pre style={{ whiteSpace: "pre-wrap", marginTop: 8, fontSize: 12 }}>
                {JSON.stringify(item.issues, null, 2)}
              </pre>
            </div>

            <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Metrics (json)</div>
              <pre style={{ whiteSpace: "pre-wrap", marginTop: 8, fontSize: 12 }}>
                {JSON.stringify(item.metrics, null, 2)}
              </pre>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
