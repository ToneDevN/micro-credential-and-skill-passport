import api from './api';

/**
 * Fetch paginated notifications for current user
 * @param {object} params { page, limit, unread }
 */
export const getNotifications = async (params = {}) => {
  const response = await api.get('/notifications', { params });
  return response.data;
};

/**
 * Fetch unread notifications count
 */
export const getUnreadCount = async () => {
  const response = await api.get('/notifications/unread-count');
  return response.data;
};

/**
 * Mark a single notification as read
 * @param {string} id
 */
export const markAsRead = async (id) => {
  const response = await api.put(`/notifications/${id}/read`);
  return response.data;
};

/**
 * Mark all unread notifications as read
 */
export const markAllAsRead = async () => {
  const response = await api.put('/notifications/read-all');
  return response.data;
};
