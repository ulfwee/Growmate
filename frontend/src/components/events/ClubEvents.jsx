import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getClubEvents,
  createClubEvent,
  updateClubEvent,
  deleteClubEvent,
  joinClubEvent,
  leaveClubEvent,
} from '../../services/clubEventsService';
import { getImageUrl } from '../../utils/imageUrl';
import { useToast } from '../ToastProvider';
import ClubEventModal from './ClubEventModal';
import ConfirmDialog from '../ConfirmDialog';
import '../../css/ClubEvents.css';

const formatDate = value => {
  if (!value) return '';

  return new Intl.DateTimeFormat('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

export default function ClubEvents({
  clubId,
  canManage = false,
  isMember = false,
  onUserStatsChanged,
}) {
  const { showToast } = useToast();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [filter, setFilter] = useState('upcoming');

  const loadEvents = useCallback(async () => {
    try {
      setError('');
      const data = await getClubEvents(clubId);
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Не вдалося завантажити події.');
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    setLoading(true);
    loadEvents();
  }, [loadEvents]);

  const openCreate = () => {
    setEditingEvent(null);
    setModalOpen(true);
  };

  const openEdit = event => {
    setEditingEvent(event);
    setModalOpen(true);
  };

  const handleSave = async data => {
    setSaving(true);

    try {
      if (editingEvent) {
        await updateClubEvent(clubId, editingEvent.id, data);
        showToast('Подію оновлено.');
      } else {
        await createClubEvent(clubId, data);
        showToast('Подію успішно створено.');
      }

      await loadEvents();
      setModalOpen(false);
      setEditingEvent(null);
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteEvent = async () => {
    if (!eventToDelete || busyId !== null) return;
    const event = eventToDelete;
    setBusyId(event.id);
    try {
      await deleteClubEvent(clubId, event.id);
      setEvents(current => current.filter(item => item.id !== event.id));
      setEventToDelete(null);
      showToast('Подію видалено.');
      await loadEvents();
    } catch (err) {
      showToast(err.message || 'Не вдалося видалити подію.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleParticipation = async event => {
    setBusyId(event.id);

    try {
      if (event.isParticipant) {
        await leaveClubEvent(clubId, event.id);
        showToast('Реєстрацію скасовано.');
      } else {
        await joinClubEvent(clubId, event.id);
        await onUserStatsChanged?.();
        showToast('Ти успішно зареєструвалася на подію!');
      }

      await loadEvents();
    } catch (err) {
      showToast(err.message || 'Не вдалося змінити участь.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const now = Date.now();

  const visibleEvents = events
    .filter(event => {
      const starts = new Date(event.startsAt).getTime();
      return filter === 'upcoming' ? starts > now : starts <= now;
    })
    .sort((a, b) => filter === 'upcoming'
      ? new Date(a.startsAt) - new Date(b.startsAt)
      : new Date(b.startsAt) - new Date(a.startsAt));

  return (
    <section className="ce-section">
      <div className="ce-section-header">
        <div>
          <span className="ce-eyebrow">Спільні активності</span>
          <h2>Події клубу</h2>
          <p>
            Зустрічі, вебінари та цікаві активності
            для учасників спільноти.
          </p>
        </div>

        {canManage && (
          <button
            className="ce-btn ce-btn-primary"
            onClick={openCreate}
          >
            + Створити подію
          </button>
        )}
      </div>

      <div className="ce-toolbar">
        <div className="ce-filters">
          <button
            className={filter === 'upcoming' ? 'active' : ''}
            onClick={() => setFilter('upcoming')}
          >
            Майбутні
          </button>
          <button
            className={filter === 'past' ? 'active' : ''}
            onClick={() => setFilter('past')}
          >
            Минулі
          </button>
        </div>

        <span className="ce-count">
          {visibleEvents.length} подій
        </span>
      </div>

      {error && (
        <div className="ce-error">
          {error}
          <button onClick={loadEvents}>
            Спробувати ще раз
          </button>
        </div>
      )}

      {loading ? (
        <div className="ce-empty">Завантаження подій...</div>
      ) : visibleEvents.length === 0 ? (
        <div className="ce-empty">
          <div className="ce-empty-icon">✦</div>
          <h3>
            {filter === 'upcoming'
              ? 'Поки немає запланованих подій'
              : 'Минулих подій ще немає'}
          </h3>
          <p>
            {canManage && filter === 'upcoming'
              ? 'Створи першу подію та запроси учасників клубу.'
              : 'Нові активності з’являться тут.'}
          </p>
        </div>
      ) : (
        <div className="ce-grid">
          {visibleEvents.map(event => {
            const isPast = new Date(event.startsAt).getTime() <= now;

            const isFull = event.maxParticipants != null &&
              event.participantsCount >= event.maxParticipants;

            const eventBusy = busyId === event.id;

            return (
              <article className="ce-card" key={event.id}>
                <div className="ce-card-cover">
                  {event.coverUrl ? (
                    <img
                      src={getImageUrl(event.coverUrl)}
                      alt={event.title}
                    />
                  ) : (
                    <div className="ce-cover-fallback" />
                  )}

                  <span className="ce-format">{event.eventType === 'online' ? 'Онлайн' : 'Офлайн'}</span>
                </div>

                <div className="ce-card-body">
                  <span className="ce-card-date">{formatDate(event.startsAt)}</span>

                  <h3>{event.title}</h3>

                  <p className="ce-card-description">
                    {event.description ||
                      'Долучайся до спільної активності клубу.'}
                  </p>

                  <div className="ce-card-meta">
                    <span>
                      {event.eventType === 'online'
                        ? '◉ Онлайн-зустріч'
                        : `⌖ ${event.location ||
                        'Місце уточнюється'}`}
                    </span>

                    <span>
                      ♙ {event.participantsCount}
                      {event.maxParticipants != null
                        ? ` / ${event.maxParticipants}`
                        : ''} учасн.
                    </span>
                  </div>

                  <div className="ce-card-actions">
                    {!isPast && (
                      !isMember ? (
                        <Link
                          className="ce-btn ce-btn-primary"
                          to={`/clubs/${clubId}`}
                        >
                          Приєднатися до клубу
                        </Link>
                      ) : (
                        <button
                          className={`ce-btn ${event.isParticipant
                            ? 'ce-btn-light'
                            : 'ce-btn-primary'
                            }`}
                          disabled={
                            eventBusy ||
                            (!event.isParticipant && isFull)
                          }
                          onClick={() =>
                            handleParticipation(event)
                          }
                        >
                          {eventBusy
                            ? 'Зачекайте...'
                            : event.isParticipant
                              ? 'Скасувати участь'
                              : isFull
                                ? 'Місць немає'
                                : 'Зареєструватися'}
                        </button>
                      )
                    )}

                    {canManage && (
                      <div className="ce-manage-actions">
                        <button
                          onClick={() => openEdit(event)}
                          disabled={eventBusy}
                        >
                          Редагувати
                        </button>

                        <button
                          className="danger"
                          onClick={() => setEventToDelete(event)}
                          disabled={eventBusy}
                        >
                          Видалити
                        </button>
                      </div>
                    )}
                  </div>

                  {event.isParticipant &&
                    event.meetingUrl &&
                    event.eventType === 'online' && (
                      <a
                        className="ce-meeting-link"
                        href={event.meetingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Посилання на зустріч ↗
                      </a>
                    )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={eventToDelete !== null}
        title="Видалити подію?"
        message={eventToDelete ? `Ви впевнені, що хочете видалити подію «${eventToDelete.title}»? Цю дію неможливо скасувати.` : ''}
        confirmText="Видалити подію"
        variant="danger"
        loading={eventToDelete !== null && busyId === eventToDelete.id}
        onCancel={() => { if (busyId === null) setEventToDelete(null); }}
        onConfirm={confirmDeleteEvent}
      />

      {modalOpen && (
        <ClubEventModal
          clubId={clubId}
          event={editingEvent}
          saving={saving}
          onSave={handleSave}
          onClose={() => {
            if (!saving) {
              setModalOpen(false);
              setEditingEvent(null);
            }
          }}
        />
      )}
    </section>
  );
}