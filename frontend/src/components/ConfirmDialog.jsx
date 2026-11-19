import React, { useEffect, useId, useRef } from 'react';
import '../css/ConfirmDialog.css';

export default function ConfirmDialog({
  open, mode = 'confirm', title = 'Підтвердження дії', message,
  confirmText = 'Підтвердити', cancelText = 'Скасувати',
  variant = 'danger', loading = false, onConfirm, onCancel,
}) {
  const cancelRef = useRef(null);
  const confirmRef = useRef(null);
  const uid = useId();

  useEffect(() => {
    if (!open) return;

    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    (mode === 'info' ? confirmRef : cancelRef).current?.focus();

    const escape = e => {
      if (e.key === 'Escape' && !loading) onCancel?.();
    };

    document.addEventListener('keydown', escape);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener('keydown', escape);
    };
  }, [open, loading, mode, onCancel]);

  if (!open) return null;

  return (
    <div className="confirm-backdrop" onMouseDown={e => {
      if (e.target === e.currentTarget && !loading) onCancel?.();
    }}>
      <div
        className="confirm-dialog"
        role={mode === 'info' ? 'dialog' : 'alertdialog'}
        aria-modal="true"
        aria-labelledby={`${uid}-title`}
        aria-describedby={`${uid}-message`}
      >
        <div className="confirm-dialog-header">
          <h2 id={`${uid}-title`}>{title}</h2>
          <button type="button" className="confirm-close" onClick={onCancel} disabled={loading} aria-label="Закрити">×</button>
        </div>

        <p id={`${uid}-message`} className="confirm-message">{message}</p>

        <div className="confirm-actions">
          {mode !== 'info' && (
            <button ref={cancelRef} type="button" className="confirm-cancel" onClick={onCancel} disabled={loading}>
              {cancelText}
            </button>
          )}
          <button ref={confirmRef} type="button" className={`confirm-submit confirm-submit-${variant}`} onClick={onConfirm} disabled={loading}>
            {loading ? 'Зачекайте...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}