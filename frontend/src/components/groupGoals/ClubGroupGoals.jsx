import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getGroupGoals, createGroupGoal, updateGroupGoal,
  deleteGroupGoal, joinGroupGoal, leaveGroupGoal,
} from '../../services/groupGoalsService';
import GroupGoalModal from './GroupGoalModal';
import ConfirmDialog from '../ConfirmDialog';
import { useToast } from '../ToastProvider';
import '../../css/GroupGoals.css';

const statusNames = {
  planned: 'Запланована', active: 'Активна',
  completed: 'Завершена', cancelled: 'Скасована',
};

const formatDate = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString('uk-UA') : '—';

export default function ClubGroupGoals({ clubId, canManage = false, onUserStatsChanged }) {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalGoal, setModalGoal] = useState(undefined);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const reload = useCallback(async () => {
    const data = await getGroupGoals(clubId);
    setGoals(Array.isArray(data) ? data : []);
  }, [clubId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    getGroupGoals(clubId)
      .then(data => {
        if (active) setGoals(Array.isArray(data) ? data : []);
      })
      .catch(err => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [clubId]);

  const saveGoal = async data => {
    setSaving(true);
    try {
      if (modalGoal) await updateGroupGoal(clubId, modalGoal.id, data);
      else await createGroupGoal(clubId, data);

      await reload();
      showToast(modalGoal ? 'Групову ціль оновлено.' : 'Групову ціль створено.');
      setModalGoal(undefined);
      setError('');
    } finally {
      setSaving(false);
    }
  };

  const toggleParticipation = async goal => {
    if (busyId !== null) return;
    setBusyId(goal.id);
    setError('');

    try {
      if (goal.isParticipant) await leaveGroupGoal(clubId, goal.id);
      else await joinGroupGoal(clubId, goal.id);

      await reload();
      await onUserStatsChanged?.();
      showToast(goal.isParticipant ? 'Ви залишили групову ціль.' : 'Ви долучилися до групової цілі.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const removeGoal = async () => {
    if (!confirmAction) return;
    const goalId = confirmAction.id;
    setBusyId(goalId);

    try {
      await deleteGroupGoal(clubId, goalId);
      await reload();
      showToast('Групову ціль видалено.');
      setConfirmAction(null);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="gg-section">
      <div className="gg-heading">
        <div>
          <h2>Групові цілі</h2>
          <p>Досягайте спільних результатів та відстежуйте свій внесок у прогрес клубу.</p>
        </div>
        {canManage && (
          <button type="button" className="gg-btn-primary" onClick={() => setModalGoal(null)}>
            + Створити ціль
          </button>
        )}
      </div>

      {error && (
        <div className="gg-error-banner">
          {error}
          <button type="button" onClick={() => {
            reload().then(() => setError('')).catch(err => setError(err.message));
          }}>Повторити</button>
        </div>
      )}

      {loading ? (
        <div className="gg-empty">Завантаження цілей...</div>
      ) : goals.length === 0 ? (
        <div className="gg-empty">
          <h3>Групових цілей поки немає</h3>
          <p>{canManage
            ? 'Створіть першу ціль для вашого клубу.'
            : 'Коли власник або модератор створить ціль, вона з’явиться тут.'}</p>
        </div>
      ) : (
        <div className="gg-grid">
          {goals.map(goal => (
            <article className="gg-card" key={goal.id}>
              <div className="gg-card-top">
                <span className={`gg-status gg-status-${goal.status}`}>{statusNames[goal.status] || goal.status}</span>
                {goal.isParticipant && <span className="gg-joined">Ви берете участь</span>}
              </div>

              <h3>{goal.title}</h3>
              <p className="gg-description">{goal.description || 'Опис цілі не додано.'}</p>
              <div className="gg-progress-label">
                <span>Загальний прогрес</span>
                <strong>{Math.round(goal.progress ?? 0)}%</strong>
              </div>
              <div className="gg-progress-track" role="progressbar" aria-valuenow={goal.progress ?? 0} aria-valuemin={0} aria-valuemax={100}>
                <div style={{ width: `${Math.max(0, Math.min(100, goal.progress ?? 0))}%` }} />
              </div>
              {goal.isParticipant && (
                <div className="gg-my-progress">Мій прогрес: <strong>{Math.round(goal.myProgress ?? 0)}%</strong></div>
              )}
              <div className="gg-meta">
                <span>Учасників: {goal.participantsCount ?? 0}</span>
                <span>Завдань: {goal.tasksCount ?? 0}</span>
                <span>До {formatDate(goal.endDate)}</span>
              </div>

              <div className="gg-card-actions">
                <button type="button" className="gg-btn-secondary" onClick={() => navigate(`/clubs/${clubId}/group-goals/${goal.id}`)}>
                  Детальніше
                </button>

                {goal.isParticipant ? (
                  <button type="button" className="gg-btn-text" disabled={busyId !== null} onClick={() => setConfirmAction({
                    type: 'leave', id: goal.id, title: goal.title,
                  })}>Вийти</button>
                ) : goal.status === 'active' ? (
                  <button type="button" className="gg-btn-primary" disabled={busyId !== null} onClick={() => toggleParticipation(goal)}>
                    {busyId === goal.id ? 'Зачекайте...' : 'Долучитися'}
                  </button>
                ) : null}

                {canManage && (
                  <>
                    <button type="button" className="gg-btn-text" onClick={() => setModalGoal(goal)}>Редагувати</button>
                    <button type="button" className="gg-btn-danger" onClick={() => setConfirmAction({
                      type: 'delete', id: goal.id, title: goal.title,
                    })}>Видалити</button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {modalGoal !== undefined && (
        <GroupGoalModal
          key={modalGoal?.id ?? 'new'}
          goal={modalGoal}
          saving={saving}
          onSave={saveGoal}
          onClose={() => { if (!saving) setModalGoal(undefined); }}
        />
      )}

      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmAction?.type === 'delete' ? 'Видалити групову ціль?' : 'Залишити групову ціль?'}
        message={confirmAction?.type === 'delete'
          ? `Видалити «${confirmAction.title}» разом із завданнями? Цю дію неможливо скасувати.`
          : `Вийти з цілі «${confirmAction?.title ?? ''}»? Ваші відмітки виконання завдань будуть видалені.`}
        confirmText={confirmAction?.type === 'delete' ? 'Видалити' : 'Вийти'}
        variant="danger"
        loading={busyId !== null}
        onCancel={() => { if (busyId === null) setConfirmAction(null); }}
        onConfirm={async () => {
          if (confirmAction?.type === 'delete') {
            await removeGoal();
          } else {
            const goal = goals.find(g => g.id === confirmAction?.id);
            if (goal) {
              await toggleParticipation(goal);
              setConfirmAction(null);
            }
          }
        }}
      />
    </section>
  );
}