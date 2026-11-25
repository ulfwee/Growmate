import React, { useCallback, useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation
} from 'react-router-dom';

import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import StatisticsPage from './pages/StatisticsPage';
import GoalsPage from './pages/GoalsPage';
import TasksPage from './pages/TasksPage';
import Header from './components/Header';
import ClubsPage from './pages/ClubsPage';
import MyClubsPage from './pages/MyClubsPage';
import ClubDetailsPage from './pages/ClubDetailsPage';
import ActivityPage from './pages/ActivityPage';
import GroupGoalDetailsPage from './pages/GroupGoalDetailsPage';
import ProfilePage from './pages/ProfilePage';
import AchievementsPage from './pages/AchievementsPage';
import AdminLayout from './layouts/AdminLayout';
import AdminUsers from './pages/admin/AdminUsers';
import AdminClubs from './pages/admin/AdminClubs';
import AdminPosts from './pages/admin/AdminPosts';
import AdminAnnouncements from './pages/admin/AdminAnnouncements';
import { getMe, logout } from './services/authService';
import { XpProvider, useXp } from './context/XpContext';

import { NotificationProvider } from './context/NotificationContext';
import NotificationPopups from './components/NotificationPopups';
import './css/AppLayout.css';

function AppRoutes({
  currentUser,
  refreshUser,
  handleLogout,
  handleAuthSuccess,
}) {
  const { refreshXp } = useXp();

  const handleStatsChanged = useCallback(async () => {
    await Promise.all([
      refreshUser(),
      refreshXp(),
    ]);
  }, [refreshUser, refreshXp]);

  const protectedPage = component => {
    if (!currentUser) {
      return <Navigate to="/" replace />;
    }

    if (currentUser.role === 'admin') {
      return <Navigate to="/admin" replace />;
    }

    return component;
  };

  const location = useLocation();
  const isAdminRoute =
    location.pathname === '/admin' ||
    location.pathname.startsWith('/admin/');

  return (
    <>
      {currentUser && !isAdminRoute && (
        <Header user={currentUser} onLogout={handleLogout} />
      )}

      <Routes>
        <Route path="/" element={
            currentUser
              ? <Navigate to={currentUser.role === 'admin' ? '/admin' : '/dashboard'} replace />
              : <LandingPage onAuthSuccess={handleAuthSuccess} />
          }
        />

        <Route path="/dashboard" element={protectedPage(
            <DashboardPage user={currentUser} onLogout={handleLogout} onUserStatsChanged={handleStatsChanged} />
          )}
        />

        <Route path="/goals" element={protectedPage(
            <GoalsPage user={currentUser} onLogout={handleLogout} onUserStatsChanged={handleStatsChanged} />
          )}
        />

        <Route path="/tasks" element={protectedPage(
            <TasksPage user={currentUser} onLogout={handleLogout} onUserStatsChanged={handleStatsChanged} />
          )}
        />

        <Route path="/clubs" element={protectedPage(
            <ClubsPage onUserStatsChanged={handleStatsChanged} />
          )}
        />

        <Route path="/my-clubs" element={protectedPage(
            <MyClubsPage onUserStatsChanged={handleStatsChanged} />
          )}
        />

        <Route path="/clubs/:id" element={protectedPage(
            <ClubDetailsPage onUserStatsChanged={handleStatsChanged} />
          )}
        />

        <Route path="/clubs/:clubId/group-goals/:goalId" element={protectedPage(
            <GroupGoalDetailsPage user={currentUser} onUserStatsChanged={handleStatsChanged} />
          )}
        />

        <Route path="/activity" element={protectedPage(
            <ActivityPage user={currentUser} onUserStatsChanged={handleStatsChanged} />
          )}
        />

        <Route path="/statistics" element={protectedPage(
            <StatisticsPage />
          )}
        />

        <Route path="/profile" element={protectedPage(
            <ProfilePage user={currentUser} onUserUpdated={refreshUser} onLogout={handleLogout} />
          )}
        />

        <Route path="/achievements" element={protectedPage(
            <AchievementsPage />
          )}
        />

        <Route path="/admin" element={
            currentUser?.role === 'admin'
              ? (
                <AdminLayout user={currentUser} onLogout={handleLogout} />
              )
              : <Navigate to="/dashboard" replace />
          }
        >
          <Route path="users" element={<AdminUsers />} />
          <Route path="clubs" element={<AdminClubs />} />
          <Route path="posts" element={<AdminPosts />} />
          <Route path="announcements"  element={<AdminAnnouncements />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function AppContent() {
  const [currentUser, setCurrentUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const navigate = useNavigate();

  const refreshUser = useCallback(async () => {
    try {
      const updatedUser = await getMe();

      if (updatedUser) {
        setCurrentUser(updatedUser);
      }

      return updatedUser;
    } catch (error) {
      console.error(
        'Не вдалося оновити дані користувача:',
        error
      );

      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function checkUser() {
      try {
        const user = await getMe();

        if (active) {
          setCurrentUser(user);
        }
      } catch {
        if (active) {
          setCurrentUser(null);
        }
      } finally {
        if (active) {
          setCheckingAuth(false);
        }
      }
    }

    checkUser();

    return () => {
      active = false;
    };
  }, []);

  const handleAuthSuccess = result => {
    setCurrentUser(result.user);

    navigate(
      result.user?.role === 'admin'
        ? '/admin'
        : '/dashboard'
    );
  };

  const handleLogout = () => {
    logout();
    setCurrentUser(null);
    navigate('/');
  };

  if (checkingAuth) {
    return (
      <div className="app-loading">
        Завантаження...
      </div>
    );
  }

  return (
    <XpProvider userId={currentUser?.id}>
      <NotificationProvider userId={currentUser?.id}>
        <AppRoutes
          currentUser={currentUser}
          refreshUser={refreshUser}
          handleLogout={handleLogout}
          handleAuthSuccess={handleAuthSuccess}
        />

        {currentUser?.role !== 'admin' && (
          <NotificationPopups />
        )}
      </NotificationProvider>
    </XpProvider>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}