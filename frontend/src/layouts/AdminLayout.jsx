import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  FaUsers, FaUserGroup, FaFileLines, FaBullhorn,
  FaArrowRightFromBracket, FaShieldHalved,
} from 'react-icons/fa6';
import '../css/Admin.css';

const menu = [
  { to: '/admin/users', label: 'Користувачі', icon: FaUsers },
  { to: '/admin/clubs', label: 'Клуби', icon: FaUserGroup },
  { to: '/admin/posts', label: 'Дописи', icon: FaFileLines },
  { to: '/admin/announcements', label: 'Оголошення', icon: FaBullhorn },
];

export default function AdminLayout({ user, onLogout }) {
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-icon"><FaShieldHalved /></div>
          <div>
            <div className="admin-brand-name">growmate.</div>
            <div className="admin-brand-subtitle">Адміністрування</div>
          </div>
        </div>

        <div className="admin-sidebar-label">КЕРУВАННЯ ПЛАТФОРМОЮ</div>

        <nav className="admin-navigation">
          {menu.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-bottom">
          <div className="admin-sidebar-user">
            <div className="admin-avatar">
              {(user?.firstName || user?.username || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="admin-profile-text">
              <strong>{user?.username || 'Адміністратор'}</strong>
              <span>Адміністратор</span>
            </div>
          </div>

          <button type="button" className="admin-logout" onClick={onLogout}>
            <FaArrowRightFromBracket />
            Вийти з акаунта
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <div className="admin-content"><Outlet /></div>
      </main>
    </div>
  );
}