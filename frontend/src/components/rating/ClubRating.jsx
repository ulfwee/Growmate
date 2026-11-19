import React, { useCallback, useEffect, useState } from 'react';
import { Crown, RefreshCw } from 'lucide-react';
import { getClubRating } from '../../services/clubRatingService';
import '../../css/ClubRating.css';

function displayName(member) {
  return member.username || 'Учасник';
}

function Avatar({ member, large = false }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [member.avatarUrl]);

  const initials = (member.firstName || member.username || '?').charAt(0).toUpperCase();

  return (
    <div className={`cr-avatar ${large ? 'cr-avatar-large' : ''}`}>
      {member.avatarUrl && !failed ? (
        <img src={member.avatarUrl} alt={displayName(member)} onError={() => setFailed(true)} />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

function PodiumColumn({ member, rank }) {
  if (!member) return null;

  return (
    <div className={`cr-podium-entry cr-place-${rank}`}>
      <div className="cr-podium-person">
        <div className="cr-podium-crown">{rank === 1 && <Crown size={30} strokeWidth={2.1} />}</div>
        <Avatar member={member} large />
        <span className="cr-podium-name">@{displayName(member)}</span>
        {member.isCurrentUser && <span className="cr-podium-me">Це ти</span>}
      </div>
      <div className="cr-podium-column">
        <span className="cr-podium-rank">{rank}</span>
        <span className="cr-podium-points">{member.totalPoints} балів</span>
      </div>
    </div>
  );
}

export default function ClubRating({ clubId }) {
  const [rating, setRating] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [animationKey, setAnimationKey] = useState(0);

  const loadRating = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getClubRating(clubId);
      setRating(data);
      setAnimationKey(prev => prev + 1);
    } catch (err) {
      setError(err.message || 'Не вдалося завантажити рейтинг.');
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    loadRating();
  }, [loadRating]);

  if (loading) return <div className="cr-state">Завантаження рейтингу...</div>;
  if (error) {
    return (
      <div className="cr-state">
        <p>{error}</p>
        <button onClick={loadRating}>Спробувати ще раз</button>
      </div>
    );
  }

  const members = rating?.members || [];
  const topThree = members.slice(0, 3);
  const currentUser = members.find(m => m.isCurrentUser);

  return (
    <section className="cr-section">
      <div className="cr-heading">
        <div>
          <h2>Рейтинг клубу</h2>
          <p>Виконуй завдання, ділись звітами та долучайся до подій, щоб піднятися в рейтингу.</p>
        </div>
        <button className="cr-refresh" onClick={loadRating}>
          <RefreshCw size={16} /> Оновити
        </button>
      </div>

      {members.length === 0 ? (
        <div className="cr-state">У клубі поки немає учасників для рейтингу.</div>
      ) : (
        <>
          <div className="cr-podium-section">
            <div className="cr-podium" key={animationKey}>
              <PodiumColumn member={topThree[1]} rank={2} />
              <PodiumColumn member={topThree[0]} rank={1} />
              <PodiumColumn member={topThree[2]} rank={3} />
            </div>
          </div>

          {currentUser && (
            <div className="cr-my-position">
              <div><span>Твоя позиція в клубі</span><strong>#{currentUser.position}</strong></div>
              <div><span>Твої клубні бали</span><strong>{currentUser.totalPoints}</strong></div>
            </div>
          )}

          <div className="cr-list-section">
            <div className="cr-list-heading">
              <h3>Рейтинг учасників</h3>
              <span>{members.length} учасників</span>
            </div>
            <div className="cr-list">
              {members.map((member, index) => (
                <div
                  key={member.userId}
                  className={`cr-list-item ${member.isCurrentUser ? 'cr-list-me' : ''}`}
                  style={{ '--row-delay': `${Math.min(index, 15) * 55}ms` }}
                >
                  <span className="cr-list-rank">{member.position}</span>
                  <Avatar member={member} />
                  <div className="cr-list-user">
                    <strong>
                      @{displayName(member)}
                      {member.isCurrentUser && <span className="cr-you-tag">Ти</span>}
                    </strong>
                    <small>
                      {member.completedTasks} завдань ·{' '}
                      {member.reportsCount} звітів ·{' '}
                      {member.eventsCount} подій
                    </small>
                  </div>
                  <div className="cr-list-points">
                    <strong>{member.totalPoints}</strong>
                    <span>балів</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="cr-rules">
            <span>Як отримувати бали?</span>
            <div>
              <span>Групове завдання <b>+10</b></span>
              <span>Звіт <b>+5</b></span>
              <span>Реєстрація на подію <b>+5</b></span>
            </div>
            <p>Клубні бали не впливають на загальний XP профілю. За звіти можна отримати бали максимум тричі на день.</p>
          </div>
        </>
      )}
    </section>
  );
}