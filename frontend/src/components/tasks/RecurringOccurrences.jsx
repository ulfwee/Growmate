import React, { useCallback, useEffect, useState } from 'react';
import { getTaskOccurrences, setOccurrenceCompletion } from '../../services/tasksService';
import { dateKey, todayKey, formatDate, normalizeOccurrences } from './taskUtils';

export default function RecurringOccurrences({ task, refreshVersion = 0, onChanged }) {
  const [occurrences, setOccurrences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyDate, setBusyDate] = useState('');

  const load = useCallback(async () => {
    const data = await getTaskOccurrences(task.id);
    setOccurrences(normalizeOccurrences(data));
  }, [task.id]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    getTaskOccurrences(task.id)
      .then(data => { if (active) setOccurrences(normalizeOccurrences(data)); })
      .catch(err => { if (active) setError(err.message || 'Помилка завантаження.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [task.id, refreshVersion]);

  const completedCount = occurrences.filter(item => item.isCompleted).length;
  const progress = occurrences.length ? Math.round(completedCount / occurrences.length * 100) : 0;

  const toggle = async item => {
    const scheduledDate = dateKey(item.scheduledDate);
    if (scheduledDate !== todayKey() || busyDate) return;
    setBusyDate(scheduledDate);
    setError('');
    try {
      await setOccurrenceCompletion(task.id, scheduledDate, !item.isCompleted);
      await load();
      await onChanged?.();
    } catch (err) {
      setError(err.message || 'Не вдалося оновити виконання.');
    } finally {
      setBusyDate('');
    }
  };

  if (loading) return <div className="tasks-occurrences">Завантаження повторень...</div>;

  return (
    <div className="tasks-occurrences">
      <div className="tasks-occurrences-heading">
        <div>
          <strong>Виконання за датами</strong>
          <span>{completedCount} із {occurrences.length} виконано</span>
        </div>
        <strong>{progress}%</strong>
      </div>
      <div className="tasks-occurrences-track" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
        <div style={{ width: `${progress}%` }} />
      </div>
      {error && <p className="tasks-form-error">{error}</p>}
      {occurrences.length === 0 ? (
        <p className="tasks-field-hint">Запланованих виконань поки немає.</p>
      ) : (
        <div className="tasks-occurrences-grid">
          {occurrences.map(item => {
            const scheduledDate = dateKey(item.scheduledDate);
            const today = todayKey();
            const future = scheduledDate > today;
            const missed = scheduledDate < today && !item.isCompleted;
            const canEdit = scheduledDate === today;

            return (
              <label key={item.id ?? scheduledDate} className={[
                'tasks-occurrence', item.isCompleted ? 'done' : '', future ? 'future' : '', missed ? 'missed' : '',
              ].filter(Boolean).join(' ')}>
                <input type="checkbox" checked={Boolean(item.isCompleted)} disabled={!canEdit || Boolean(busyDate)} onChange={() => toggle(item)} />
                <span>{formatDate(scheduledDate)}</span>
                <small>{item.isCompleted ? 'Виконано' : future ? 'Заплановано' : missed ? 'Пропущено' : 'Не виконано'}</small>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}