import React, { useEffect, useMemo, useState } from 'react';
import { getTaskMilestones } from '../../services/tasksService';
import CustomSelect from '../CustomSelect';

import {
  dateKey,
  todayKey,
  toDateTimeLocal,
  getDeadline,
} from './taskUtils';

const defaultScheduledDate = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 30);
  now.setSeconds(0, 0);
  const pad = n => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
};

const createEmptyForm = () => ({
  title: '',
  description: '',
  goalId: '',
  milestoneId: '',
  priority: 'medium',
  status: 'pending',
  dueDate: defaultScheduledDate(),
  isRecurring: false,
  recurrenceRule: 'daily',
  startDate: todayKey(),
  endDate: '',
});

export default function TaskModal({
  task,
  goals,
  onClose,
  onSave,
  saving,
}) {
  const [form, setForm] = useState(() => {
    if (!task) return createEmptyForm();

    return {
      title: task.title || '',
      description: task.description || '',
      goalId: task.goalId == null ? '' : String(task.goalId),
      milestoneId: task.milestoneId == null ? '' : String(task.milestoneId),
      priority: task.priority || 'medium',
      status: task.status || 'pending',
      dueDate: toDateTimeLocal(task.dueDate),
      isRecurring: Boolean(task.isRecurring),
      recurrenceRule: task.recurrenceRule || 'daily',
      startDate: dateKey(task.startDate) || todayKey(),
      endDate: dateKey(task.endDate),
    };
  });

  const [milestones, setMilestones] = useState([]);
  const [loadingMilestones, setLoadingMilestones] = useState(false);
  const [error, setError] = useState('');

  const scheduleLocked = Boolean(task?.isRecurring);
  const today = todayKey();
  const earliestDate = goalStartDate => goalStartDate && goalStartDate > today ? goalStartDate : today;

  const selectedGoal = useMemo(() => goals.find(goal => String(goal.id) === form.goalId), [goals, form.goalId]);

  const selectedMilestone = milestones.find(item => String(item.id) === form.milestoneId);

  const goalStart = dateKey(selectedGoal?.startDate);
  const deadline = getDeadline(selectedGoal, selectedMilestone);
  const minScheduleDate = earliestDate(goalStart);
  const minScheduledDateTime = `${minScheduleDate}T00:00`;

  useEffect(() => {
    if (!form.goalId) {
      setMilestones([]);
      setLoadingMilestones(false);
      return;
    }

    let active = true;

    async function loadMilestones() {
      setLoadingMilestones(true);

      try {
        const data = await getTaskMilestones(form.goalId);

        if (active) {
          setMilestones(
            Array.isArray(data) ? data : []
          );
        }
      } catch (err) {
        if (active) {
          setError(
            err.message || 'Не вдалося завантажити етапи.'
          );
        }
      } finally {
        if (active) setLoadingMilestones(false);
      }
    }

    loadMilestones();

    return () => {
      active = false;
    };
  }, [form.goalId]);

  const change = (field, value) => setForm(current => ({ ...current, [field]: value }));

  const changeGoal = value => {
    setMilestones([]);
    setForm(current => ({ ...current, goalId: value, milestoneId: '' }));
  };

  const submit = async event => {
    event.preventDefault();
    setError('');

    if (!form.title.trim()) {
      setError('Вкажи назву завдання.');
      return;
    }

    if (form.milestoneId && !selectedMilestone) {
      setError('Вибраний етап недоступний.');
      return;
    }

    if (form.isRecurring) {
      if (!form.startDate || !form.endDate) {
        setError(
          'Вкажи дату початку та завершення повторення.'
        );
        return;
      }

      if (!task && form.startDate < todayKey()) {
        setError('Не можна створити повторюване завдання на минулу дату.');
        return;
      }

      if (form.endDate < form.startDate) {
        setError(
          'Дата завершення не може бути раніше дати початку.'
        );
        return;
      }

      if (goalStart && form.startDate < goalStart) {
        setError(
          'Повторення не може починатися раніше початку цілі.'
        );
        return;
      }

      if (deadline && form.endDate > deadline) {
        setError(
          'Повторення не може завершуватися пізніше дедлайну цілі або етапу.'
        );
        return;
      }
    } else {
      if (!form.dueDate) {
        setError('Оберіть заплановану дату виконання завдання.');
        return;
      }

      const due = dateKey(form.dueDate);
      const originalDue = task ? toDateTimeLocal(task.dueDate) : '';
      if (due < todayKey() && (!task || form.dueDate !== originalDue)) {
        setError('Не можна планувати завдання на минулу дату.');
        return;
      }

      if (due && goalStart && due < goalStart) {
        setError(
          'Завдання не може бути раніше початку цілі.'
        );
        return;
      }

      if (due && deadline && due > deadline) {
        setError(
          'Завдання не може бути пізніше дедлайну цілі або етапу.'
        );
        return;
      }
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      goalId: form.goalId
        ? Number(form.goalId)
        : null,
      milestoneId: form.milestoneId
        ? Number(form.milestoneId)
        : null,
      priority: form.priority,
      status: task?.isRecurring
        ? task.status
        : form.status,
      dueDate: form.isRecurring
        ? null
        : form.dueDate
          ? new Date(form.dueDate).toISOString()
          : null,
      isRecurring: form.isRecurring,
      recurrenceRule: form.isRecurring
        ? form.recurrenceRule
        : null,
      startDate: form.isRecurring
        ? form.startDate
        : null,
      endDate: form.isRecurring
        ? form.endDate
        : null,
    };

    try {
      await onSave(payload);
    } catch (err) {
      setError(
        err.message || 'Не вдалося зберегти завдання.'
      );
    }
  };

  return (
    <div
      className="tasks-modal-backdrop"
      onMouseDown={event => {
        if (
          event.target === event.currentTarget &&
          !saving
        ) {
          onClose();
        }
      }}
    >
      <section
        className="tasks-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-modal-title"
      >
        <div className="tasks-modal-header">
          <div>
            <h2 id="task-modal-title">
              {task
                ? 'Редагувати завдання'
                : 'Нове завдання'}
            </h2>
            <p>Організуй свої наступні кроки.</p>
          </div>

          <button
            type="button"
            className="tasks-icon-button"
            onClick={onClose}
            disabled={saving}
            aria-label="Закрити"
          >
            ×
          </button>
        </div>

        <form
          className="tasks-modal-form"
          onSubmit={submit}
        >
          <label>
            Назва завдання *
            <input
              required
              maxLength={200}
              value={form.title}
              onChange={event =>
                change('title', event.target.value)
              }
              placeholder="Наприклад, вивчити 10 слів"
            />
          </label>

          <label>
            Опис
            <textarea
              rows={3}
              value={form.description}
              onChange={event =>
                change('description', event.target.value)
              }
              placeholder="Додаткова інформація"
            />
          </label>

          <div className="tasks-form-row">
            <label>
              Пов'язана ціль
              <CustomSelect value={form.goalId} onChange={changeGoal} disabled={saving} options={[{ value: '', label: 'Без цілі' }, ...goals.map(goal => ({ value: String(goal.id), label: goal.title }))]} />
            </label>

            <label>
              Етап цілі
              <CustomSelect value={form.milestoneId} onChange={value => change('milestoneId', value)} disabled={!form.goalId || loadingMilestones || saving} options={[{ value: '', label: loadingMilestones ? 'Завантаження...' : 'Без етапу' }, ...milestones.map(item => ({ value: String(item.id), label: item.title }))]} />
            </label>
          </div>

          <label>
            Пріоритет
            <CustomSelect value={form.priority} onChange={value => change('priority', value)} disabled={saving} options={[{ value: 'low', label: 'Низький' }, { value: 'medium', label: 'Середній' }, { value: 'high', label: 'Високий' }]} />
          </label>

          <label className="tasks-repeat">
            <input
              type="checkbox"
              checked={form.isRecurring}
              disabled={scheduleLocked}
              onChange={event =>
                change(
                  'isRecurring',
                  event.target.checked
                )
              }
            />
            Повторюване завдання
          </label>

          {form.isRecurring ? (
            <div className="tasks-recurrence-fields">
              <label>
                Частота повторення
                <CustomSelect value={form.recurrenceRule} onChange={value => change('recurrenceRule', value)} disabled={scheduleLocked || saving} options={[{ value: 'daily', label: 'Щодня' }, { value: 'weekly', label: 'Щотижня' }]} />
              </label>

              <div className="tasks-form-row">
                <label>
                  Дата початку *
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    min={scheduleLocked ? undefined : minScheduleDate}
                    max={deadline || undefined}
                    disabled={scheduleLocked}
                    onChange={event =>
                      change(
                        'startDate',
                        event.target.value
                      )
                    }
                  />
                </label>

                <label>
                  Дата завершення *
                  <input
                    type="date"
                    required
                    value={form.endDate}
                    min={form.startDate}
                    max={deadline || undefined}
                    disabled={scheduleLocked}
                    onChange={event =>
                      change(
                        'endDate',
                        event.target.value
                      )
                    }
                  />
                </label>
              </div>

              <p className="tasks-field-hint">
                Кожне виконання створюється для
                відповідної дати. Відмічати виконання
                можна окремо.
              </p>

              {scheduleLocked && (
                <p className="tasks-field-hint">
                  Період і частоту створеного
                  повторюваного завдання змінювати
                  не можна.
                </p>
              )}
            </div>
          ) : (
            <label>
              Запланована дата виконання *
              <input
                type="datetime-local"
                required
                value={form.dueDate}
                min={minScheduledDateTime}
                max={
                  deadline
                    ? `${deadline}T23:59`
                    : undefined
                }
                onChange={event =>
                  change(
                    'dueDate',
                    event.target.value
                  )
                }
              />
              <small className="tasks-field-hint">
                Завдання з'явиться у вкладці «Сьогодні» саме в заплановану дату.
              </small>
            </label>
          )}

          {task && !form.isRecurring && (
            <label>
              Статус
              <CustomSelect value={form.status} onChange={value => change('status', value)} disabled={saving} options={[{ value: 'pending', label: 'Очікує' }, { value: 'in_progress', label: 'У процесі' }, { value: 'completed', label: 'Виконано' }, { value: 'cancelled', label: 'Скасовано' }]} />
            </label>
          )}

          {error && (
            <p className="tasks-form-error">
              {error}
            </p>
          )}

          <div className="tasks-modal-actions">
            <button
              type="button"
              className="tasks-button-secondary"
              onClick={onClose}
              disabled={saving}
            >
              Скасувати
            </button>

            <button
              type="submit"
              className="tasks-button-primary"
              disabled={
                saving || loadingMilestones
              }
            >
              {saving
                ? 'Збереження...'
                : task
                  ? 'Зберегти зміни'
                  : 'Створити завдання'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}