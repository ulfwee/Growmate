import React, { useState } from 'react';
import TaskSubmissionStatus from '../groupGoalsTasks/TaskSubmissionStatus';
import RecurringTodayCheckbox from './RecurringTodayCheckbox';
import RecurringOccurrences from './RecurringOccurrences';
import { PRIORITIES, REPEAT_LABELS, formatDate } from './taskUtils';

export default function TaskItem({ task, goalTitle, busy, refreshVersion, onToggle, onOpenGroupGoal, onEdit, onDelete, onOccurrenceChanged }) {
  const [expanded, setExpanded] = useState(false);
  const isGroup = task.source === 'group';
  const isCompleted = task.status === 'completed';
  const dueDate = task.dueDate ? formatDate(task.dueDate) : 'Без дати';

  return (
    <article className={[
      'tasks-recurring-card', isGroup ? 'tasks-group-card' : '', isCompleted ? 'tasks-card-completed' : '',
    ].filter(Boolean).join(' ')}>
      <div className="tasks-list-row">
        {isGroup ? null : task.isRecurring ? (
          <RecurringTodayCheckbox task={task} refreshVersion={refreshVersion} onChanged={onOccurrenceChanged} />
        ) : (
          <label className="tasks-check">
            <input
              type="checkbox"
              checked={isCompleted}
              disabled={busy || (isGroup && ['completed', 'cancelled'].includes(task.groupGoalStatus))}
              onChange={() => onToggle(task)}
              aria-label={`Виконати «${task.title}»`}
            />
            <span />
          </label>
        )}

        <div className="tasks-row-info">
          <div className="tasks-row-title">{task.title}</div>
          <div className="tasks-row-details">
            {isGroup && <span className="tasks-group-badge">Групове завдання</span>}
            {goalTitle && <span>{isGroup ? `Групова ціль: ${goalTitle}` : goalTitle}</span>}
            {isGroup && task.clubName && <span>Клуб: {task.clubName}</span>}
            {!isGroup && task.milestoneTitle && <span className="tasks-milestone-label">Етап: {task.milestoneTitle}</span>}
            {task.isRecurring && !isGroup && (
              <span>
                {REPEAT_LABELS[task.recurrenceRule] || 'Повторюване'}{' · '}
                {formatDate(task.startDate)}{' — '}{formatDate(task.endDate)}
              </span>
            )}
            {isGroup && task.description && <span className="tasks-group-description">{task.description}</span>}
          </div>
        </div>

        {isGroup && <TaskSubmissionStatus task={task} canSubmit={!busy && !['completed', 'cancelled'].includes(task.groupGoalStatus)} onSubmit={onToggle} />}
        {!isGroup && <span className={`tasks-priority tasks-priority-${task.priority}`}>{PRIORITIES[task.priority] || 'Середній'}</span>}
        {!task.isRecurring && <span className="tasks-row-date">{dueDate}</span>}

        <div className="tasks-row-actions">
          {isGroup ? (
            <button type="button" className="tasks-group-open" onClick={() => onOpenGroupGoal(task)} title="Відкрити групову ціль">
              Перейти до цілі
            </button>
          ) : (
            <>
              {task.isRecurring && (
                <button type="button" className="tasks-recurring-open" onClick={() => setExpanded(current => !current)} aria-expanded={expanded} title="Виконання за датами">
                  {expanded ? '⌃' : '⌄'}
                </button>
              )}
              <button type="button" className="tasks-icon-button" onClick={() => onEdit(task)} disabled={busy} aria-label="Редагувати завдання" title="Редагувати">✎</button>
              <button type="button" className="tasks-icon-button" onClick={() => onDelete(task)} disabled={busy} aria-label="Видалити завдання" title="Видалити">×</button>
            </>
          )}
        </div>
      </div>
      {task.isRecurring && expanded && !isGroup && (
        <RecurringOccurrences task={task} refreshVersion={refreshVersion} onChanged={onOccurrenceChanged} />
      )}
    </article>
  );
}