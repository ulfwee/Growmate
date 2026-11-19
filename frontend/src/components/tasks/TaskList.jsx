import React from 'react';
import TaskItem from './TaskItem';

export default function TaskList({ tasks, goals, busyId, refreshVersion, onToggle, onGroupToggle, onOpenGroupGoal, onEdit, onDelete, onOccurrenceChanged }) {
  return (
    <div className="tasks-list">
      {tasks.map(task => {
        const isGroup = task.source === 'group';
        const goalTitle = task.goalTitle || goals.find(goal => String(goal.id) === String(task.goalId))?.title;
        const taskBusyKey = isGroup ? `group-${task.groupGoalId}-${task.id}` : `personal-${task.id}`;

        return (
          <TaskItem
            key={task.uniqueId ?? taskBusyKey}
            task={task}
            goalTitle={goalTitle}
            busy={busyId === taskBusyKey}
            refreshVersion={refreshVersion}
            onToggle={isGroup ? onGroupToggle : onToggle}
            onOpenGroupGoal={onOpenGroupGoal}
            onEdit={onEdit}
            onDelete={onDelete}
            onOccurrenceChanged={onOccurrenceChanged}
          />
        );
      })}
    </div>
  );
}