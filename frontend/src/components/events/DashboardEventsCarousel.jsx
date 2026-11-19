import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getFeaturedEvents } from '../../services/clubEventsService';
import { getImageUrl } from '../../utils/imageUrl';
import '../../css/DashboardEventsCarousel.css';

const formatEventDate = value =>
  new Intl.DateTimeFormat('uk-UA', {
    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value));

export default function DashboardEventsCarousel() {
  const [events, setEvents] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await getFeaturedEvents(5);
        if (!cancelled) {
          setEvents(Array.isArray(data) ? data : []);
          setIndex(0);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Не вдалося завантажити події.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (events.length < 2) return;

    const timer = setInterval(() => setIndex(previous => (previous + 1) % events.length), 6000);
    return () => clearInterval(timer);
  }, [events.length]);

  if (loading) return <div className="de-placeholder">Завантаження найближчих подій...</div>;
  if (error) return <div className="de-placeholder" role="alert">{error}</div>;

  if (events.length === 0) {
    return (
      <section className="de-empty" aria-label="Події спільнот">
        <div className="de-empty-header">
          <span className="de-empty-icon" aria-hidden="true">
            <svg
              width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            >
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M7 3v4M17 3v4M3 10h18" />
              <path d="M8 15h3" />
            </svg>
          </span>
          <div>
            <span className="de-empty-eyebrow">ПОДІЇ СПІЛЬНОТ</span>
            <h2>Найближчі події</h2>
          </div>
        </div>

        <div className="de-empty-body">
          <div>
            <h3>Поки немає запланованих подій</h3>
            <p>Досліджуй клуби та знаходь цікаві зустрічі й спільні активності.</p>
            <Link to="/clubs" className="de-empty-link">
              Переглянути клуби <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="de-empty-decoration" aria-hidden="true">✦</div>
        </div>
      </section>
    );
  }

  const event = events[index];

  return (
    <section className="de-carousel" aria-label="Найближчі події">
      <div className="de-cover">
        {event.coverUrl ? (
          <img src={getImageUrl(event.coverUrl)} alt="" />
        ) : (
          <div className="de-cover-fallback" />
        )}
        <div className="de-overlay" />

        <div className="de-content">
          <span className="de-tag">
            {event.eventType === 'online' ? 'Онлайн-подія' : 'Зустріч'} · {event.clubName}
          </span>
          <span className="de-date">{formatEventDate(event.startsAt)}</span>
          <h2>{event.title}</h2>
          <Link className="de-button" to={`/clubs/${event.clubId}?tab=events`}>
            {event.isClubMember
              ? event.isParticipant ? 'Моя подія' : 'Переглянути та зареєструватися'
              : 'Перейти до клубу'}
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        {events.length > 1 && (
          <div className="de-dots">
            {events.map((item, i) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Подія ${i + 1}`}
                aria-current={i === index ? 'true' : undefined}
                className={i === index ? 'active' : ''}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}