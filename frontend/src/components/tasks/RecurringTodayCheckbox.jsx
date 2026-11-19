import React, { useEffect, useState } from 'react';
import { getTaskOccurrences, setOccurrenceCompletion } from '../../services/tasksService';
import { dateKey, todayKey, normalizeOccurrences } from './taskUtils';

export default function RecurringTodayCheckbox({ task, refreshVersion = 0, onChanged }) {
  const [occurrence, setOccurrence] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const today = todayKey();

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await getTaskOccurrences(task.id);
        if (!active) return;
        const occurrences = normalizeOccurrences(data);
        const current = occurrences.find(item => dateKey(item.scheduledDate) === today);
        setOccurrence(current || null);
      } catch (err) {
        if (active) setError(err.message || 'Помилка завантаження.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [task.id, today, refreshVersion]);

  const toggle = async () => {
    if (!occurrence || busy) return;
    const newValue = !occurrence.isCompleted;
    setBusy(true);
    setError('');
    try {
      await setOccurrenceCompletion(task.id, today, newValue);
      setOccurrence(current => current ? { ...current, isCompleted: newValue } : current);
      await onChanged?.();
    } catch (err) {
      setError(err.message || 'Не вдалося змінити виконання.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="tasks-today-control">
      <label className="tasks-check" title={loading ? 'Завантаження...' : occurrence ? 'Виконання за сьогодні' : 'Сьогодні завдання не заплановане'}>
        <input type="checkbox" checked={Boolean(occurrence?.isCompleted)} disabled={loading || busy || !occurrence} onChange={toggle} aria-label={`Виконати «${task.title}» сьогодні`} />
        <span />
      </label>
      {error && <small className="tasks-inline-error" title={error}>{error}</small>}
    </div>
  );
}