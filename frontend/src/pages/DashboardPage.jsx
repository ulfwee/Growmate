import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import '../css/Dashboard.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faUserPlus, faArrowRight, } from '@fortawesome/free-solid-svg-icons';
import { getDashboardData, updateTaskStatus, updateGroupTaskCompletion, joinClub, } from '../services/dashboardService';
import { useToast } from '../components/ToastProvider';
import { getTab } from '../components/tasks/taskUtils';
import DashboardEventsCarousel from '../components/events/DashboardEventsCarousel';
import UserLevelProgress from '../components/UserLevelProgress';
const priorityLabels = {
  high: 'Високий',
  medium: 'Середній',
  low: 'Низький',
};
const getTodayString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const toDateKey = (value) => {
  if (!value)
    return null;
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match)
      return match[1];
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime()))
    return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const formatDate = (dateString) => {
  if (!dateString)
    return 'Без терміну';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime()))
    return 'Без терміну';
  return new Intl.DateTimeFormat('uk-UA', {
    day: 'numeric',
    month: 'short',
  }).format(date);
};
const formatTime = (dateString) => {
  if (!dateString)
    return null;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime()))
    return null;
  return new Intl.DateTimeFormat('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};
const getDisplayName = (user) => {
  if (user?.firstName) {
    return user.firstName;
  }
  if (user?.username) {
    return user.username;
  }
  return 'користувачу';
};
export default function DashboardPage({ user, onLogout, onUserStatsChanged }) {
  const [dashboardData, setDashboardData] = useState({
    stats: null,
    goals: [],
    tasks: [],
    recommendedClubs: [],
    errors: [],
  });
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const [joiningClubId, setJoiningClubId] = useState(null);
  const { showToast } = useToast();
  const loadDashboard = useCallback(async (showLoader = false) => {
    if (showLoader) {
      setLoading(true);
    }
    setPageError('');
    try {
      const data = await getDashboardData();
      setDashboardData(data);
    }
    catch (error) {
      setPageError(error.message || 'Не вдалося завантажити огляд.');
    }
    finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    loadDashboard(true);
  }, [loadDashboard]);
  const stats = dashboardData.stats;
  const userStats = {
    xp: stats?.totalXp ?? user?.totalXp ?? 0,
    streak: stats?.currentStreak ?? user?.currentStreak ?? 0,
  };
  const activeGoals = useMemo(() => {
    return dashboardData.goals
      .filter((goal) => goal.status === 'active')
      .sort((a, b) => {
        if (!a.deadline)
          return 1;
        if (!b.deadline)
          return -1;
        return new Date(a.deadline) - new Date(b.deadline);
      })
      .slice(0, 3);
  }, [dashboardData.goals]);
  const todayTasks = useMemo(() => dashboardData.tasks
    .filter(task => {
      if (task.status === 'completed' || task.status === 'cancelled' || task.isRecurring)
        return false;
      return ['today'].includes(getTab(task));
    })
    .sort((a, b) => (toDateKey(a.dueDate) || '').localeCompare(toDateKey(b.dueDate) || ''))
    .slice(0, 5), [dashboardData.tasks]);
  const handleCompleteTask = async (task) => {
    if (updatingTaskId !== null)
      return;
    setUpdatingTaskId(task.uniqueId);
    try {
      if (task.source === 'group') {
        await updateGroupTaskCompletion(task.clubId, task.groupGoalId, task.id, true);
      }
      else {
        await updateTaskStatus(task.id, 'completed');
      }
      setDashboardData(previous => ({
        ...previous,
        tasks: previous.tasks.map(item => item.uniqueId === task.uniqueId
          ? { ...item, status: 'completed', isCompleted: true } : item),
      }));
      await onUserStatsChanged?.();
      const refreshed = await getDashboardData();
      setDashboardData(refreshed);
      showToast('Завдання виконано. Чудова робота!');
    }
    catch (error) {
      showToast(error.message || 'Не вдалося виконати завдання.', 'error');
    }
    finally {
      setUpdatingTaskId(null);
    }
  };
  const handleJoinClub = async (club) => {
    if (joiningClubId !== null)
      return;
    setJoiningClubId(club.id);
    try {
      await joinClub(club.id);
      if (club.visibility === 'public') {
        await onUserStatsChanged?.();
      }
      await loadDashboard(false);
      showToast(club.visibility === 'private'
        ? 'Заявку на вступ успішно надіслано.'
        : 'Ви успішно приєдналися до клубу.');
    }
    catch (error) {
      showToast(error.message || 'Не вдалося приєднатися до клубу.', 'error');
    }
    finally {
      setJoiningClubId(null);
    }
  };
  const handleCopyInviteLink = async () => {
    const inviteUrl = new URL('/register', window.location.origin).href;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      showToast('Посилання для запрошення скопійовано!');
    }
    catch {
      showToast('Не вдалося скопіювати посилання. Спробуй ще раз.', 'error');
    }
  };
  const username = user?.username || 'Користувач';
  const avatarUrl = user?.avatarUrl;
  return (<div className="dashboard">
    <main className="dashboard-main">
      {pageError && (<div className="dashboard-error">
        {pageError}
        <button onClick={() => loadDashboard(true)}>
          Спробувати ще раз
        </button>
      </div>)}

      {dashboardData.errors.length > 0 && !loading && (<div className="dashboard-warning">
        Частину інформації не вдалося завантажити. Перевір підключення до сервера.
      </div>)}

      <div className="strava-layout">
        <aside className="sidebar-left">
          <div className="profile-card">
            <div className="profile-avatar">
              {avatarUrl ? (<img src={avatarUrl} alt={username} />) : (<span>{username.charAt(0).toUpperCase()}</span>)}
            </div>

            <h2 className="profile-name">{username}</h2>

            <p className="profile-caption">
              Продовжуй рухатися до своїх цілей
            </p>

            <div className="profile-stats-row">
              <div className="p-stat">
                <span className="p-stat-label">Серія</span>
                <span className="p-stat-val">
                  {userStats.streak} дн.
                </span>
              </div>

              <div className="p-stat">
                <span className="p-stat-label">Досвід</span>
                <span className="p-stat-val">
                  {userStats.xp} XP
                </span>
              </div>
            </div>
            <UserLevelProgress />
            <Link to="/statistics" className="profile-more-link">
              Моя статистика
            </Link>
          </div>

          <div className="sidebar-goals-section">
            <div className="section-header">
              <h3 className="section-title">Мої активні цілі</h3>

              <Link to="/goals" className="add-goal-btn">
                + Ціль
              </Link>
            </div>

            <div className="goals-list">
              {loading ? (<p className="dashboard-placeholder">
                Завантаження цілей...
              </p>) : activeGoals.length > 0 ? (activeGoals.map((goal) => (<article key={goal.id} className="goal-card">
                <div className="goal-top">
                  <h4 className="goal-title">{goal.title}</h4>
                  <span className="goal-status">Активна</span>
                </div>

                <div className="progress-track">
                  <div className="progress-fill" style={{
                    width: `${Math.min(Math.max(goal.progress ?? 0, 0), 100)}%`,
                  }} />
                </div>

                <div className="goal-meta">
                  <span>Прогрес: {goal.progress ?? 0}%</span>
                  <span>{formatDate(goal.deadline)}</span>
                </div>
              </article>))) : (<div className="dashboard-empty">
                <p>Поки немає активних цілей.</p>
                <Link to="/goals">Створити першу ціль</Link>
              </div>)}
            </div>

            <Link to="/goals" className="section-link">
              Усі мої цілі →
            </Link>
          </div>
        </aside>

        <section className="feed-center">
          <DashboardEventsCarousel />

          <div className="tasks-section">
            <div className="section-header">
              <div>
                <h2 className="section-title">Завдання на сьогодні</h2>
                <p className="section-subtitle">
                  Твої наступні кроки до результату
                </p>
              </div>

              <Link to="/tasks" className="section-link">
                Усі завдання →
              </Link>
            </div>

            <div className="tasks-card">
              {loading ? (<p className="dashboard-placeholder">
                Завантаження завдань...
              </p>) : todayTasks.length > 0 ? (<ul className="tasks-list">
                {todayTasks.map((task) => {
                  const isOverdue = task.dueDate &&
                    toDateKey(task.dueDate) < getTodayString();
                  return (<li key={task.uniqueId} className={`task-item ${task.status === 'completed' ? 'completed' : ''}`}>
                    <label className="task-checkbox">
                      <input type="checkbox" checked={task.status === 'completed'} disabled={updatingTaskId !== null || (task.source === 'group' && ['completed', 'cancelled'].includes(task.groupGoalStatus))} onChange={() => handleCompleteTask(task)} />
                      <span className="checkmark" />
                    </label>

                    <div className="task-content">
                      <div className="task-title">{task.title}</div>

                      <div className="task-subtitle">
                        {task.source === 'group'
                          ? `Групова ціль: ${task.groupGoalTitle || 'Без назви'} · ${task.clubName || 'Клуб'}`
                          : task.goalTitle || task.description || 'Особисте завдання'}
                      </div>
                    </div>

                    <div className="task-meta">
                      {task.source === 'group' ? (<span className="priority-badge priority-medium">Групове</span>) : (<span className={`priority-badge priority-${task.priority}`}>
                        {priorityLabels[task.priority] || 'Середній'}
                      </span>)}

                      <span className={`task-deadline ${isOverdue ? 'task-overdue' : ''}`}>
                        {task.source === 'group' ? formatDate(task.dueDate) : formatTime(task.dueDate) || formatDate(task.dueDate)}
                      </span>
                    </div>
                  </li>);
                })}
              </ul>) : (<div className="dashboard-empty">
                <p>На сьогодні немає невиконаних завдань.</p>
                <span>Чудова нагода запланувати наступний крок!</span>
              </div>)}

              <Link to="/tasks" className="add-task-btn">
                + Перейти до завдань
              </Link>
            </div>
          </div>
        </section>

        <aside className="sidebar-right">
          <div className="sidebar-promo">
            <FontAwesomeIcon icon={faUsers} className="sidebar-promo-icon" />

            <div className="sidebar-promo-content">
              <h3>Розвивайся разом</h3>
              <p>
                Знаходь однодумців, ділися досвідом та досягай цілей разом.
              </p>
              <Link to="/clubs" className="sidebar-promo-link">
                Знайти клуб <FontAwesomeIcon icon={faArrowRight} />
              </Link>
            </div>
          </div>

          <div className="sidebar-promo">
            <FontAwesomeIcon icon={faUserPlus} className="sidebar-promo-icon" />

            <div className="sidebar-promo-content">
              <h3>Запроси друзів</h3>
              <p>
                Запроси друзів до Growmate та розвивайтеся разом.
              </p>
              <button type="button" className="sidebar-promo-link" onClick={handleCopyInviteLink}>
                Запросити друзів
                <FontAwesomeIcon icon={faArrowRight} />
              </button>
            </div>
          </div>
        </aside>
      </div>

      <section className="clubs-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Рекомендовані клуби</h2>
            <p className="section-subtitle">
              Спільноти, які можуть відповідати твоїм інтересам
            </p>
          </div>

          <Link to="/clubs" className="section-link">
            Усі клуби →
          </Link>
        </div>

        {loading ? (<div className="dashboard-placeholder">
          Завантаження рекомендацій...
        </div>) : dashboardData.recommendedClubs.length > 0 ? (<div className="clubs-grid">
          {dashboardData.recommendedClubs.slice(0, 3).map((club) => (<article key={club.id} className="club-card">
            {club.coverUrl && (<div className="club-card-image">
              <img src={club.coverUrl} alt={club.name} />
            </div>)}

            <div className="club-card-top">
              <span className="club-tag">
                {club.categoryName || 'Спільнота'}
              </span>

              {club.membersCount !== null && (<span className="club-members">
                {club.membersCount} учасн.
              </span>)}
            </div>

            <h3 className="club-card-name">{club.name}</h3>

            <p className="club-card-desc">
              {club.description || 'Долучайся до спільноти та розвивайся разом.'}
            </p>

            {club.matchingInterests?.length > 0 && (<div className="club-matching-interests">
              <span>Спільні інтереси:</span>
              <p>{club.matchingInterests.join(', ')}</p>
            </div>)}

            {club.isMember || club.isOwner ? (<Link to={`/clubs/${club.id}`} className="join-btn joined-btn">
              Переглянути клуб
            </Link>) : (<button className="join-btn" onClick={() => handleJoinClub(club)} disabled={joiningClubId === club.id}>
              {joiningClubId === club.id
                ? 'Зачекайте...'
                : club.visibility === 'private'
                  ? 'Подати заявку'
                  : 'Приєднатися'}
            </button>)}
          </article>))}
        </div>) : (<div className="dashboard-empty clubs-empty">
          <p>Поки немає рекомендацій для тебе.</p>
          <span>
            Заповни свої інтереси або переглянь усі доступні клуби.
          </span>
          <Link to="/clubs">Переглянути клуби</Link>
        </div>)}
      </section>
    </main>
  </div>);
}