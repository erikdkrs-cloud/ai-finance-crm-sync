import React from 'react';

const RiskBadge = ({ riskLevel }) => {
  const getRiskDetails = (level) => {
    switch (level?.toUpperCase()) {
      case 'LOW':
        return { text: 'НИЗКИЙ', className: 'risk-low' };
      case 'MEDIUM':
      case 'MED':
        return { text: 'СРЕДНИЙ', className: 'risk-medium' };
      case 'HIGH':
        return { text: 'ВЫСОКИЙ', className: 'risk-high' };
      default:
        return { text: 'НЕОПРЕДЕЛЕН', className: 'risk-unknown' };
    }
  };

  const { text, className } = getRiskDetails(riskLevel);

  return (
    <span className={`risk-badge ${className}`}>
      {text}
    </span>
  );
};

export default RiskBadge;
