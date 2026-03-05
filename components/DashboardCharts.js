import React, { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Filler, Tooltip, Legend
);

const COLORS = {
  teal: { bg: "rgba(0,191,166,0.15)", border: "rgba(0,191,166,1)" },
  violet: { bg: "rgba(124,77,255,0.15)", border: "rgba(124,77,255,1)" },
  rose: { bg: "rgba(251,113,133,0.15)", border: "rgba(251,113,133,1)" },
  amber: { bg: "rgba(251,191,36,0.15)", border: "rgba(251,191,36,1)" },
};

const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: "index", intersect: false },
  plugins: {
    legend: {
      position: "top",
      labels: {
        usePointStyle: true, pointStyle: "circle", padding: 16,
        font: { size: 12, weight: "600" },
      },
    },
    tooltip: {
      backgroundColor: "rgba(15,23,42,0.85)",
      titleFont: { size: 13, weight: "700" },
      bodyFont: { size: 12 },
      padding: 12, cornerRadius: 10, displayColors: true,
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { font: { size: 11, weight: "600" }, color: "rgba(100,116,139,0.8)" },
    },
    y: {
      grid: { color: "rgba(148,163,184,0.1)" },
      ticks: {
        font: { size: 11, weight: "600" }, color: "rgba(100,116,139,0.8)",
        callback: (v) => {
          if (v >= 1000000) return (v / 1000000).toFixed(1) + "M";
          if (v >= 1000) return (v / 1000).toFixed(0) + "K";
          return v;
        },
      },
    },
  },
  elements: {
    point: { radius: 4, hoverRadius: 7, borderWidth: 2, backgroundColor: "#fff" },
    line: { tension: 0.35, borderWidth: 2.5 },
    bar: { borderRadius: 8, borderSkipped: false },
  },
};

function marginOptions() {
  return {
    ...baseOptions,
    scales: {
      ...baseOptions.scales,
      y: {
        ...baseOptions.scales.y,
        ticks: {
          ...baseOptions.scales.y.ticks,
          callback: (v) => v + "%",
        },
      },
    },
  };
}

export default function DashboardCharts({ months = [] }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!months.length) return;
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const recent = months.slice(0, 6).reverse();
        const results = await Promise.all(
          recent.map(async (m) => {
            try {
              const r = await fetch(`/api/dashboard?month=${encodeURIComponent(m)}`);
              const d = await r.json();
              return { month: m, ...(d?.totals || {}) };
            } catch {
              return { month: m, revenue: 0, costs: 0, profit: 0, margin: 0 };
            }
          })
        );
        if (alive) setData(results);
      } catch {}
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [months]);

  if (loading || !data) {
    return (
      <div className="charts-loading">
        <div className="loader-spinner" />
        <span>Загрузка графиков...</span>
      </div>
    );
  }

  const labels = data.map((d) => d.month);
  const revenue = data.map((d) => Number(d.revenue || 0));
  const costs = data.map((d) => Number(d.costs || 0));
  const profit = data.map((d) => Number(d.profit || 0));
  const margin = data.map((d) => {
    const m = Number(d.margin || 0);
    return m <= 1.5 ? +(m * 100).toFixed(1) : +m.toFixed(1);
  });

  return (
    <div className={`dashboard-charts ${mounted ? "mounted" : ""}`}>
      <div className="charts-grid">
        <div className="chart-card glass-card">
          <div className="chart-card-header">
            <div>
              <h3>📈 Выручка vs Расходы</h3>
              <p>Динамика за последние 6 месяцев</p>
            </div>
            <span className="chart-badge teal">Тренд</span>
          </div>
          <div className="chart-canvas-wrapper">
            <Line
              data={{
                labels,
                datasets: [
                  { label: "Выручка", data: revenue, fill: true, backgroundColor: COLORS.teal.bg, borderColor: COLORS.teal.border },
                  { label: "Расходы", data: costs, fill: true, backgroundColor: COLORS.rose.bg, borderColor: COLORS.rose.border },
                ],
              }}
              options={baseOptions}
            />
          </div>
        </div>

        <div className="chart-card glass-card">
          <div className="chart-card-header">
            <div>
              <h3>💰 Прибыль</h3>
              <p>По месяцам</p>
            </div>
            <span className="chart-badge violet">Бар</span>
          </div>
          <div className="chart-canvas-wrapper">
            <Bar
              data={{
                labels,
                datasets: [{
                  label: "Прибыль", data: profit, borderWidth: 2,
                  backgroundColor: profit.map((v) => v >= 0 ? COLORS.teal.bg : COLORS.rose.bg),
                  borderColor: profit.map((v) => v >= 0 ? COLORS.teal.border : COLORS.rose.border),
                }],
              }}
              options={baseOptions}
            />
          </div>
        </div>

        <div className="chart-card glass-card chart-card-wide">
          <div className="chart-card-header">
            <div>
              <h3>📊 Маржинальность %</h3>
              <p>Тренд маржи по периодам</p>
            </div>
            <span className="chart-badge amber">%</span>
          </div>
          <div className="chart-canvas-wrapper">
            <Line
              data={{
                labels,
                datasets: [{
                  label: "Маржа %", data: margin, fill: true,
                  backgroundColor: COLORS.violet.bg, borderColor: COLORS.violet.border,
                }],
              }}
              options={marginOptions()}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
