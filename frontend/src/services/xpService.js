import { apiCall } from './api';

export const getXpStats = () => {
  return apiCall('/xp/stats');
};

export const getXpHistory = (page = 1, pageSize = 20) => {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  return apiCall(`/xp/history?${params.toString()}`);
};