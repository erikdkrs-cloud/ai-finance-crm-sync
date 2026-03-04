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
      title="AI Assistant"
      subtitle="Conversation Mode • voice → AI → voice • enterprise UX"
      right={
        <span className="dkrs-badge">
          <span className="dkrs-dot dkrs-dot-green" />
          LIVE • <span className="dkrs-mono">{month || ""}</span>
        </span>
      }
    >
      <div className="dkrs-card" style={{ marginBottom: 14 }}>
        <div className="dkrs-card-body">
          <div className="dkrs-controls" style={{ gridTemplateColumns: "240px 1fr auto" }}>
            <div>
              <div className="dkrs-field-label">Месяц</div>
              <select className="dkrs-select" value={month} onChange={(e) => setMonth(e.target.value)}>
                {months.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="dkrs-small" style={{ alignSelf: "center" }}>
              Этот экран полностью для диалога. Таблица и KPI — в Dashboard.
            </div>

            <div />
          </div>
        </div>
      </div>

      <AiAssistantWidget month={month} />
    </DkrsAppShell>
  );
}
