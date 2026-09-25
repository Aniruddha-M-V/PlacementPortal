import api from './axios';

export const studentsApi = {
  getAll: (params) => api.get('/students', { params }),
  getById: (id) => api.get(`/students/${id}`),
  create: (data) => api.post('/students', data),
  update: (id, data) => api.put(`/students/${id}`, data),       // backend: PUT /:id
  archive: (id) => api.put(`/students/${id}/archive`),          // backend: PUT /:id/archive
  restore: (id) => api.put(`/students/${id}/unarchive`),        // backend: PUT /:id/unarchive
  delete: (id) => api.delete(`/students/${id}`),
  importExcel: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/students/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getSummary: (id) => api.get(`/students/${id}/summary`),
  downloadTemplate: () => api.get('/students/import/template', { responseType: 'blob' }),
};
