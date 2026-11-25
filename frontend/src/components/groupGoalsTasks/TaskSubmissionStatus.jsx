import React from 'react';
import '../../css/TaskSubmissions.css';

export default function TaskSubmissionStatus({ task, canSubmit = false, onSubmit }) {
  const report = task.mySubmission;
  const status = task.isCompleted ? 'approved' : report?.status || 'new';
  const labels = { new: 'Не виконано', pending: 'Очікує перевірки', approved: 'Виконано', rejected: 'На доопрацювання' };
  return <div className="gm-review-status-block">
    <span className={`gm-review-status gm-review-${status}`}>{labels[status]}</span>
    {report?.rating != null && <span>Оцінка: {report.rating}/5</span>}
    {report?.reviewComment && <p className="gm-review-note">{report.reviewComment}</p>}
    {canSubmit && onSubmit && ['new', 'rejected'].includes(status) && <button type="button" className="gm-review-primary" onClick={() => onSubmit(task)}>{status === 'rejected' ? 'Здати повторно' : 'Здати завдання'}</button>}
  </div>;
}
