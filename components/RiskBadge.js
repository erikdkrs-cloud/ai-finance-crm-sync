import React from 'react';

const RISK_MAP = {
  green:  { className: 'risk-low',     label: 'НИЗКИЙ' },
  yellow: { className: 'risk-medium',  label: 'СРЕДНИЙ' },
  red:    { className: 'risk-high',    label: 'ВЫСОКИЙ' },
};

const RiskBadge = ({ riskLevel }) => {
  const key = (riskLevel || '').toLowerCase();
  const config = RISK_MAP[key] || { className: 'risk-unknown', label: '—' };

  return (
    <span className={`risk-badge ${config.className}`}>
      <span className="dot" />
      {config.label}
    </span>
  );
};

export default RiskBadge;
