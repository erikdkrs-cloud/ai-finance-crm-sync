// pages/summary.js
import React from "react";
import DkrsAppShell from "../components/DkrsAppShell";

export default function SummaryPage() {
  return (
    <DkrsAppShell
      title="Сводка"
      subtitle="Краткий обзор по периодам и рискам (следующий шаг — наполнить данными)"
      rightSlot={<button className="btn">Сформировать отчёт</button>}
    >
      <div className="glass strong" style={{ padding: 16 }}>
        <div style={{ fontWeight: 900, letterSpacing: "-0.02em" }}>В разработке</div>
        <div className="dkrs-sub" style={{ marginTop: 8 }}>
          Сюда вынесем “Executive summary”: тренды, маржинальность, риски, топ-аномаlии и рекомендации.
        </div>
      </div>
    </DkrsAppShell>
  );
}
