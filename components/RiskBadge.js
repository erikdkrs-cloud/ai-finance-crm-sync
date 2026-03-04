// components/RiskBadge.js
import React from "react";
import { clampRisk, riskLabel } from "../lib/format";

export default function RiskBadge({ risk }) {
  const r = clampRisk(risk);
  const cls = r === "high" ? "danger" : r === "medium" ? "warn" : "ok";

  return (
    <span className={`badge ${cls}`}>
      <span className="dot" />
      {riskLabel(r)}
    </span>
  );
}
