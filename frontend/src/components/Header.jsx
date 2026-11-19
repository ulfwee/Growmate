import React, { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSeedling, faBell, faUser, faChevronDown, faSignOutAlt, faFire } from '@fortawesome/free-solid-svg-icons';
import { useXp } from '../context/XpContext';
import NotificationDropdown from './NotificationDropdown';
import '../css/Header.css';
import '../css/HeaderClub.css';
import '../css/Notifications.css';

export default function Header({ user, onLogout }) {
  const username = user?.username || 'Користувач';
  const userAvatar = user?.avatarUrl;
  const [clubsOpen, setClubsOpen] = useState(false);
  const location = useLocation();
  const { stats } = useXp();

  const xp = stats?.totalXp ?? user?.totalXp ?? 0;
  const streak = stats?.currentStreak ?? user?.currentStreak ?? 0;
  const level = stats?.level ?? null;
  const streakActiveToday = stats?.isStreakActiveToday === true && streak > 0;

  return (
    <header className="dashboard-header">
      <div className="header-inner">
        <div className="header-left">
          <Link to="/dashboard" className="brand">
            <span className="logo-icon"><FontAwesomeIcon icon={faSeedling} /></span>
            <span className="logo-text">Growmate</span>
          </Link>

          <nav className="header-nav">
            <NavLink to="/dashboard">Огляд</NavLink>
            <NavLink to="/goals">Мої цілі</NavLink>
            <NavLink to="/tasks">Завдання</NavLink>

            <div className="header-clubs-menu" onMouseEnter={() => setClubsOpen(true)} onMouseLeave={() => setClubsOpen(false)}>
              <button
                type="button"
                className={`header-clubs-trigger ${location.pathname.startsWith('/clubs') || location.pathname === '/my-clubs' ? 'active' : ''}`}
                aria-haspopup="true" aria-expanded={clubsOpen}
                onClick={() => setClubsOpen(value => !value)}
                onKeyDown={event => { if (event.key === 'Escape') setClubsOpen(false); }}
              >
                Клуби
                <FontAwesomeIcon icon={faChevronDown} />
              </button>

              {clubsOpen && (
                <div className="header-clubs-dropdown">
                  <NavLink to="/clubs" onClick={() => setClubsOpen(false)}>Пошук клубів</NavLink>
                  <NavLink to="/my-clubs" onClick={() => setClubsOpen(false)}>Мої клуби</NavLink>
                </div>
              )}
            </div>

            <NavLink to="/activity">Стрічка спільноти</NavLink>
            <NavLink to="/statistics">Статистика</NavLink>
          </nav>
        </div>

        <div className="header-right">
          <div className="stats-group">
            <div
              className={`streak-badge ${streakActiveToday ? 'active' : 'inactive'}`}
              title={streakActiveToday ? 'Серію активності оновлено сьогодні' : 'Виконай активність, щоб оновити вогник'}
            >
              <FontAwesomeIcon icon={faFire} className="streak-icon" />
              <span className="streak-count">{streak}</span>
            </div>

            {level !== null && (
              <div className="header-level-badge" title={`Рівень ${level}`}>
                <span className="header-level-symbol">✦</span>
                <span>Lv. {level}</span>
              </div>
            )}

            <div className="xp-badge">
              <span className="xp-value">{xp.toLocaleString('uk-UA')}</span>
              <span className="xp-label">XP</span>
            </div>
          </div>

          <NotificationDropdown />

          <div className="profile-dropdown-container">
            <div className="profile-trigger">
              <div className="user-avatar-wrapper">
                {userAvatar ? (
                  <img src={userAvatar} alt={username} className="user-avatar-img" />
                ) : (
                  <div className="user-avatar-fallback"><FontAwesomeIcon icon={faUser} /></div>
                )}
              </div>
              <FontAwesomeIcon icon={faChevronDown} className="dropdown-arrow" />
            </div>

            <div className="dropdown-menu">
              <div className="dropdown-header-user">
                <span className="dropdown-username">{username}</span>
              </div>
              <div className="dropdown-divider" />
              <Link to="/profile" className="dropdown-item">Мій профіль</Link>
              <Link to="/achievements" className="dropdown-item">Досягнення</Link>
              <div className="dropdown-divider" />
              <button type="button" onClick={onLogout} className="dropdown-item logout-item">
                <FontAwesomeIcon icon={faSignOutAlt} className="dropdown-icon" />
                Вийти
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}