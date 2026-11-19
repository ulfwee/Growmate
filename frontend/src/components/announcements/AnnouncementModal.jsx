import React, { useEffect, useState } from 'react';
import '../../css/ClubAnnouncements.css';
import CustomSelect from '../CustomSelect';

export default function AnnouncementModal({ announcement, groupGoals = [], saving = false, onSave, onClose }) {
  const [form, setForm] = useState({
    title: announcement?.title ?? '',
    content: announcement?.content ?? '',
    announcementType: announcement?.announcementType ?? 'general',
    imageUrl: announcement?.imageUrl ?? '',
    relatedGroupGoalId: announcement?.relatedGroupGoalId != null ? String(announcement.relatedGroupGoalId) : '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    const onKeyDown = event => {
      if (event.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, saving]);

  const change = (field, value) => {
    setForm(previous => ({ ...previous, [field]: value }));
    setError('');
  };

  const submit = async event => {
    event.preventDefault();

    if (!form.title.trim() || !form.content.trim()) {
      setError('Заповніть назву та текст оголошення.');
      return;
    }
    if (form.announcementType === 'group_goal' && !form.relatedGroupGoalId) {
      setError('Оберіть групову ціль.');
      return;
    }

    const data = {
      title: form.title.trim(),
      content: form.content.trim(),
      announcementType: form.announcementType,
      imageUrl: form.imageUrl.trim() || null,
      relatedGroupGoalId: form.announcementType === 'group_goal' ? Number(form.relatedGroupGoalId) : null,
      relatedEventId: null,
      isPinned: announcement?.isPinned ?? false,
    };

    try {
      await onSave(data);
    } catch (err) {
      setError(err.message || 'Не вдалося зберегти оголошення.');
    }
  };

  return (
    <div
      className="ca-modal-backdrop"
      onMouseDown={event => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <section className="ca-modal" role="dialog" aria-modal="true" aria-labelledby="ca-modal-title">
        <div className="ca-modal-header">
          <div>
            <h2 id="ca-modal-title">{announcement ? 'Редагувати оголошення' : 'Нове оголошення'}</h2>
            <p>Поділіться важливою інформацією з клубом.</p>
          </div>
          <button type="button" className="ca-icon-button" onClick={onClose} disabled={saving} aria-label="Закрити">×</button>
        </div>

        <form onSubmit={submit} className="ca-modal-form">
          <div className="ca-field">
            <span>Тип <span className="ca-required">*</span></span>
            <CustomSelect
              value={form.announcementType}
              onChange={value => change('announcementType', value)}
              disabled={saving}
              options={[
                { value: 'general', label: 'Звичайне оголошення' },
                { value: 'group_goal', label: 'Про групову ціль' },
                { value: 'event', label: 'Про подію' },
              ]}
            />
          </div>

          <label className="ca-field">
            <span>Назва <span className="ca-required">*</span></span>
            <input
              value={form.title} maxLength={200} required disabled={saving}
              placeholder="Наприклад, Підсумки тижня"
              onChange={event => change('title', event.target.value)}
            />
          </label>

          <label className="ca-field">
            <span>Текст <span className="ca-required">*</span></span>
            <textarea
              value={form.content} rows={6} required disabled={saving}
              placeholder="Напишіть повідомлення для учасників..."
              onChange={event => change('content', event.target.value)}
            />
          </label>

          {form.announcementType === 'group_goal' && (
            <div className="ca-field">
              <span>Групова ціль <span className="ca-required">*</span></span>
              <CustomSelect
                value={form.relatedGroupGoalId}
                onChange={value => change('relatedGroupGoalId', value)}
                placeholder="Оберіть групову ціль"
                disabled={saving}
                options={groupGoals.map(goal => ({ value: String(goal.id), label: goal.title }))}
              />
            </div>
          )}

          <label className="ca-field">
            <span>URL зображення (необов'язково)</span>
            <input
              type="url" value={form.imageUrl} disabled={saving}
              placeholder="https://example.com/image.jpg"
              onChange={event => change('imageUrl', event.target.value)}
            />
          </label>

          {form.imageUrl && (
            <img
              className="ca-image-preview" src={form.imageUrl} alt="Попередній перегляд"
              onError={event => { event.currentTarget.style.display = 'none'; }}
              onLoad={event => { event.currentTarget.style.display = 'block'; }}
            />
          )}

          {error && <p className="ca-form-error" role="alert">{error}</p>}

          <div className="ca-modal-footer">
            <button type="button" className="ca-button ca-button-secondary" disabled={saving} onClick={onClose}>Скасувати</button>
            <button type="submit" className="ca-button ca-button-primary" disabled={saving}>
              {saving ? 'Збереження...' : announcement ? 'Зберегти зміни' : 'Опублікувати'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}