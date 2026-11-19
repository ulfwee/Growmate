import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpRightFromSquare, faUsers, faLock, faCheck, faArrowRight, faSpinner } from '@fortawesome/free-solid-svg-icons';

export default function ClubCard({ club, recommended = false, onJoin, busy = false }) {
  const joined = club.isMember || club.isOwner;
  const isPrivate = club.visibility === 'private';
  const canJoin = !joined && !isPrivate;
  const interests = Array.isArray(club.matchingInterests) ? club.matchingInterests : [];
  const initial = club.name?.trim()?.charAt(0)?.toUpperCase() || 'G';
  const palette = ['lilac', 'sand', 'sage', 'rose', 'blue'];

  return (
    <article className={`clubs-card clubs-card--rose`}>
      <Link to={`/clubs/${club.id}`} className="clubs-card-cover" aria-label={`Переглянути клуб ${club.name}`}>
        {club.coverUrl ? (
          <img src={club.coverUrl} alt="" loading="lazy" />
        ) : (
          <div className="clubs-card-cover-placeholder"><span>{initial}</span></div>
        )}
        <span className="clubs-cover-category">{club.categoryName || 'Спільнота'}</span>
      </Link>
      <div className="clubs-card-body">
        <div className="clubs-card-flags">
          {joined ? (
            <span className="clubs-card-flag"><FontAwesomeIcon icon={faCheck} /> Ви учасник</span>
          ) : isPrivate ? (
            <span className="clubs-card-flag"><FontAwesomeIcon icon={faLock} /> Приватний</span>
          ) : (
            <span className="clubs-card-flag">Публічний</span>
          )}
          {recommended && interests.length > 0 && <span className="clubs-match">{interests.length} спільн. інтерес{interests.length === 1 ? '' : 'и'}</span>}
        </div>
        <Link to={`/clubs/${club.id}`} className="clubs-card-name">{club.name}</Link>
        <p className="clubs-card-description">{club.description}</p>
        {interests.length > 0 && (
          <div className="clubs-card-interests">
            {interests.slice(0, 3).map(interest => <span key={interest}>{interest}</span>)}
          </div>
        )}
        <div className="clubs-card-footer">
          <span className="clubs-member-count">
            {Number.isFinite(club.membersCount) ? <><FontAwesomeIcon icon={faUsers} /> {club.membersCount} учасників</> : 'Рекомендовано для вас'}
          </span>
          {canJoin ? (
            <button type="button" className="clubs-card-join" disabled={busy} onClick={() => onJoin(club)}>
              {busy ? <FontAwesomeIcon icon={faSpinner} spin /> : <>Приєднатися <FontAwesomeIcon icon={faArrowRight} /></>}
            </button>
          ) : (
            <Link className="clubs-card-view" to={`/clubs/${club.id}`}>
              {isPrivate && !joined ? 'Детальніше' : 'Переглянути'} <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}