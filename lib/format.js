// lib/format.js
export function fmtMoney(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
  const x = Number(n);
  return x.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
}

export function fmtPct(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
  const x = Number(n);
  return x.toLocaleString("ru-RU", { maximumFractionDigits: 2 }) + "%";
}

export function clampRisk(risk) {
  const v = String(risk || "").toLowerCase();
  if (v.includes("high") || v.includes("danger") || v.includes("red")) return "high";
  if (v.includes("med") || v.includes("warn") || v.includes("yellow")) return "medium";
  return "low";
}

export function riskLabel(risk) {
  const r = clampRisk(risk);
  if (r === "high") return "HIGH";
  if (r === "medium") return "MED";
  return "LOW";
}
