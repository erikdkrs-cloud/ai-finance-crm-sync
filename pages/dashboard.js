import { useEffect, useMemo, useState } from "react";

function fmt(n) {
  const x = Number(n || 0);
  return x.toLocaleString("ru-RU", { maximumFractionDigits: 0 });
}
function pct(x) {
  return (Number(x || 0) * 100).toFixed(1) + "%";
}
function pillClass(risk){
  if (risk === "red") return { background: "#ffcccc", color: "#990000" };
  if (risk === "yellow") return { background: "#fff2cc", color: "#7f6000" };
  return { background: "#d9ead3", color: "#274e13" };
}

export default function Dashboard() {
  const [months, setMonths] = useState([]);
  const [month, setMonth] = useState("");
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/months")
      .then(r => r.json())
      .then(j => {
        if (!j.ok) throw new Error(j.error || "months error");
        setMonths(j.months || []);
        setMonth(j.months?.[0] || "");
      })
      .catch(e => setErr(String(e)));
  }, []);

  useEffect(() => {
    if (!month) return;
    setErr("");
    setData(null);
    fetch(`/api/dashboard?month=${encodeURIComponent(month)}`)
      .then(r => r.json())
      .then(j => {
        if (!j.ok) throw new Error(j.error || "dashboard error");
        setData(j);
      })
      .catch(e => setErr(String(e)));
  }, [month]);

  const sorted = useMemo(() => {
    const arr = data?.projects ? [...data.projects] : [];
    arr.sort((a,b) => (a.margin ?? 0) - (b.margin ?? 0));
    return arr;
  }, [data]);

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ margin: 0 }}>Dashboard</h1>
      <div style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Месяц</div>
          <select value={month} onChange={(e)=>setMonth(e.target.value)} style={{ padding: 8, minWidth: 140 }}>
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <a href="/reports" style={{ marginLeft: "auto" }}>Reports →</a>
      </div>

      {err && <div style={{ marginTop: 16, color: "#990000" }}>{err}</div>}
      {!data && !err && <div style={{ marginTop: 16 }}>Загрузка…</div>}

      {data && (
        <>
          <div style={{ display: "flex", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
            <KPI title="Выручка" value={fmt(data.totals.revenue)} />
            <KPI title="Прибыль" value={fmt(data.totals.profit)} />
            <KPI title="Маржа" value={pct(data.totals.margin)} />
            <KPI title="Проектов" value={String(data.projects.length)} />
          </div>

          <div style={{ marginTop: 18 }}>
            <h3 style={{ marginBottom: 8 }}>Проекты (сначала самые низкие по марже)</h3>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Risk","Project","Revenue","Profit","Margin","Penalties","Ads","Labor"].map(h => (
                    <th key={h} style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "8px 6px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((p) => (
                  <tr key={p.project}>
                    <td style={{ padding: "6px" }}>
                      <span style={{ padding: "4px 8px", borderRadius: 999, ...pillClass(p.risk) }}>{p.risk}</span>
                    </td>
                    <td style={{ padding: "6px" }}>{p.project}</td>
                    <td style={{ padding: "6px" }}>{fmt(p.revenue)}</td>
                    <td style={{ padding: "6px" }}>{fmt(p.profit)}</td>
                    <td style={{ padding: "6px" }}>{pct(p.margin)}</td>
                    <td style={{ padding: "6px" }}>{fmt(p.penalties)}</td>
                    <td style={{ padding: "6px" }}>{fmt(p.ads)}</td>
                    <td style={{ padding: "6px" }}>{fmt(p.labor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function KPI({ title, value }) {
  return (
    <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, minWidth: 180 }}>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
    </div>
  );
}
