import { useEffect, useMemo, useState } from "react";

function fmt(n) {
  const x = Number(n || 0);
  return x.toLocaleString("ru-RU", { maximumFractionDigits: 0 });
}
function pct(x) {
  return (Number(x || 0) * 100).toFixed(1) + "%";
}
function riskRu(r) {
  if (r === "red") return "красный";
  if (r === "yellow") return "жёлтый";
  if (r === "green") return "зелёный";
  return String(r || "");
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

  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [genStatus, setGenStatus] = useState("");

  const [onlyRisky, setOnlyRisky] = useState(false); // red+yellow
  const [onlyRed, setOnlyRed] = useState(false);
  const [onlyGreen, setOnlyGreen] = useState(false);

  useEffect(() => {
    setErr("");
    fetch("/api/months")
      .then(r => r.json())
      .then(j => {
        if (!j.ok) throw new Error(j.error || "Ошибка /api/months");
        const list = j.months || [];
        setMonths(list);
        setMonth(list?.[0] || "");
      })
      .catch(e => setErr(String(e)));
  }, []);

  async function loadDashboard(m) {
    if (!m) return;
    setErr("");
    setData(null);
    setLoadingDashboard(true);

    try {
      const r = await fetch(`/api/dashboard?month=${encodeURIComponent(m)}`);
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${r.status}`);
      setData(j);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoadingDashboard(false);
    }
  }

  useEffect(() => {
    if (!month) return;
    loadDashboard(month);
  }, [month]);

  async function generateReport() {
    if (!month) return;

    setGenLoading(true);
    setGenStatus("Генерирую отчёт…");

    try {
      let r = await fetch(`/api/report?month=${encodeURIComponent(month)}`, { method: "POST" });
      if (r.status === 405) r = await fetch(`/api/report?month=${encodeURIComponent(month)}`);

      const j = await r.json().catch(() => ({}));
      if (!r.ok || j?.ok === false) {
        const details = j?.error ? `\n${j.error}` : "";
        throw new Error(`HTTP ${r.status}${details}`);
      }

      setGenStatus("Готово ✅ Отчёт создан.");
      await loadDashboard(month);
    } catch (e) {
      setGenStatus("Ошибка: " + String(e));
    } finally {
      setGenLoading(false);
    }
  }

  const filteredSorted = useMemo(() => {
    const arr = data?.projects ? [...data.projects] : [];
    let res = arr;

    if (onlyRed) res = res.filter(p => p.risk === "red");
    else if (onlyRisky) res = res.filter(p => p.risk === "red" || p.risk === "yellow");
    else if (onlyGreen) res = res.filter(p => p.risk === "green");

    res.sort((a,b) => (a.margin ?? 0) - (b.margin ?? 0));
    return res;
  }, [data, onlyRisky, onlyRed, onlyGreen]);

  const counts = useMemo(() => {
    const arr = data?.projects || [];
    const c = { green: 0, yellow: 0, red: 0 };
    for (const p of arr) {
      if (p.risk === "red") c.red++;
      else if (p.risk === "yellow") c.yellow++;
      else c.green++;
    }
    return c;
  }, [data]);

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ margin: 0 }}>Дашборд</h1>

      <div style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Месяц</div>
          <select
            value={month}
            onChange={(e)=>{ setMonth(e.target.value); setGenStatus(""); }}
            style={{ padding: 8, minWidth: 160 }}
            disabled={months.length === 0}
          >
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "end" }}>
          <button onClick={() => { setOnlyRisky(false); setOnlyRed(false); setOnlyGreen(false); }} style={btnStyle(!onlyRisky && !onlyRed && !onlyGreen)}>
            Все
          </button>
          <button onClick={() => { setOnlyRisky(true); setOnlyRed(false); setOnlyGreen(false); }} style={btnStyle(onlyRisky && !onlyRed && !onlyGreen)}>
            Жёлтые+красные
          </button>
          <button onClick={() => { setOnlyRed(true); setOnlyRisky(false); setOnlyGreen(false); }} style={btnStyle(onlyRed)}>
            Только красные
          </button>
          <button onClick={() => { setOnlyGreen(true); setOnlyRisky(false); setOnlyRed(false); }} style={btnStyle(onlyGreen)}>
            Только зелёные
          </button>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            {data ? `Зелёные ${counts.green} • Жёлтые ${counts.yellow} • Красные ${counts.red}` : ""}
          </div>

          <button
            onClick={generateReport}
            disabled={!month || genLoading}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid #ddd",
              background: genLoading ? "#f5f5f5" : "white",
              cursor: genLoading ? "not-allowed" : "pointer"
            }}
          >
            {genLoading ? "Генерирую…" : "Сгенерировать отчёт"}
          </button>

          <a href="/reports">Отчёты →</a>
        </div>
      </div>

      {genStatus && <div style={{ marginTop: 10, fontSize: 13, whiteSpace: "pre-wrap" }}>{genStatus}</div>}

      {err && <div style={{ marginTop: 16, color: "#990000", whiteSpace: "pre-wrap" }}>{err}</div>}
      {loadingDashboard && !err && <div style={{ marginTop: 16 }}>Загрузка…</div>}

      {data && !err && (
        <>
          <div style={{ display: "flex", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
            <KPI title="Выручка" value={fmt(data.totals?.revenue)} />
            <KPI title="Расходы" value={fmt(data.totals?.costs)} />
            <KPI title="Прибыль" value={fmt(data.totals?.profit)} />
            <KPI title="Маржа" value={pct(data.totals?.margin)} />
            <KPI title="Проектов" value={String(data.projects?.length || 0)} />
          </div>

          <div style={{ marginTop: 18 }}>
            <h3 style={{ marginBottom: 8 }}>Проекты (сначала самые низкие по марже)</h3>

            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Риск","Проект","Выручка","Расходы","Прибыль","Маржа","Штрафы","Реклама","ФОТ (рабочие)"].map(h => (
                    <th key={h} style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "8px 6px" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredSorted.map((p) => (
                  <tr key={p.project}>
                    <td style={{ padding: "6px" }}>
                      <span style={{ padding: "4px 8px", borderRadius: 999, ...pillClass(p.risk) }}>
                        {riskRu(p.risk)}
                      </span>
                    </td>
                    <td style={{ padding: "6px" }}>{p.project}</td>
                    <td style={{ padding: "6px" }}>{fmt(p.revenue)}</td>
                    <td style={{ padding: "6px" }}>{fmt(p.costs)}</td>
                    <td style={{ padding: "6px" }}>{fmt(p.profit)}</td>
                    <td style={{ padding: "6px" }}>{pct(p.margin)}</td>
                    <td style={{ padding: "6px" }}>{fmt(p.penalties)}</td>
                    <td style={{ padding: "6px" }}>{fmt(p.ads)}</td>
                    <td style={{ padding: "6px" }}>{fmt(p.labor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredSorted.length === 0 && (
              <div style={{ marginTop: 10, opacity: 0.7 }}>
                По текущему фильтру проектов нет.
              </div>
            )}
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

function btnStyle(active) {
  return {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #ddd",
    background: active ? "#111" : "white",
    color: active ? "white" : "black",
    cursor: "pointer"
  };
}
