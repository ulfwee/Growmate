import React, { useEffect, useState } from 'react';
import CustomSelect from '../CustomSelect';

const today = new Date().toLocaleDateString('sv-SE');
const CATEGORY_OPTIONS = [
  { value: 'learning', label: '📚 Навчання' },
  { value: 'health', label: '💪 Здоровʼя' },
  { value: 'career', label: '💼 Карʼєра' },
  { value: 'finance', label: '💰 Фінанси' },
  { value: 'personal', label: '🌱 Особисте' },
  { value: 'other', label: '🎯 Інше' },
];

const initialForm = () => ({
  title: '', description: '', startDate: today,
  deadline: '', status: 'active', category: 'other',
});

export default function GoalModal({ goal, saving, onClose, onSave }) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');

  useEffect(() => {
    setForm(goal ? {
      title: goal.title || '',
      description: goal.description || '',
      startDate: String(goal.startDate || today).slice(0, 10),
      deadline: goal.deadline ? String(goal.deadline).slice(0, 10) : '',
      status: goal.status || 'active',
      category: goal.category || 'other',
    } : initialForm());
    setError('');
  }, [goal]);

  const canCompleteManually = goal?.canCompleteManually === true;
  const change = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));
  const changeField = (field, value) => setForm(current => ({ ...current, [field]: value }));

  const submit = async event => {
    event.preventDefault();
    setError('');

    if (!form.title.trim()) {
      setError('Вкажи назву цілі.');
      return;
    }
    if (form.deadline && form.deadline < form.startDate) {
      setError('Дедлайн не може бути раніше дати початку.');
      return;
    }
    if (goal && form.status === 'completed' && goal.status !== 'completed' && !canCompleteManually) {
      setError('Ціль із етапами або завданнями не можна завершити вручну.');
      return;
    }

    const data = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      startDate: form.startDate,
      deadline: form.deadline || null,
      category: form.category || 'other',
    };
    if (goal) data.status = form.status;

    try {
      await onSave(data);
    } catch (err) {
      setError(err.message || 'Не вдалося зберегти ціль.');
    }
  };

  const statusOptions = [
    { value: 'planned', label: 'Запланована' },
    { value: 'active', label: 'Активна' },
    { value: 'cancelled', label: 'Скасована' },
    ...(canCompleteManually || form.status === 'completed'
      ? [{ value: 'completed', label: 'Досягнута', disabled: !canCompleteManually }]
      : []),
  ];

  return (
    <div
      className="gm-modal-backdrop"
      onMouseDown={event => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <section className="gm-modal" role="dialog" aria-modal="true" aria-labelledby="goal-modal-title">
        <div className="gm-modal-header">
          <div>
            <span className="goals-eyebrow">ТВОЇ ПЛАНИ</span>
            <h2 id="goal-modal-title">{goal ? 'Редагувати ціль' : 'Нова ціль'}</h2>
          </div>
          <button type="button" className="gm-modal-close" onClick={onClose} disabled={saving} aria-label="Закрити">×</button>
        </div>

        <form onSubmit={submit}>
          <label className="gm-field">
            <span className="gm-field-label">Назва цілі <span className="gm-required">*</span></span>
            <input name="title" value={form.title} onChange={change} maxLength={200} required placeholder="Наприклад, вивчити React" />
          </label>

          <label className="gm-field">
            <span className="gm-field-label">Опис</span>
            <textarea name="description" value={form.description} onChange={change} rows={3} placeholder="Чого хочеш досягти?" />
          </label>

          <div className="gm-form-row">
            <div className="gm-field">
              <span className="gm-field-label">Категорія</span>
              <CustomSelect
                name="category" value={form.category}
                onChange={value => changeField('category', value)}
                options={CATEGORY_OPTIONS} disabled={saving}
              />
            </div>

            {goal && (
              <div className="gm-field">
                <span className="gm-field-label">Статус</span>
                <CustomSelect
                  name="status" value={form.status}
                  onChange={value => changeField('status', value)}
                  options={statusOptions} disabled={saving}
                />
                {!canCompleteManually && (
                  <small className="gm-field-hint">
                    Завершення цілі визначається автоматично за виконанням її етапів і завдань.
                  </small>
                )}
              </div>
            )}
          </div>

          <div className="gm-form-row">
            <label className="gm-field">
              <span className="gm-field-label">Дата початку <span className="gm-required">*</span></span>
              <input type="date" name="startDate" value={form.startDate} onChange={change} required />
            </label>
            <label className="gm-field">
              <span className="gm-field-label">Дедлайн</span>
              <input type="date" name="deadline" value={form.deadline} onChange={change} min={form.startDate} />
            </label>
          </div>

          {error && <p className="gm-form-error" role="alert">{error}</p>}

          <div className="gm-modal-actions">
            <button type="button" className="gm-secondary-btn" onClick={onClose} disabled={saving}>Скасувати</button>
            <button type="submit" className="goals-primary-btn" disabled={saving}>
              {saving ? 'Збереження...' : goal ? 'Зберегти зміни' : 'Створити ціль'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}