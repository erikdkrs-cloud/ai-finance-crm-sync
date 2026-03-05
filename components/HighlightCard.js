import React from 'react';
import { fmtMoney, fmtPct, getProjectColorFromString } from '../lib/format';

const HighlightCard = ({ project, variant = 'profit' }) => {
  const isProfit = variant === 'profit';
  const icon = isProfit ? '👍' : '🔥';
  const valueClass = isProfit ? 'positive-value' : 'negative-value';

  return (
    <div className="highlight-card glass-card">
      <div className="highlight-card-header">
        <span className="highlight-card-icon">{icon}</span>
        <div className="highlight-card-title">
          <span 
            className="project-color-dot" 
            style={{ backgroundColor: getProjectColorFromString(project.project) }}>
          </span>
          <h3>{project.project}</h3>
        </div>
      </div>
      <div className="highlight-card-body">
        <p className={`highlight-card-value ${valueClass}`}>
          {fmtMoney(project.profit, 0)}
        </p>
        <p className="highlight-card-details">
          Выручка: {fmtMoney(project.revenue, 0)} • Маржа: {fmtPct(project.margin)}
        </p>
      </div>
    </div>
  );
};

export default HighlightCard;
