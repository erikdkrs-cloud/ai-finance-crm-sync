import React, { useState } from 'react';
import { useRouter } from 'next/router';

const AiFloatingButton = () => {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const [tooltip, setTooltip] = useState(false);

  return (
    <div
      className="ai-fab-wrapper"
      onMouseEnter={() => { setHovered(true); setTooltip(true); }}
      onMouseLeave={() => { setHovered(false); setTimeout(() => setTooltip(false), 300); }}
    >
      {tooltip && (
        <div className={`ai-fab-tooltip ${hovered ? 'visible' : ''}`}>
          💡 Спросите AI-помощника
        </div>
      )}
      <button
        className={`ai-fab ${hovered ? 'hovered' : ''}`}
        onClick={() => router.push('/assistant')}
        title="AI Помощник"
      >
        <span className="ai-fab-icon">🤖</span>
        <span className="ai-fab-pulse" />
        <span className="ai-fab-pulse delay" />
      </button>
    </div>
  );
};

export default AiFloatingButton;
