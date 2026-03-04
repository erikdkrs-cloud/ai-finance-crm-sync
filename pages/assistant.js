// pages/assistant.js
import React from "react";
import DkrsAppShell from "../components/DkrsAppShell";
import AiAssistantWidget from "../components/AiAssistantWidget";

export default function AssistantPage() {
  return (
    <DkrsAppShell
      title="AI помощник"
      subtitle="Диалог + анализ + генерация отчётов"
      rightSlot={
        <>
          <span className="dkrs-pill">
            <span className="dot" style={{ background: "rgba(20,184,166,0.9)" }} />
            <b>2025-01</b>
          </span>
          <button className="btn">Сформировать отчёт</button>
        </>
      }
    >
      <div className="glass strong" style={{ padding: 0, overflow: "hidden", marginBottom: 14 }}>
        <div
          style={{
            position: "relative",
            padding: 18,
            minHeight: 190,
            display: "grid",
            gridTemplateColumns: "1.35fr 0.65fr",
            gap: 12,
            alignItems: "center",
            background:
              "radial-gradient(520px 240px at 20% 20%, rgba(167,139,250,0.35), transparent 60%)," +
              "radial-gradient(520px 240px at 80% 70%, rgba(20,184,166,0.22), transparent 62%)," +
              "linear-gradient(180deg, rgba(255,255,255,0.65), rgba(255,255,255,0.45))",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 16,
                  background:
                    "radial-gradient(18px 18px at 30% 30%, rgba(255,255,255,0.95), rgba(255,255,255,0.15))," +
                    "linear-gradient(135deg, rgba(20,184,166,1), rgba(167,139,250,0.90))",
                  boxShadow: "0 14px 28px rgba(20,184,166,0.18)",
                  border: "1px solid rgba(148,163,184,0.30)",
                }}
              />
              <div style={{ fontWeight: 950, letterSpacing: "-0.02em" }}>Здравствуйте!</div>
            </div>

            <div className="dkrs-sub" style={{ maxWidth: 520 }}>
              • Реши одну проблему<br />
              • А получишь целый статистику по сравнению отчётам<br />
              • “Пробивные” помощники помогут
            </div>

            <div
              style={{
                marginTop: 14,
                borderRadius: 18,
                border: "1px solid rgba(148,163,184,0.26)",
                background: "rgba(255,255,255,0.60)",
                boxShadow: "0 14px 34px rgba(15,23,42,0.08)",
                padding: 14,
                maxWidth: 620,
              }}
            >
              <div style={{ fontWeight: 900, letterSpacing: "-0.02em" }}>
                Подведи итог по всем проектам
              </div>
              <div className="dkrs-sub" style={{ marginTop: 6 }}>
                + январь: 2026<br />
                Покажи показатели доходности и проблемные зоны.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <img
              src="/robot-assistant.svg"
              alt="AI Assistant"
              style={{
                width: 220,
                height: "auto",
                filter: "drop-shadow(0 24px 40px rgba(15,23,42,0.18))",
              }}
            />
          </div>
        </div>
      </div>

      <div className="glass strong" style={{ padding: 16 }}>
        {/* Твой текущий виджет диалога/Conversation Mode остаётся. Здесь только оболочка */}
        <AiAssistantWidget />
      </div>

      <style jsx>{`
        @media (max-width: 980px) {
          div[style*="grid-template-columns: 1.35fr 0.65fr"] {
            grid-template-columns: 1fr !important;
          }
          img { width: 200px !important; }
        }
      `}</style>
    </DkrsAppShell>
  );
}
