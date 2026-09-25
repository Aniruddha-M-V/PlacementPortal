import api from './axios';

export const notificationsApi = {
  getAll: (params) => api.get('/notifications', { params }),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/mark-all-read'),
  broadcast: (data) => api.post('/notifications', data),
  getUnreadCount: () => api.get('/notifications/unread-count'),
};
