import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyGroupGoals } from '../../services/groupGoalsService';
import '../../css/GroupGoals.css';

const STATUS_LABELS = {
  planned: 'Запланована', active: 'Активна',
  completed: 'Завершена', cancelled: 'Скасована',
};

export default function MyGroupGoals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getMyGroupGoals()
      .then(data => {
        if (active) setGoals(Array.isArray(data) ? data : []);
      })
      .catch(err => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  if (loading) return <div className="gg-empty">Завантаження групових цілей...</div>;
  if (error) return <div className="gg-error-banner">{error}</div>;

  return (
    <section className="gg-section">
      <div className="gg-heading">
        <div>
          <h2>Мої групові цілі</h2>
          <p>Цілі клубів, до виконання яких ви долучилися.</p>
        </div>
      </div>

      {goals.length === 0 ? (
        <div className="gg-empty">
          <h3>Ви ще не долучилися до групових цілей</h3>
          <p>Перейдіть до свого клубу та оберіть ціль, над якою хочете працювати.</p>
          <Link to="/my-clubs" className="gg-btn-secondary">Переглянути мої клуби</Link>
        </div>
      ) : (
        <div className="gg-grid">
          {goals.map(goal => (
            <article className="gg-card" key={goal.id}>
              <div className="gg-card-top">
                <span className={`gg-status gg-status-${goal.status}`}>{STATUS_LABELS[goal.status] || goal.status}</span>
                <span className="gg-joined">Групова ціль</span>
              </div>

              <h3>{goal.title}</h3>
              <p className="gg-description">{goal.description || 'Опис відсутній.'}</p>
              <div className="gg-progress-label">
                <span>Мій прогрес</span>
                <strong>{Math.round(goal.myProgress ?? 0)}%</strong>
              </div>
              <div className="gg-progress-track">
                <div style={{ width: `${Math.max(0, Math.min(100, Number(goal.myProgress) || 0))}%` }} />
              </div>
              <div className="gg-meta">
                <span>Завдань: {goal.tasksCount ?? 0}</span>
                <span>До {goal.endDate
                  ? new Date(`${goal.endDate.slice(0, 10)}T12:00:00`).toLocaleDateString('uk-UA')
                  : '—'}</span>
              </div>
              <div className="gg-card-actions">
                <Link className="gg-btn-secondary" to={`/clubs/${goal.clubId}/group-goals/${goal.id}`}>
                  Переглянути ціль
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}