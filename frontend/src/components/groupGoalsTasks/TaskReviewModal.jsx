import React, { useState, useEffect } from 'react';
import { reviewTaskSubmission, downloadTaskAttachment, fetchTaskAttachment } from '../../services/taskSubmissionsService';
import '../../css/TaskSubmissions.css';

function Attachment({ attachment, onError }) {
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);
  const image = ['image/jpeg', 'image/png'].includes(attachment.contentType);
  useEffect(() => {
    if (!image) return;
    const controller = new AbortController();
    let objectUrl;
    fetchTaskAttachment(attachment, controller.signal).then(blob => {
      if (controller.signal.aborted) return;
      objectUrl = URL.createObjectURL(new Blob([blob], { type: attachment.contentType }));
      setUrl(objectUrl);
    }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [attachment, image]);
  return <div className="gm-review-attachment">
    {image && (url && !failed ? <a href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt={attachment.fileName} onError={() => setFailed(true)} /></a> : <small>{failed ? 'Не вдалося показати зображення' : 'Завантаження зображення…'}</small>)}
    <div className="gm-review-file-row"><span>{attachment.fileName}</span><button type="button" title="Завантажити файл" onClick={async () => { try { await downloadTaskAttachment(attachment); } catch (err) { onError(err.message); } }}>↓</button></div>
  </div>;
}

export default function TaskReviewModal({ clubId, goalId, submission, onClose, onSuccess }) {
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function handleReview(e) {
    e.preventDefault();
    if (busy) return;
    if (rating < 3 && !reviewComment.trim()) return setError('Вкажіть причину відхилення.');
    setBusy(true); setError('');
    try { await reviewTaskSubmission(clubId, goalId, submission.id, { rating, reviewComment: reviewComment.trim() }); }
    catch (err) { setError(err.message); setBusy(false); return; }
    setBusy(false); onClose(); onSuccess?.();
  }
  return <div className="gm-review-overlay"><section className="gm-review-modal" role="dialog" aria-modal="true" aria-label="Перевірка завдання">
    <header className="gm-review-header"><div><h2>Перевірка завдання</h2><p>{submission.taskTitle} · {submission.username}</p></div><button type="button" aria-label="Закрити" disabled={busy} onClick={onClose}>×</button></header>
    <h3>Звіт учасника</h3><div className="gm-review-note">{submission.reportText}</div>
    {/^https:\/\//i.test(submission.evidenceUrl || '') && <a href={submission.evidenceUrl} target="_blank" rel="noopener noreferrer">Посилання на результат</a>}
    {!!submission.attachments?.length && <><h3>Докази виконання</h3><div className="gm-review-attachments">{submission.attachments.map(a => <Attachment key={a.id} attachment={a} onError={setError} />)}</div></>}
    <form onSubmit={handleReview}>
      <label>Оцінка виконання</label><div className="gm-review-stars">{[1,2,3,4,5].map(n => <button key={n} type="button" aria-label={`${n} з 5`} aria-pressed={rating === n} className={n <= rating ? 'selected' : ''} onClick={() => setRating(n)}>★</button>)} <span>{rating}/5</span></div>
      <label>Коментар {rating < 3 ? '*' : ''}<textarea rows={4} maxLength={2000} required={rating < 3} value={reviewComment} onChange={e => setReviewComment(e.target.value)} /></label>
      <div className="gm-review-note">{rating >= 3 ? `Схвалено · +${rating * 3} XP` : 'Повернення на доопрацювання'}</div>
      {error && <p role="alert" className="gm-review-error">{error}</p>}
      <div className="gm-review-actions"><button type="button" disabled={busy} onClick={onClose}>Скасувати</button><button className="gm-review-primary" disabled={busy}>{busy ? 'Збереження…' : rating >= 3 ? 'Схвалити' : 'Повернути на доопрацювання'}</button></div>
    </form>
  </section></div>;
}
