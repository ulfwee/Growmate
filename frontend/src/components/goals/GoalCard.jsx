import React, { useEffect, useState } from 'react';
import GoalProgress from './GoalProgress';
import MilestoneList from './MilestoneList';

const STATUS_LABELS = {
  planned: 'Запланована',
  active: 'Активна',
  completed: 'Досягнута',
  cancelled: 'Скасована',
};

const CATEGORIES = {
  learning: { label: 'Навчання', icon: '📚', color: '#7c5c9c' },
  health: { label: 'Здоровʼя', icon: '💪', color: '#3d8b6e' },
  career: { label: 'Карʼєра', icon: '💼', color: '#4a6fa5' },
  finance: { label: 'Фінанси', icon: '💰', color: '#b08a2e' },
  personal: { label: 'Особисте', icon: '🌱', color: '#5a9a7a' },
  other: { label: 'Інше', icon: '🎯', color: '#8a7a95' },
};

function formatDate(value) {
  if (!value) return null;
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat('uk-UA', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(date);
}

function formatDateRange(start, end) {
  const s = formatDate(start);
  const e = formatDate(end);

  if (s && e) return `${s} — ${e}`;
  if (s) return `з ${s}`;
  if (e) return `до ${e}`;
  return 'Дати не вказано';
}

export default function GoalCard({ goal, onEdit, onDelete, onChanged, viewMode = 'cards' }) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [goal.id]);

  const category = CATEGORIES[goal.category] || CATEGORIES.other;
  const statusLabel = STATUS_LABELS[goal.status] || goal.status;
  const progress = Math.min(100, Math.max(0, Number(goal.progress) || 0));

  if (viewMode === 'list') {
    return (
      <article className={`goal-row ${expanded ? 'goal-row-expanded' : ''}`}>
        <div className="goal-row-main">
          <div className="goal-row-left">
            <span
              className="goal-category-icon"
              style={{ background: `${category.color}18`, color: category.color }}
            >
              {category.icon}
            </span>

            <div className="goal-row-info">
              <div className="goal-row-title-line">
                <h3>{goal.title}</h3>
                <span className={`goal-status goal-status-${goal.status}`}>{statusLabel}</span>
              </div>

              {goal.description && <p className="goal-row-desc">{goal.description}</p>}

              <div className="goal-row-meta">
                <span>{formatDateRange(goal.startDate, goal.deadline)}</span>
                <span className="goal-row-progress-text">{Math.round(progress)}%</span>
              </div>
            </div>
          </div>

          <div className="goal-row-right">
            <div className="goal-row-progress">
              <div className="goal-progress-track">
                <div className="goal-progress-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <div className="goal-card-actions">
              <button type="button" onClick={onEdit} title="Редагувати" aria-label="Редагувати">✎</button>
              <button type="button" onClick={onDelete} title="Видалити" aria-label="Видалити">×</button>
            </div>

            <button
              type="button"
              className="goal-expand-icon-btn"
              onClick={() => setExpanded(value => !value)}
              aria-expanded={expanded}
              title={expanded ? 'Згорнути етапи' : 'Показати етапи'}
            >
              <span className={expanded ? 'goal-chevron goal-chevron-open' : 'goal-chevron'}>⌄</span>
            </button>
          </div>
        </div>

        {expanded && (
          <div className="goal-row-milestones">
            <MilestoneList goal={goal} onGoalChanged={onChanged} />
          </div>
        )}
      </article>
    );
  }

  return (
    <article className={`goal-card ${expanded ? 'goal-card-expanded' : ''}`}>
      <div className="goal-card-header">
        <div className="goal-card-header-left">
          <span
            className="goal-category-icon"
            style={{ background: `${category.color}18`, color: category.color }}
          >
            {category.icon}
          </span>

          <div>
            <h3>{goal.title}</h3>
            <span className={`goal-status goal-status-${goal.status}`}>{statusLabel}</span>
          </div>
        </div>

        <div className="goal-card-actions">
          <button type="button" onClick={onEdit} title="Редагувати ціль" aria-label="Редагувати ціль">✎</button>
          <button type="button" onClick={onDelete} title="Видалити ціль" aria-label="Видалити ціль">×</button>
        </div>
      </div>

      {goal.description && <p className="goal-card-desc">{goal.description}</p>}

      <div className="goal-card-progress-block">
        <GoalProgress progress={progress} />
      </div>

      <div className="goal-card-footer">
        <span className="goal-card-dates">{formatDateRange(goal.startDate, goal.deadline)}</span>
        <button
          type="button"
          className="goal-expand-btn"
          onClick={() => setExpanded(value => !value)}
          aria-expanded={expanded}
        >
          {expanded ? 'Згорнути' : 'Етапи'}
          <span className={expanded ? 'goal-chevron goal-chevron-open' : 'goal-chevron'}>⌄</span>
        </button>
      </div>

      {expanded && <MilestoneList goal={goal} onGoalChanged={onChanged} />}
    </article>
  );
}