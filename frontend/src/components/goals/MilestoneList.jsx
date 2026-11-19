import React, { useCallback, useEffect, useState } from 'react';
import MilestoneItem from './MilestoneItem';
import MilestoneModal from './MilestoneModal';
import {
  getMilestones, getGoalTasks, createMilestone, updateMilestone,
  deleteMilestone, changeMilestoneCompletion,
} from '../../services/goalsService';

export default function MilestoneList({ goal, onGoalChanged }) {
  const goalId = goal.id;

  const [milestones, setMilestones] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const loadData = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);

    try {
      const [milestoneData, taskData] = await Promise.all([
        getMilestones(goalId), getGoalTasks(goalId),
      ]);

      setMilestones(Array.isArray(milestoneData) ? milestoneData : []);
      setTasks(Array.isArray(taskData) ? taskData : []);
      setError('');
    } catch (err) {
      setError(err.message || 'Не вдалося завантажити дані.');
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [goalId]);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  const handleSave = async data => {
    setSaving(true);
    setError('');

    try {
      if (editingMilestone) await updateMilestone(goalId, editingMilestone.id, data);
      else await createMilestone(goalId, data);

      setModalOpen(false);
      setEditingMilestone(null);
      await loadData();
      await onGoalChanged?.();
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (milestone, completed) => {
    const relatedTasks = tasks.filter(task => String(task.milestoneId) === String(milestone.id));

    if (relatedTasks.length > 0 || milestone.canCompleteManually === false) {
      setError('Цей етап завершується автоматично через виконання завдань.');
      return;
    }

    setBusyId(milestone.id);
    setError('');

    try {
      await changeMilestoneCompletion(goalId, milestone.id, completed);
      await loadData();
      await onGoalChanged?.();
    } catch (err) {
      setError(err.message || 'Не вдалося змінити статус етапу.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async milestone => {
    const confirmed = window.confirm(`Видалити етап «${milestone.title}»?`);
    if (!confirmed) return;

    setBusyId(milestone.id);
    setError('');

    try {
      await deleteMilestone(goalId, milestone.id);
      await loadData();
      await onGoalChanged?.();
    } catch (err) {
      setError(err.message || 'Не вдалося видалити етап.');
    } finally {
      setBusyId(null);
    }
  };

  const directTasks = tasks.filter(task => task.milestoneId == null);
  const completedCount = milestones.filter(milestone => milestone.isCompleted).length;

  return (
    <div className="milestone-list">
      <div className="milestone-list-heading">
        <div>
          <h4>Етапи цілі</h4>
          {!loading && <span>{completedCount} із {milestones.length} виконано</span>}
        </div>

        <button
          type="button"
          className="milestone-add-btn"
          onClick={() => {
            setEditingMilestone(null);
            setModalOpen(true);
          }}
        >
          ＋ Додати етап
        </button>
      </div>

      {error && (
        <div className="milestone-error">
          <span>{error}</span>
          <button type="button" onClick={() => loadData(true)}>Повторити</button>
        </div>
      )}

      {loading ? (
        <p className="milestone-message">Завантаження...</p>
      ) : (
        <>
          {milestones.length === 0 && directTasks.length === 0 && (
            <div className="milestone-empty">
              <p>Поки що немає етапів або завдань.</p>
              <span>Додай етап або пов'яжи завдання з цією ціллю.</span>
            </div>
          )}

          <div className="milestone-items">
            {milestones.map(milestone => {
              const relatedTasks = tasks.filter(task => String(task.milestoneId) === String(milestone.id));

              return (
                <MilestoneItem
                  key={milestone.id}
                  milestone={milestone}
                  tasks={relatedTasks}
                  onToggle={completed => {
                    if (busyId !== null) return;
                    handleToggle(milestone, completed);
                  }}
                  onEdit={() => {
                    setEditingMilestone(milestone);
                    setModalOpen(true);
                  }}
                  onDelete={() => {
                    if (busyId !== null) return;
                    handleDelete(milestone);
                  }}
                />
              );
            })}
          </div>

          {directTasks.length > 0 && (
            <div className="goal-direct-tasks">
              <h4>Завдання основної цілі</h4>

              {directTasks.map(task => (
                <div className="milestone-linked-task" key={task.id}>
                  <span className={task.status === 'completed' ? 'linked-task-check completed' : 'linked-task-check'}>
                    {task.status === 'completed' ? '✓' : ''}
                  </span>
                  <span className={task.status === 'completed' ? 'linked-task-done' : ''}>
                    {task.title}
                  </span>
                  {task.isRecurring && <span className="linked-task-recurring">Повторюване</span>}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {modalOpen && (
        <MilestoneModal
          milestone={editingMilestone}
          goal={goal}
          saving={saving}
          onClose={() => {
            if (saving) return;
            setModalOpen(false);
            setEditingMilestone(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}