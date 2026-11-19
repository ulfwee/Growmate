import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { useNotifications } from '../context/NotificationContext';
import { getNotificationIcon } from './NotificationDropdown';

function NotificationPopup({ notification }) {
  const { dismissPopup, markAsRead } = useNotifications();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => dismissPopup(notification.id), 6000);
    return () => clearTimeout(timer);
  }, [notification.id, dismissPopup]);

  const handleClick = async () => {
    try {
      if (!notification.isRead) await markAsRead(notification.id);
      dismissPopup(notification.id);

      if (notification.targetUrl?.startsWith('/') && !notification.targetUrl.startsWith('//')) {
        navigate(notification.targetUrl);
      }
    } catch (error) {
      console.error('Не вдалося відкрити сповіщення:', error);
    }
  };

  return (
    <div className="gm-notification-popup">
      <button type="button" className="gm-notification-popup-main" onClick={handleClick}>
        <span className="gm-notification-popup-icon">
          <FontAwesomeIcon icon={getNotificationIcon(notification.type)} />
        </span>
        <span className="gm-notification-popup-content">
          <strong>{notification.title}</strong>
          <span>{notification.message}</span>
        </span>
      </button>

      <button type="button" className="gm-notification-popup-close" onClick={() => dismissPopup(notification.id)} aria-label="Закрити">
        <FontAwesomeIcon icon={faXmark} />
      </button>
    </div>
  );
}

export default function NotificationPopups() {
  const { popups } = useNotifications();
  if (popups.length === 0) return null;

  return (
    <div className="gm-notification-popups" aria-live="polite" aria-relevant="additions">
      {popups.map(notification => (
        <NotificationPopup key={notification.id} notification={notification} />
      ))}
    </div>
  );
}