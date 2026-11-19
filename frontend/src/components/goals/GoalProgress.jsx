import React from 'react';

export default function GoalProgress({ progress = 0 }) {
  const value = Math.min(100, Math.max(0, Number(progress) || 0));

  return (
    <div className="goal-progress">
      <div className="goal-progress-label">
        <span>Прогрес</span>
        <strong>{Math.round(value)}%</strong>
      </div>
      <div
        className="goal-progress-track"
        role="progressbar"
        aria-valuenow={Math.round(value)}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-label="Прогрес цілі"
      >
        <div className="goal-progress-fill" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}