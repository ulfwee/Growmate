import React, { useEffect, useState } from 'react';
import '../../css/ClubEvents.css';
import ClubImagePicker from '../ClubImagePicker';
import { uploadClubImage } from '../../services/clubsService';

const emptyForm = {
  title: '',
  description: '',
  coverUrl: '',
  eventType: 'online',
  location: '',
  meetingUrl: '',
  startsAt: '',
  endsAt: '',
  maxParticipants: '',
  publishAnnouncement: true,
};

const toLocalInput = value => {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export default function ClubEventModal({ event, clubId, onClose, onSave, saving }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [coverFile, setCoverFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const editing = Boolean(event);

  useEffect(() => {
    if (!event) {
      setForm({ ...emptyForm });
      setCoverFile(null);
      return;
    }

    setCoverFile(null);
    setForm({
      title: event.title || '',
      description: event.description || '',
      coverUrl: event.coverUrl || '',
      eventType: event.eventType || 'online',
      location: event.location || '',
      meetingUrl: event.meetingUrl || '',
      startsAt: toLocalInput(event.startsAt),
      endsAt: toLocalInput(event.endsAt),
      maxParticipants: event.maxParticipants ?? '',
      publishAnnouncement: false,
    });
  }, [event]);

  const setField = (field, value) => {
    setForm(previous => ({ ...previous, [field]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');

    if (!form.title.trim()) {
      setError('Вкажіть назву події.');
      return;
    }

    if (!form.startsAt) {
      setError('Вкажіть дату початку.');
      return;
    }

    const startsAt = new Date(form.startsAt);
    if (Number.isNaN(startsAt.getTime())) {
      setError('Некоректна дата початку.');
      return;
    }

    if (!editing && startsAt <= new Date()) {
      setError('Дата початку повинна бути в майбутньому.');
      return;
    }

    const endsAt = form.endsAt ? new Date(form.endsAt) : null;
    if (endsAt && endsAt <= startsAt) {
      setError('Дата завершення має бути пізніше початку.');
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      coverUrl: form.coverUrl.trim() || null,
      eventType: form.eventType,
      location: form.eventType === 'offline' ? form.location.trim() || null : null,
      meetingUrl: form.eventType === 'online' ? form.meetingUrl.trim() || null : null,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt ? endsAt.toISOString() : null,
      maxParticipants: form.maxParticipants === '' ? null : Number(form.maxParticipants),
      publishAnnouncement: !editing && form.publishAnnouncement,
    };

    try {
      if (coverFile) {
        setUploading(true);
        payload.coverUrl = await uploadClubImage(clubId, coverFile);
      }

      await onSave(payload);
    } catch (err) {
      setError(err.message || 'Не вдалося зберегти подію.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="ce-modal-backdrop"
      onMouseDown={e => {
        if (e.target === e.currentTarget && !saving && !uploading) onClose();
      }}
    >
      <div className="ce-modal" role="dialog" aria-modal="true" aria-labelledby="ce-modal-title">
        <div className="ce-modal-heading">
          <div>
            <span className="ce-eyebrow">Події клубу</span>
            <h2 id="ce-modal-title">{editing ? 'Редагувати подію' : 'Нова подія'}</h2>
            <p>Заплануй зустріч, вебінар або спільну активність.</p>
          </div>

          <button type="button" className="ce-close" onClick={onClose} disabled={saving || uploading} aria-label="Закрити">
            ×
          </button>
        </div>

        <form className="ce-form" onSubmit={handleSubmit}>
          <label className="ce-field">
            <span>Назва події *</span>
            <input
              value={form.title}
              maxLength={200}
              onChange={e => setField('title', e.target.value)}
              placeholder="Наприклад, English Speaking Club"
              required
            />
          </label>

          <label className="ce-field">
            <span>Опис</span>
            <textarea
              value={form.description}
              onChange={e => setField('description', e.target.value)}
              placeholder="Розкажи, що чекає учасників..."
              rows={4}
            />
          </label>

          <div className="ce-field">
            <ClubImagePicker
              label="Обкладинка події (необов’язково)"
              value={coverFile || form.coverUrl}
              disabled={saving || uploading}
              onChange={value => {
                if (value instanceof File) {
                  setCoverFile(value);
                } else {
                  setCoverFile(null);
                  setField('coverUrl', value || '');
                }
              }}
            />
          </div>

          <div className="ce-field">
            <span>Формат проведення</span>
            <div className="ce-type-switch">
              <button
                type="button"
                className={form.eventType === 'online' ? 'selected' : ''}
                onClick={() => setField('eventType', 'online')}
              >
                Онлайн
              </button>
              <button
                type="button"
                className={form.eventType === 'offline' ? 'selected' : ''}
                onClick={() => setField('eventType', 'offline')}
              >
                Офлайн
              </button>
            </div>
          </div>

          <div className="ce-form-grid">
            <label className="ce-field">
              <span>Початок *</span>
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={e => setField('startsAt', e.target.value)}
                required
              />
            </label>

            <label className="ce-field">
              <span>Завершення</span>
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={e => setField('endsAt', e.target.value)}
              />
            </label>
          </div>

          {form.eventType === 'online' ? (
            <label className="ce-field">
              <span>Посилання на зустріч</span>
              <input
                type="url"
                value={form.meetingUrl}
                onChange={e => setField('meetingUrl', e.target.value)}
                placeholder="https://meet.google.com/..."
              />
            </label>
          ) : (
            <label className="ce-field">
              <span>Місце проведення</span>
              <input
                value={form.location}
                onChange={e => setField('location', e.target.value)}
                placeholder="Місто, адреса або назва закладу"
              />
            </label>
          )}

          <label className="ce-field">
            <span>Максимальна кількість учасників</span>
            <input
              type="number"
              min="1"
              step="1"
              value={form.maxParticipants}
              onChange={e => setField('maxParticipants', e.target.value)}
              placeholder="Без обмежень"
            />
          </label>

          {!editing && (
            <label className="ce-checkbox-row">
              <input
                type="checkbox"
                checked={form.publishAnnouncement}
                onChange={e => setField('publishAnnouncement', e.target.checked)}
              />
              <span>
                <strong>Опублікувати оголошення</strong>
                <small>Анонс події з'явиться у стрічці клубу.</small>
              </span>
            </label>
          )}

          {error && <div className="ce-form-error">{error}</div>}

          <div className="ce-modal-actions">
            <button type="button" className="ce-btn ce-btn-light" onClick={onClose} disabled={saving || uploading}>
              Скасувати
            </button>
            <button type="submit" className="ce-btn ce-btn-primary" disabled={saving || uploading}>
              {saving || uploading ? 'Збереження...' : editing ? 'Зберегти зміни' : 'Створити подію'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}