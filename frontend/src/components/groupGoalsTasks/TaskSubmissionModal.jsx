import React, { useState } from 'react';
import { submitTask } from '../../services/taskSubmissionsService';
import '../../css/TaskSubmissions.css';

export default function TaskSubmissionModal({ clubId, goalId, task, onClose, onSuccess }) {
    const [reportText, setReportText] = useState('');
    const [evidenceUrl, setEvidenceUrl] = useState('');
    const [attachments, setAttachments] = useState([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(event) {
        event.preventDefault();
        if (busy) return;
        setError('');
        if (!reportText.trim()) return setError('Опишіть виконану роботу.');
        if (task.requiresAttachment && !attachments.length) return setError('Прикріпіть доказ виконання.');
        if (attachments.length > 3 || attachments.some(f => !f.size || f.size > 5 * 1024 ** 2 || !['image/jpeg', 'image/png', 'application/pdf'].includes(f.type)) || attachments.reduce((sum, f) => sum + f.size, 0) > 10 * 1024 ** 2) return setError('До 3 файлів PNG, JPEG або PDF, до 5 МБ кожен та 10 МБ загалом.');
        if (evidenceUrl.trim() && !/^https:\/\//i.test(evidenceUrl.trim())) return setError('Посилання повинно використовувати HTTPS.');
        setBusy(true);
        try {
            await submitTask(clubId, goalId, task.id, { reportText: reportText.trim(), evidenceUrl, attachments });
        } catch (err) {
            setError(err.message); setBusy(false); return;
        }
        setBusy(false);
        onClose();
        onSuccess?.();
    }

    return <div className="gm-review-overlay"><section className="gm-review-modal" role="dialog" aria-modal="true" aria-label="Здати завдання">
        <h2>Здати завдання</h2><p>{task.title}</p>
        {task.reviewCriteria && <div className="gm-review-note"><strong>Критерії виконання</strong><p>{task.reviewCriteria}</p></div>}
        <form onSubmit={handleSubmit}>
            <label>Опис виконаної роботи *<textarea required maxLength={5000} rows={5} value={reportText} onChange={e => setReportText(e.target.value)} /></label>
            <label>Посилання на результат<input type="url" maxLength={2048} placeholder="https://" value={evidenceUrl} onChange={e => setEvidenceUrl(e.target.value)} /></label>
            <label>Докази виконання {task.requiresAttachment ? '*' : ''}<input type="file" multiple accept="image/jpeg,image/png,application/pdf" onChange={e => setAttachments(Array.from(e.target.files))} /></label>
            {attachments.map((f, i) => <div key={i} className="gm-review-file">{f.name}</div>)}
            {error && <p role="alert" className="gm-review-error">{error}</p>}
            <div className="gm-review-actions"><button type="button" disabled={busy} onClick={onClose}>Скасувати</button><button className="gm-review-primary" disabled={busy}>{busy ? 'Надсилання…' : 'Надіслати на перевірку'}</button></div>
        </form>
    </section></div>;
}
