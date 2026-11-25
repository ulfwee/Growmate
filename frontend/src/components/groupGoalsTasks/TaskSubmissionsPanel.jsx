import React, { useEffect, useState } from 'react';
import { getPendingTaskSubmissions } from '../../services/taskSubmissionsService';
import TaskReviewModal from './TaskReviewModal';
import '../../css/TaskSubmissions.css';

export default function TaskSubmissionsPanel({ clubId, userId, onRefresh, refreshVersion = 0 }) {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setItems([]); setSelected(null);
    getPendingTaskSubmissions(clubId).then(data => { if (active) setItems(data || []); }).catch(err => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [clubId, version, refreshVersion]);
  return <section className="gm-review-panel">
    <div className="gm-review-heading"><h2>Звіти на перевірку <small>{items.length}</small></h2><button type="button" onClick={() => setVersion(v => v + 1)} aria-label="Оновити звіти" title="Оновити звіти">↻</button></div>
    {loading ? <p>Завантаження…</p> : error ? <p role="alert" className="gm-review-error">{error}</p> : !items.length ? <p>Немає звітів на перевірку.</p> : items.map(item => <article className="gm-review-item" key={item.id}>
      <div><strong>{item.taskTitle}</strong><p>{item.username}</p><small>{item.submittedAt ? new Date(item.submittedAt).toLocaleString('uk-UA') : ''}</small></div>
      <button type="button" className="gm-review-primary" disabled={userId == null || String(item.userId) === String(userId) || !item.groupGoalId} onClick={() => setSelected(item)}>Перевірити</button>
    </article>)}
    {selected && <TaskReviewModal key={selected.id} clubId={clubId} goalId={selected.groupGoalId} submission={selected} onClose={() => setSelected(null)} onSuccess={() => { setVersion(v => v + 1); onRefresh?.(); }} />}
  </section>;
}
