import React from 'react';

const Icon = ({ path, className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d={path} />
  </svg>
);

const KpiCard = ({ title, value, icon }) => {
  const icons = {
    revenue: <Icon path="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14h2v-6h-2v6zm0-8h2V6h-2v2z" className="kpi-card-icon kpi-icon-revenue" />,
    costs: <Icon path="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm-5-9h10v2H7v-2z" className="kpi-card-icon kpi-icon-costs" />,
    profit: <Icon path="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5h-2V15c0-.55.45-1 1-1s1 .45 1 1v1.5zm0-4.5h-2V8c0-.55.45-1 1-1s1 .45 1 1v3z" className="kpi-card-icon kpi-icon-profit" />,
    margin: <Icon path="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm-4-4h8v-2H8v2zm0-4h8V8H8v2z" className="kpi-card-icon kpi-icon-margin" />,
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
