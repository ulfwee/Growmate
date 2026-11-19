const API_URL = `${
  import.meta.env.VITE_API_URL || 'http://localhost:5200'
}/api`;

export async function getLeaderboard() {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/leaderboard`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!response.ok) throw new Error('Не вдалося завантажити рейтинг користувачів.');
  return response.json();
}