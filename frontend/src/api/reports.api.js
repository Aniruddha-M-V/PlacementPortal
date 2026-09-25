import api from './axios';

export const reportsApi = {
  getAttendance: (params) => api.get('/reports/attendance', { params }),
  getAssessments: (params) => api.get('/reports/assessments', { params }),
  getEligibility: (params) => api.get('/reports/eligibility', { params }),
  exportExcel: (params) =>
    api.get('/reports/export/excel', {
      params,
      responseType: 'blob',
    }),
  exportPdf: (params) =>
    api.get('/reports/export/pdf', {
      params,
      responseType: 'blob',
    }),
};
