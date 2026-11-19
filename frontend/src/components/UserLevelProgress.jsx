import React from 'react';
import LevelProgress from './LevelProgress';
import { useXp } from '../context/XpContext';

export default function UserLevelProgress({ compact = false }) {
  const { stats, loading, error } = useXp();

  if (loading && !stats) return <p>Завантаження рівня...</p>;
  if (error && !stats) return <p>Не вдалося завантажити рівень.</p>;
  if (!stats) return null;

  return <LevelProgress stats={stats} compact={compact} />;
}