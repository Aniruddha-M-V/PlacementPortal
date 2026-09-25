import api from './axios';

export const eligibilityApi = {
  getAll: (params) => api.get('/eligibility', { params }),
  getById: (studentId) => api.get(`/eligibility/${studentId}`),
  recalculate: () => api.post('/eligibility/recalculate'),
  recalculateSingle: (studentId) => api.post(`/eligibility/recalculate/${studentId}`),
};
