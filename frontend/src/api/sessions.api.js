import api from './axios';

export const sessionsApi = {
  getAll:    (params) => api.get('/sessions', { params }),
  getMy:     (params) => api.get('/sessions/my', { params }),  // faculty: their sessions only
  getById:   (id) => api.get(`/sessions/${id}`),
  create:    (data) => api.post('/sessions', data),
  update:    (id, data) => api.put(`/sessions/${id}`, data),
  delete:    (id) => api.delete(`/sessions/${id}`),
  getUpcoming: () => api.get('/sessions/upcoming'),
};
