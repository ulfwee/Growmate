import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getXpStats } from '../services/xpService';

const XpContext = createContext(null);

export function XpProvider({ children, userId }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const requestId = useRef(0);
  const currentUserId = useRef(userId);
  currentUserId.current = userId;

  const refreshXp = useCallback(async () => {
    const id = ++requestId.current;
    const requestedUserId = currentUserId.current;

    if (requestedUserId == null) {
      setStats(null);
      setLoading(false);
      return null;
    }

    try {
      setLoading(true);
      setError('');
      const data = await getXpStats();

      if (id === requestId.current && requestedUserId === currentUserId.current) {
        setStats(data);
      }
      return data;
    } catch (err) {
      if (id === requestId.current) {
        console.error('Помилка завантаження XP:', err);
        setError('Не вдалося завантажити статистику XP.');
      }
      return null;
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    requestId.current += 1;
    setStats(null);
    setError('');

    if (userId == null) {
      setLoading(false);
      return;
    }

    refreshXp();
    return () => {
      requestId.current += 1;
    };
  }, [userId, refreshXp]);

  return (
    <XpContext.Provider value={{ stats, loading, error, refreshXp }}>
      {children}
    </XpContext.Provider>
  );
}

export function useXp() {
  const context = useContext(XpContext);
  if (!context) throw new Error('useXp має використовуватися всередині XpProvider');
  return context;
}