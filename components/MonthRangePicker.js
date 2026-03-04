// components/MonthRangePicker.js
import React, { useMemo } from "react";

function ArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 12h10m0 0-4-4m4 4-4 4"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 3v3M17 3v3M4 8h16M6 6h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function MonthRangePicker({
  months = [],
  startMonth,
  endMonth,
  onChange,
}) {
  const list = useMemo(() => {
    const arr = Array.isArray(months) ? months : [];
    // months приходят DESC (как у тебя в API)
    return arr;
  }, [months]);

  function setStart(v) {
    const nextStart = v;
    let nextEnd = endMonth;

    // ensure start <= end lexicographically for YYYY-MM
    if (nextEnd && nextStart && nextStart > nextEnd) nextEnd = nextStart;

    onChange?.({ startMonth: nextStart, endMonth: nextEnd });
  }

  function setEnd(v) {
    const nextEnd = v;
    let nextStart = startMonth;

    if (nextStart && nextEnd && nextStart > nextEnd) nextStart = nextEnd;

    onChange?.({ startMonth: nextStart, endMonth: nextEnd });
  }

  return (
    <div className="dkrs-pill" style={{ gap: 10, padding: "8px 10px" }}>
      <span
        style={{
          width: 34,
          height: 34,
          borderRadius: 14,
          border: "1px solid rgba(148,163,184,0.28)",
          background: "rgba(255,255,255,0.70)",
          boxShadow: "0 10px 24px rgba(15,23,42,0.06)",
          display: "grid",
          placeItems: "center",
          color: "rgba(100,116,139,0.95)",
        }}
        title="Период"
      >
        <CalendarIcon />
      </span>

      <select
        className="select"
        value={startMonth || ""}
        onChange={(e) => setStart(e.target.value)}
        style={{ width: 120 }}
        title="Начало периода"
      >
        {list.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>

      <span style={{ color: "rgba(100,116,139,0.95)", display: "grid", placeItems: "center" }}>
        <ArrowIcon />
      </span>

      <select
        className="select"
        value={endMonth || ""}
        onChange={(e) => setEnd(e.target.value)}
        style={{ width: 120 }}
        title="Конец периода"
      >
        {list.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>

      <style jsx>{`
        @media (max-width: 520px) {
          div.dkrs-pill {
            width: 100%;
            justify-content: space-between;
          }
          select.select {
            width: 46% !important;
          }
        }
      `}</style>
    </div>
  );
}
