import React, { useEffect, useState } from 'react';
import '../css/Toast.css';

export default function Toast({ message, type = 'success', duration = 5000, onClose }) {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!message) return;
    const fadeTime = 350;

    const hideTimer = setTimeout(() => setLeaving(true), Math.max(0, duration - fadeTime));
    const closeTimer = setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, duration);

    return () => {
      clearTimeout(hideTimer);
      clearTimeout(closeTimer);
    };
  }, [message, duration, onClose]);

  if (!message || !visible) return null;

  const close = () => {
    setLeaving(true);
    setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, 350);
  };

  return (
    <div
      className={['gm-toast', `gm-toast-${type}`, leaving ? 'gm-toast-leaving' : ''].join(' ')}
      role={type === 'error' ? 'alert' : 'status'}
    >
      <span className="gm-toast-icon">{type === 'success' ? '✓' : type === 'error' ? '!' : 'i'}</span>
      <div className="gm-toast-content">
        <strong>{type === 'success' ? 'Успішно' : type === 'error' ? 'Помилка' : 'Інформація'}</strong>
        <p>{message}</p>
      </div>
      <button type="button" className="gm-toast-close" onClick={close} aria-label="Закрити повідомлення">×</button>
      <div className="gm-toast-progress" style={{ animationDuration: `${duration}ms` }} />
    </div>
  );
}