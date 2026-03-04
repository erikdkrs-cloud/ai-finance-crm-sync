// pages/assistant.js
import React, { useEffect, useState } from "react";
import DkrsAppShell from "../components/DkrsAppShell";
import AiAssistantWidget from "../components/AiAssistantWidget";

export default function AssistantPage() {
  const [months, setMonths] = useState([]);
  const [month, setMonth] = useState("");

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/months");
      const j = await r.json();
      const list = j?.months || j || [];
      setMonths(list);
      setMonth(list?.[0] || "");
    })();
  }, []);

  return (
    <DkrsAppShell
      title="AI помощник"
      subtitle="Голосовой Conversation Mode • авто-стоп по тишине"
      right={
        <div style={{ minWidth: 220 }}>
          <select className="dkrs-select" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Выбор месяца">
            {months.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      }
    >
      <div className="dkrs-card dkrs-card-glass">
        <div className="dkrs-card-body">
          <AiAssistantWidget month={month} />
        </div>
      </div>
    </DkrsAppShell>
  );
}
