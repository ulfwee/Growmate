const API_URL = `${
  import.meta.env.VITE_API_URL || 'http://localhost:5200'
}/api`;

const request = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    let message = 'Не вдалося виконати запит.';

    try {
      const error = await response.json();
      message = error.message || error.title || message;
    } catch {
    }

    throw new Error(message);
  }

  if (response.status === 204) return null;

  return response.json();
};

const base = clubId => `/clubs/${clubId}/events`;

export const getClubEvents = clubId =>
  request(base(clubId));

export const getClubEvent = (clubId, eventId) =>
  request(`${base(clubId)}/${eventId}`);

export const createClubEvent = (clubId, data) =>
  request(base(clubId), {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateClubEvent = (clubId, eventId, data) =>
  request(`${base(clubId)}/${eventId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const deleteClubEvent = (clubId, eventId) =>
  request(`${base(clubId)}/${eventId}`, {
    method: 'DELETE',
  });

export const joinClubEvent = (clubId, eventId) =>
  request(`${base(clubId)}/${eventId}/join`, {
    method: 'POST',
  });

export const leaveClubEvent = (clubId, eventId) =>
  request(`${base(clubId)}/${eventId}/join`, {
    method: 'DELETE',
  });

export const getFeaturedEvents = (limit = 5) =>
  request(`/events/featured?limit=${limit}`);