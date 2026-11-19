import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faArrowRight, faStar, faCrown, faCheck, faLock, faGlobe } from '@fortawesome/free-solid-svg-icons';
import { getImageUrl } from '../../utils/imageUrl';

const CARD_THEMES = ['lilac', 'sand', 'sage', 'rose', 'blue'];

export default function SimpleClubCard({ club, recommended = false }) {
  const initials = (club.name || '?').trim().slice(0, 2).toUpperCase();
  const interests = Array.isArray(club.matchingInterests) ? club.matchingInterests : [];

  const status = club.isOwner ? 'Ви — власник'
    : club.isMember ? 'Ви — учасник'
    : club.visibility === 'private' ? 'Приватний' : 'Публічний';

  const statusIcon = club.isOwner ? faCrown
    : club.isMember ? faCheck
    : club.visibility === 'private' ? faLock : faGlobe;

  const themeIndex = String(club.id ?? club.name ?? '')
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0) % CARD_THEMES.length;

  const theme = CARD_THEMES[themeIndex];
  const coverUrl = club.coverUrl?.trim() ? getImageUrl(club.coverUrl.trim()) : null;

  return (
    <article className={[
      'gm-club-card', 'gm-club-card-v2', `gm-club-card-${theme}`,
      recommended ? 'gm-club-card-recommended' : '',
    ].filter(Boolean).join(' ')}>
      <Link to={`/clubs/${club.id}`} className="gm-club-card-main" aria-label={`Переглянути клуб ${club.name}`}>
        <div className={`gm-club-card-visual ${coverUrl ? 'has-cover' : ''}`}>
          {coverUrl && (
            <img
              className="gm-club-card-cover-image"
              src={coverUrl}
              alt=""
              loading="lazy"
              onError={event => { event.currentTarget.style.display = 'none'; }}
            />
          )}

          <div className="gm-club-card-visual-content">
            <span className={`gm-club-card-status ${club.isOwner ? 'is-owner' : ''}`}>
              <FontAwesomeIcon icon={statusIcon} />
              {status}
            </span>
          </div>
        </div>

        <div className="gm-club-card-content">
          <span className="gm-club-category">{club.categoryName || 'Спільнота'}</span>
          <h3>{club.name}</h3>
          <p>{club.description || 'Спільнота для спільного розвитку та обміну досвідом.'}</p>

          {recommended && interests.length > 0 && (
            <div className="gm-club-matching">
              <span className="gm-club-matching-title">
                <FontAwesomeIcon icon={faStar} />
                Спільні інтереси
              </span>
              <div className="gm-club-interest-tags">
                {interests.slice(0, 3).map(interest => <span key={interest}>{interest}</span>)}
                {interests.length > 3 && <span>+{interests.length - 3}</span>}
              </div>
            </div>
          )}

          <div className="gm-club-card-footer">
            <span className="gm-club-members">
              <FontAwesomeIcon icon={faUsers} />
              {club.membersCount ?? 0} учасників
            </span>
            <span className="gm-club-open">
              Відкрити
              <FontAwesomeIcon icon={faArrowRight} />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}