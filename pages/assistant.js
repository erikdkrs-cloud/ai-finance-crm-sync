import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import DkrsAppShell from "../components/DkrsAppShell";
import AiFloatingButton from "../components/AiFloatingButton";
import AiAssistantWidget from "../components/AiAssistantWidget";
import { fmtMoney, fmtPct } from "../lib/format";

export default function AssistantPage() {
  const router = useRouter();
  const [months, setMonths] = useState([]);
  const [startMonth, setStartMonth] = useState("");
  const [endMonth, setEndMonth] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/months");
        const data = await res.json();
        const list = data?.months || [];
        if (!alive) return;
        setMonths(list);
        const end = list?.[0] || "";
        const start = list?.[Math.min(list.length - 1, 5)] || end;
        setStartMonth(start);
        setEndMonth(end);
      } catch {}
    })();
    return () => { alive = false; };
  }, []);

  return (
    <DkrsAppShell>
      <div className={`assistant-page ${mounted ? "mounted" : ""}`}>
        {/* Hero */}
        <div className="assistant-hero glass-card">
          <div className="assistant-hero-icon">🤖</div>
          <div className="assistant-hero-text">
            <h2>AI Помощник</h2>
            <p>
              • Попроси подвести итоги за период<br />
              • Найду проблемы (маржа, штрафы, расходы)<br />
              • Сформирую отчёт и рекомендации
            </p>
          </div>
        </div>

        {/* Month selector + Generate report */}
        <div className="assistant-controls glass-card">
          <div className="assistant-controls-left">
            <span className="assistant-control-icon">📅</span>
            <select
              className="dkrs-select"
              value={startMonth}
              onChange={(e) => {
                const v = e.target.value;
                setStartMonth(v);
                if (v > endMonth) setEndMonth(v);
              }}
            >
              {months.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <span className="assistant-control-arrow">→</span>
            <select
              className="dkrs-select"
              value={endMonth}
              onChange={(e) => {
                const v = e.target.value;
                setEndMonth(v);
                if (v < startMonth) setStartMonth(v);
              }}
            >
              {months.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <button
            className="assistant-generate-btn"
            onClick={() => router.push("/reports")}
          >
            ✨ Сформировать отчёт
          </button>
        </div>

        {/* AI Widget */}
        <div className="assistant-widget glass-card">
          <AiAssistantWidget
            month={endMonth}
            startMonth={startMonth}
            endMonth={endMonth}
          />
        </div>
      </div>

      <AiFloatingButton />
    </DkrsAppShell>
  );
}
