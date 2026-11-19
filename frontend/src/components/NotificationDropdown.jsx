import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBell, faCheckDouble, faTrophy, faComment, faHeart, faBullhorn,
  faUsers, faCalendarDays, faFlagCheckered, faClock, faStar, faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { useNotifications } from '../context/NotificationContext';

const ICONS = {
  new_post: faComment,
  post_comment: faComment,
  new_comment: faComment,
  post_reaction: faHeart,
  new_reaction: faHeart,
  new_announcement: faBullhorn,
  announcement: faBullhorn,
  group_goal_created: faFlagCheckered,
  group_goal_completed: faFlagCheckered,
  new_event: faCalendarDays,
  event: faCalendarDays,
  club_join_request: faUsers,
  join_request_accepted: faUsers,
  join_request_rejected: faUsers,
  owner_assigned: faUsers,
  ownership_transferred: faUsers,
  club_member_removed: faUsers,
  moderator_assigned: faUsers,
  moderator_removed: faUsers,
  achievement: faTrophy,
  level_up: faStar,
  reminder: faClock,
};

export function getNotificationIcon(type) {
  return ICONS[type] || faBell;
}

export function formatNotificationDate(date) {
  if (!date) return '';

  const value = new Date(date);
  const diff = Date.now() - value.getTime();
  if (Number.isNaN(diff)) return '';
  if (diff < 60000) return 'Щойно';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} хв тому`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} год тому`;

  return value.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function NotificationDropdown() {
  const {
    notifications, unreadCount, totalCount, loading, loadingMore,
    loadMore, markAsRead, markAllAsRead,
  } = useNotifications();

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const rootRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;

    const handleOutside = event => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const handleEscape = event => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const handleNotificationClick = async notification => {
    if (busy) return;
    setError('');
    setBusy(true);

    try {
      if (!notification.isRead) await markAsRead(notification.id);
      setOpen(false);

      if (notification.targetUrl?.startsWith('/') && !notification.targetUrl.startsWith('//')) {
        navigate(notification.targetUrl);
      }
    } catch (err) {
      setError(err.message || 'Не вдалося відкрити сповіщення.');
    } finally {
      setBusy(false);
    }
  };

  const handleMarkAll = async () => {
    setError('');
    setBusy(true);
    try {
      await markAllAsRead();
    } catch (err) {
      setError(err.message || 'Не вдалося оновити сповіщення.');
    } finally {
      setBusy(false);
    }
  };

  const handleLoadMore = async () => {
    setError('');
    try {
      await loadMore();
    } catch (err) {
      setError(err.message || 'Не вдалося завантажити сповіщення.');
    }
  };

  return (
    <div className="gm-notification-root" ref={rootRef}>
      <button
        type="button"
        className={`notification-btn gm-notification-trigger ${open ? 'is-open' : ''}`}
        aria-label={unreadCount ? `Сповіщення, ${unreadCount} непрочитаних` : 'Сповіщення'}
        title="Сповіщення" aria-expanded={open} aria-haspopup="dialog"
        onClick={() => setOpen(value => !value)}
      >
        <FontAwesomeIcon icon={faBell} />
        {unreadCount > 0 && <span className="gm-notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      {open && (
        <div className="gm-notification-dropdown" role="dialog" aria-label="Список сповіщень">
          <div className="gm-notification-header">
            <div>
              <h3>Сповіщення</h3>
              <p>{unreadCount > 0 ? `${unreadCount} непрочитаних` : 'Усі сповіщення прочитані'}</p>
            </div>
            <button type="button" className="gm-notification-close" onClick={() => setOpen(false)} aria-label="Закрити">
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>

          {unreadCount > 0 && (
            <div className="gm-notification-toolbar">
              <button type="button" onClick={handleMarkAll} disabled={busy}>
                <FontAwesomeIcon icon={faCheckDouble} />
                Позначити всі прочитаними
              </button>
            </div>
          )}

          {error && <p className="gm-notification-error">{error}</p>}

          <div className="gm-notification-list">
            {loading && notifications.length === 0 ? (
              <div className="gm-notification-empty">Завантаження сповіщень...</div>
            ) : notifications.length === 0 ? (
              <div className="gm-notification-empty">
                <FontAwesomeIcon icon={faBell} />
                <strong>Поки немає сповіщень</strong>
                <span>Тут з'являтимуться новини твоїх клубів, досягнення та нагадування.</span>
              </div>
            ) : (
              notifications.map(notification => (
                <button
                  key={notification.id} type="button" disabled={busy}
                  className={`gm-notification-item ${!notification.isRead ? 'is-unread' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <span className="gm-notification-item-icon">
                    <FontAwesomeIcon icon={getNotificationIcon(notification.type)} />
                  </span>
                  <span className="gm-notification-item-content">
                    <strong>{notification.title}</strong>
                    <span>{notification.message}</span>
                    <small>{formatNotificationDate(notification.createdAt)}</small>
                  </span>
                  {!notification.isRead && <span className="gm-notification-unread-dot" aria-label="Не прочитано" />}
                </button>
              ))
            )}
          </div>

          {notifications.length < totalCount && (
            <div className="gm-notification-footer">
              <button type="button" onClick={handleLoadMore} disabled={loadingMore}>
                {loadingMore ? 'Завантаження...' : 'Показати більше'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}