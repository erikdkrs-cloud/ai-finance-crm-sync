import React from 'react';

const Icon = ({ path, className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d={path} />
  </svg>
);

const KpiCard = ({ title, value, icon, trend }) => {
  const icons = {
    revenue: <Icon path="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z" className="kpi-card-icon kpi-icon-revenue" />,
    costs: <Icon path="M16 18l2.29-2.29-4.88-4.88-4 4L2 7.41 3.41 6l6 6 4-4 6.3 6.29L22 12v6h-6z" className="kpi-card-icon kpi-icon-costs" />,
    profit: <Icon path="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99l1.5 1.5z" className="kpi-card-icon kpi-icon-profit" />,
    margin: <Icon path="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zM7 11h10v2H7z" className="kpi-card-icon kpi-icon-margin" />,
  };
  
  const isPositive = trend?.startsWith('+');

  return (
    <div className="kpi-card glass-card">
      <div className="kpi-card-content">
        <p className="kpi-card-title">{title}</p>
        <h3 className="kpi-card-value">{value}</h3>
        {trend && <span className={`kpi-trend ${isPositive ? 'positive' : 'negative'}`}>{trend}</span>}
      </div>
      <div className="kpi-card-icon-wrapper">
        {icons[icon] || null}
      </div>
    </div>
  );
};
export default KpiCard;
