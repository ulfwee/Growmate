import { apiCall } from './api';

const baseUrl = clubId =>
  `/clubs/${clubId}/announcements`;

const withAuth = (method = 'GET', data) => {
  const token = localStorage.getItem('token');

  return {
    method,
    headers: {
      ...(token
        ? { Authorization: `Bearer ${token}` }
        : {}),
    },
    ...(data !== undefined
      ? { body: JSON.stringify(data) }
      : {}),
  };
};

export const getClubAnnouncements = clubId =>
  apiCall(baseUrl(clubId), withAuth());

export const getClubAnnouncement = (clubId, id) =>
  apiCall(
    `${baseUrl(clubId)}/${id}`,
    withAuth()
  );

export const createClubAnnouncement = (clubId, data) =>
  apiCall(
    baseUrl(clubId),
    withAuth('POST', data)
  );

export const updateClubAnnouncement = (clubId, id, data) =>
  apiCall(
    `${baseUrl(clubId)}/${id}`,
    withAuth('PUT', data)
  );

export const deleteClubAnnouncement = (clubId, id) =>
  apiCall(
    `${baseUrl(clubId)}/${id}`,
    withAuth('DELETE')
  );

export const likeClubAnnouncement = (clubId, id) =>
  apiCall(
    `${baseUrl(clubId)}/${id}/like`,
    withAuth('POST')
  );

export const unlikeClubAnnouncement = (clubId, id) =>
  apiCall(
    `${baseUrl(clubId)}/${id}/like`,
    withAuth('DELETE')
  );

export const pinClubAnnouncement = (
  clubId,
  id,
  isPinned
) =>
  apiCall(
    `${baseUrl(clubId)}/${id}/pin`,
    withAuth('PATCH', { isPinned })
  );