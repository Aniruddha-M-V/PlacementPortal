import api from './axios';

export const resumeApi = {
  getByStudent: (studentId) => api.get(`/resumes/student/${studentId}`),
  upload: (studentId, file) => {
    const form = new FormData();
    form.append('resume', file);
    form.append('studentId', studentId);
    return api.post('/resumes/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  review: (id, data) => api.patch(`/resumes/${id}/review`, data),
  getAll: (params) => api.get('/resumes', { params }),
};
