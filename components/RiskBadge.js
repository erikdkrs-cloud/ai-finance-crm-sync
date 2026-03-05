import React from 'react';

const RiskBadge = ({ riskLevel }) => {
  const getRiskDetails = (level) => {
    switch (level?.toUpperCase()) {
      case 'LOW':
      case 'GREEN':
        return { text: 'НИЗКИЙ', className: 'risk-low' };
      case 'MEDIUM':
      case 'MED':
      case 'YELLOW':
        return { text: 'СРЕДНИЙ', className: 'risk-medium' };
      case 'HIGH':
      case 'RED':
        return { text: 'ВЫСОКИЙ', className: 'risk-high' };
      default:
        return { text: 'НЕИЗВЕСТНО', className: 'risk-unknown' };
    }
  };

  const { text, className } = getRiskDetails(riskLevel);

  return (
    <span className={`risk-badge ${className}`}>
      <span className="dot"></span>
      {text}
    </span>
  );
};

export default RiskBadge;
