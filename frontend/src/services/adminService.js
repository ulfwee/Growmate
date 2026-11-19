import { apiCall } from './api';

const buildQuery = (params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });

  const result = query.toString();
  return result ? `?${result}` : '';
};

export const getAdminUsers = (params = {}) =>
  apiCall(`/admin/users${buildQuery(params)}`);

export const getAdminUser = id =>
  apiCall(`/admin/users/${id}`);

export const deleteAdminUser = id =>
  apiCall(`/admin/users/${id}`, {
    method: 'DELETE',
  });

export const getAdminClubs = (params = {}) =>
  apiCall(`/admin/clubs${buildQuery(params)}`);

export const deleteAdminClub = id =>
  apiCall(`/admin/clubs/${id}`, {
    method: 'DELETE',
  });

export const getAdminClubMembers = clubId =>
  apiCall(`/admin/clubs/${clubId}/members`);

export const transferAdminClubOwnership = (clubId, newOwnerId) =>
  apiCall(`/admin/clubs/${clubId}/transfer-ownership`, {
    method: 'PATCH',
    body: JSON.stringify({ newOwnerId }),
  });

export const getAdminPosts = (params = {}) =>
  apiCall(`/admin/posts${buildQuery(params)}`);

export const deleteAdminPost = id =>
  apiCall(`/admin/posts/${id}`, {
    method: 'DELETE',
  });

export const getAdminAnnouncements = (params = {}) =>
  apiCall(`/admin/announcements${buildQuery(params)}`);

export const deleteAdminAnnouncement = id =>
  apiCall(`/admin/announcements/${id}`, {
    method: 'DELETE',
  });
