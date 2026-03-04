// components/RiskBadge.js
import React from "react";
import { clampRisk } from "../lib/format";

function ruRisk(r) {
  if (r === "high") return "ВЫСОКИЙ";
  if (r === "medium") return "СРЕДНИЙ";
  return "НИЗКИЙ";
}

export default function RiskBadge({ risk }) {
  const r = clampRisk(risk);
  const cls = r === "high" ? "danger" : r === "medium" ? "warn" : "ok";

  return (
    <span className={`badge ${cls}`}>
      <span className="dot" />
      {ruRisk(r)}
    </span>
  );
}
