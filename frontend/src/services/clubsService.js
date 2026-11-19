export const API_ORIGIN = (
  import.meta.env.VITE_API_URL || 'http://localhost:5200'
)
  .replace(/\/$/, '')
  .replace(/\/api$/, '');

const API = `${API_ORIGIN}/api`;

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const response = await fetch(`${API}${path}`, { ...options, headers });
  const contentType = response.headers.get('content-type') || '';
  let data = null;
  if (contentType.includes('application/json')) {
    try { data = await response.json(); } catch { }
  }
  if (!response.ok) {
    throw new Error(data?.message || (response.status === 403
      ? 'Немає доступу до цього клубу.'
      : `Помилка сервера (${response.status}).`));
  }
  return data;
}

export const getClubs = ({ search = '', categoryId = '' } = {}) => {
  const params = new URLSearchParams();
  if (search.trim()) params.set('search', search.trim());
  if (categoryId) params.set('categoryId', categoryId);
  const qs = params.toString();
  return request(`/clubs${qs ? `?${qs}` : ''}`);
};
export const getRecommendedClubs = () => request('/clubs/recommended');
export const getClubCategories = () => request('/ClubCategories');
export const getClub = (id) => request(`/clubs/${id}`);
export const getClubMembers = (id) => request(`/clubs/${id}/members`);
export const getClubInterests = (id) => request(`/clubs/${id}/interests`);
export const createClub = (payload) => request('/clubs', { method: 'POST', body: JSON.stringify(payload) });
export const updateClub = (id, payload) => request(`/clubs/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
export const deleteClub = (id) => request(`/clubs/${id}`, { method: 'DELETE' });
export const joinClub = (id, message = '') => request(`/clubs/${id}/join`, { method: 'POST', body: JSON.stringify({ message: message.trim() || null }) });
export const leaveClub = (id) => request(`/clubs/${id}/leave`, { method: 'DELETE' });
export const getClubJoinRequests = (id) => request(`/clubs/${id}/join-requests`);
export const reviewClubJoinRequest = (id, requestId, status) => request(`/clubs/${id}/join-requests/${requestId}`, { method: 'PATCH', body: JSON.stringify({ status }) });
export const transferClubOwnership = (id, newOwnerId) => request(`/clubs/${id}/transfer-ownership`, { method: 'POST', body: JSON.stringify({ newOwnerId: Number(newOwnerId) }) });
export const updateClubMemberRole = (clubId, userId, role) => request(`/clubs/${clubId}/members/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
export const removeClubMember = (clubId, userId) => request(`/clubs/${clubId}/members/${userId}`, { method: 'DELETE' });

export async function uploadClubCover(file) {
  const token = localStorage.getItem('token');
  const body = new FormData(); body.append('file', file);
  const response = await fetch(`${API}/club-covers`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || `Не вдалося завантажити файл (${response.status}).`);
  return data;
}

export async function uploadClubImage(clubId, file) {
  const token = localStorage.getItem('token');

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(
    `/api/Clubs/${clubId}/images`,
    {
      method: 'POST',
      headers: {
        ...(token
          ? { Authorization: `Bearer ${token}` }
          : {}),
      },
      body: formData,
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.message || 'Не вдалося завантажити зображення.'
    );
  }

  return data.url;
}