import React from 'react';

// Простой компонент-обертка для SVG иконок, чтобы не загромождать основной компонент
const Icon = ({ path, className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d={path} />
  </svg>
);

const KpiCard = ({ title, value, icon }) => {
  const icons = {
    revenue: <Icon path="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-10h2v6h-2v-6zm0-4h2v2h-2v-2z" className="kpi-card-icon kpi-icon-revenue" />,
    costs: <Icon path="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm-5-9h10v2H7v-2z" className="kpi-card-icon kpi-icon-costs" />,
    profit: <Icon path="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.08V15c0-1.1.9-2 2-2h1.5v-1.5H13c-1.1 0-2-.9-2-2V8h3v1.5H12v1h1.5c1.1 0 2 .9 2 2v3.08c1.39-.49 2.4-1.76 2.4-3.33C17.9 9.17 15.26 7 12 7S6.1 9.17 6.1 12.75c0 1.57 1.01 2.84 2.4 3.33z" className="kpi-card-icon kpi-icon-profit" />,
    margin: <Icon path="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm1-12h-2v6h2v-2h2v-2h-2V8z" className="kpi-card-icon kpi-icon-margin" />,
  };

  return (
    <div className="kpi-card glass-card">
      <div className="kpi-card-content">
        <p className="kpi-card-title">{title}</p>
        <h3 className="kpi-card-value">{value}</h3>
      </div>
      <div className="kpi-card-icon-wrapper">
        {icons[icon] || null}
      </div>
    </div>
  );
};

export default KpiCard;
