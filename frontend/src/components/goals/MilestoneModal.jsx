import React, { useEffect, useState } from 'react';

export default function MilestoneModal({ milestone, goal, saving, onClose, onSave }) {
  const [form, setForm] = useState({ title: '', description: '', dueDate: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    setForm({
      title: milestone?.title || '',
      description: milestone?.description || '',
      dueDate: milestone?.dueDate ? String(milestone.dueDate).slice(0, 10) : '',
    });
    setError('');
  }, [milestone]);

  const change = event => {
    setForm(current => ({ ...current, [event.target.name]: event.target.value }));
  };

  const submit = async event => {
    event.preventDefault();
    setError('');

    if (!form.title.trim()) {
      setError('Вкажи назву етапу.');
      return;
    }

    const goalStart = goal.startDate ? String(goal.startDate).slice(0, 10) : '';
    const goalDeadline = goal.deadline ? String(goal.deadline).slice(0, 10) : '';

    if (form.dueDate && goalStart && form.dueDate < goalStart) {
      setError('Дедлайн етапу не може бути раніше початку цілі.');
      return;
    }
    if (form.dueDate && goalDeadline && form.dueDate > goalDeadline) {
      setError('Дедлайн етапу не може бути пізніше дедлайну цілі.');
      return;
    }

    try {
      await onSave({
        title: form.title.trim(),
        description: form.description.trim() || null,
        dueDate: form.dueDate || null,
      });
    } catch (err) {
      setError(err.message || 'Не вдалося зберегти етап.');
    }
  };

  return (
    <div
      className="gm-modal-backdrop gm-modal-nested"
      onMouseDown={event => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <section className="gm-modal gm-modal-small" role="dialog" aria-modal="true" aria-labelledby="milestone-modal-title">
        <div className="gm-modal-header">
          <div>
            <span className="goals-eyebrow">ПРОМІЖНА ЦІЛЬ</span>
            <h2 id="milestone-modal-title">{milestone ? 'Редагувати етап' : 'Новий етап'}</h2>
          </div>
          <button type="button" className="gm-modal-close" onClick={onClose} disabled={saving} aria-label="Закрити">×</button>
        </div>

        <form onSubmit={submit}>
          <label className="gm-field">
            <span className="gm-field-label">Назва етапу <span className="gm-required">*</span></span>
            <input
              name="title" value={form.title} onChange={change}
              maxLength={200} required placeholder="Наприклад, пройти перший модуль"
            />
          </label>

          <label className="gm-field">
            <span className="gm-field-label">Опис</span>
            <textarea
              name="description" value={form.description} onChange={change}
              rows={3} placeholder="Якого результату потрібно досягти?"
            />
          </label>

          <label className="gm-field">
            <span className="gm-field-label">Дедлайн</span>
            <input
              type="date" name="dueDate" value={form.dueDate} onChange={change}
              min={goal.startDate ? String(goal.startDate).slice(0, 10) : undefined}
              max={goal.deadline ? String(goal.deadline).slice(0, 10) : undefined}
            />
          </label>

          {error && <p className="gm-form-error" role="alert">{error}</p>}

          <div className="gm-modal-actions">
            <button type="button" className="gm-secondary-btn" onClick={onClose} disabled={saving}>Скасувати</button>
            <button type="submit" className="goals-primary-btn" disabled={saving}>
              {saving ? 'Збереження...' : milestone ? 'Зберегти' : 'Додати етап'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}