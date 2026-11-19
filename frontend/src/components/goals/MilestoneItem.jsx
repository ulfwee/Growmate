import React from 'react';

function formatDate(value) {
  if (!value) return null;
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat('uk-UA', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(date);
}

export default function MilestoneItem({ milestone, tasks = [], onToggle, onEdit, onDelete, busy = false }) {
  const progress = Math.min(100, Math.max(0, Number(milestone.progress) || 0));
  const hasTasks = tasks.length > 0;
  const canToggle = !hasTasks && milestone.canCompleteManually !== false;
  const completedTasks = tasks.filter(task => task.status === 'completed').length;

  return (
    <div className={`milestone-item ${milestone.isCompleted ? 'milestone-item-completed' : ''}`}>
      <div className="milestone-item-main">
        <div className="milestone-item-top">
          <div className="milestone-title-group">
            <label
              className="milestone-check-wrap"
              title={canToggle ? 'Позначити етап виконаним' : 'Етап завершується автоматично'}
            >
              <input
                className="milestone-checkbox"
                type="checkbox"
                checked={Boolean(milestone.isCompleted)}
                disabled={!canToggle || busy}
                onChange={event => onToggle(event.target.checked)}
                aria-label={`Виконання етапу «${milestone.title}»`}
              />
              <strong>{milestone.title}</strong>
            </label>
          </div>
          <span className="milestone-percent">{Math.round(progress)}%</span>
        </div>

        {milestone.description && <p className="milestone-description">{milestone.description}</p>}

        <div
          className="milestone-progress-track"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <div className="milestone-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <div className="milestone-item-meta">
          <span>
            {milestone.isCompleted
              ? 'Етап виконано'
              : milestone.dueDate ? `До ${formatDate(milestone.dueDate)}` : 'Без дедлайну'}
          </span>
          {hasTasks && <span>{completedTasks} із {tasks.length} завдань виконано</span>}
        </div>

        {hasTasks && (
          <div className="milestone-linked-tasks">
            {tasks.map(task => {
              const completed = task.status === 'completed';

              return (
                <div className="milestone-linked-task" key={task.id}>
                  <span className={`linked-task-check ${completed ? 'completed' : ''}`} aria-hidden="true">
                    {completed ? '✓' : ''}
                  </span>
                  <span className={`linked-task-title ${completed ? 'linked-task-done' : ''}`}>
                    {task.title}
                  </span>
                  {task.isRecurring && <span className="linked-task-recurring">Повторюване</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="milestone-item-actions">
        <button type="button" onClick={onEdit} title="Редагувати етап" aria-label="Редагувати етап">✎</button>
        <button type="button" onClick={onDelete} title="Видалити етап" aria-label="Видалити етап">×</button>
      </div>
    </div>
  );
}