import { apiCall } from './api';

export const getNotifications = (page = 1, pageSize = 20) =>
  apiCall(`/notifications?page=${page}&pageSize=${pageSize}`);

export const getUnreadNotificationsCount = () =>
  apiCall('/notifications/unread-count');

export const markNotificationAsRead = id =>
  apiCall(`/notifications/${id}/read`, {
    method: 'PATCH',
  });

export const markAllNotificationsAsRead = () =>
  apiCall('/notifications/read-all', {
    method: 'PATCH',
  });