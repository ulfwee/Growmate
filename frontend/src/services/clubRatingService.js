const API_URL = import.meta.env.VITE_API_URL;

export async function getClubRating(clubId) {
  const token = localStorage.getItem('token');

  const response = await fetch(
    `${API_URL}/clubs/${clubId}/rating`,
    {
      headers: {
        ...(token
          ? { Authorization: `Bearer ${token}` }
          : {}),
      },
    }
  );

  if (!response.ok) {
    let message = 'Не вдалося завантажити рейтинг клубу.';

    try {
      const error = await response.json();
      message = error.message || error.title || message;
    } catch {
    }

    throw new Error(message);
  }

  return response.json();
}