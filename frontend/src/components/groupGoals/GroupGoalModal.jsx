import React, { useState } from 'react';

const today = () => new Date().toLocaleDateString('en-CA');

export default function GroupGoalModal({ goal = null, saving = false, onSave, onClose }) {
  const [form, setForm] = useState({
    title: goal?.title ?? '', description: goal?.description ?? '',
    startDate: goal?.startDate ?? today(), endDate: goal?.endDate ?? '', status: goal?.status ?? 'active',
  });
  const [error, setError] = useState('');

  const change = (field, value) => setForm(current => ({ ...current, [field]: value }));

  const submit = async event => {
    event.preventDefault();
    setError('');

    if (!form.title.trim()) {
      setError('Вкажіть назву цілі.');
      return;
    }
    if (!form.endDate) {
      setError('Оберіть дату завершення.');
      return;
    }
    if (form.endDate < form.startDate) {
      setError('Дата завершення не може бути раніше дати початку.');
      return;
    }

    try {
      await onSave({
        title: form.title.trim(), description: form.description.trim() || null,
        startDate: form.startDate, endDate: form.endDate, status: form.status,
      });
    } catch (err) {
      setError(err.message || 'Не вдалося зберегти ціль.');
    }
  };

  return (
    <div className="gg-modal-backdrop" onMouseDown={event => {
      if (event.target === event.currentTarget && !saving) onClose();
    }}>
      <section className="gg-modal" role="dialog" aria-modal="true" aria-labelledby="gg-modal-title">
        <header className="gg-modal-header">
          <div>
            <h2 id="gg-modal-title">{goal ? 'Редагувати групову ціль' : 'Нова групова ціль'}</h2>
            <p>Визначте спільний результат для учасників клубу.</p>
          </div>
          <button type="button" className="gg-close" disabled={saving} onClick={onClose} aria-label="Закрити">×</button>
        </header>

        <form className="gg-form" onSubmit={submit}>
          <label>
            Назва цілі *
            <input required maxLength={200} value={form.title} onChange={e => change('title', e.target.value)} placeholder="Наприклад, Прочитати 4 книги за місяць" />
          </label>
          <label>
            Опис
            <textarea rows={4} value={form.description} onChange={e => change('description', e.target.value)} placeholder="Опишіть мету та очікуваний результат..." />
          </label>

          <div className="gg-form-dates">
            <label>
              Дата початку
              <input type="date" required value={form.startDate} onChange={e => change('startDate', e.target.value)} />
            </label>
            <label>
              Дата завершення *
              <input type="date" required min={form.startDate} value={form.endDate} onChange={e => change('endDate', e.target.value)} />
            </label>
          </div>

          {goal && (
            <label>
              Статус
              <select value={form.status} onChange={e => change('status', e.target.value)}>
                <option value="planned">Запланована</option>
                <option value="active">Активна</option>
                <option value="completed">Завершена</option>
                <option value="cancelled">Скасована</option>
              </select>
            </label>
          )}

          {error && <p className="gg-error">{error}</p>}
          <footer className="gg-modal-actions">
            <button type="button" className="gg-btn-secondary" disabled={saving} onClick={onClose}>Скасувати</button>
            <button type="submit" className="gg-btn-primary" disabled={saving}>
              {saving ? 'Збереження...' : goal ? 'Зберегти зміни' : 'Створити ціль'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}