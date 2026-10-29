import { request } from './apiClient';

export async function getNotifications(unreadOnly = false) {
  const q = unreadOnly ? '?unread=true' : '';
  return await request(`/notifications${q}`, {}, { unread_count: 0, notifications: [] });
}

export async function markNotificationRead(id) {
  return await request(`/notifications/${id}/read`, { method: 'PATCH' });
}

export async function markAllNotificationsRead() {
  return await request('/notifications/mark-all-read', { method: 'POST' });
}

export default {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};

