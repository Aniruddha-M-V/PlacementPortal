import api from './axios';

export const academicConfigApi = {
  /** Get all departments or batches. Pass { type: 'department'|'batch', activeOnly: 'true' } */
  getAll: (params) => api.get('/academic-config', { params }),
  create: (data) => api.post('/academic-config', data),
  update: (id, data) => api.put(`/academic-config/${id}`, data),
  toggle: (id) => api.patch(`/academic-config/${id}/toggle`),
  remove: (id) => api.delete(`/academic-config/${id}`),
};

/** Convenience helpers */
export const getDepartments = (activeOnly = true) =>
  academicConfigApi.getAll({ type: 'department', activeOnly: String(activeOnly) });

export const getBatches = (activeOnly = true) =>
  academicConfigApi.getAll({ type: 'batch', activeOnly: String(activeOnly) });
