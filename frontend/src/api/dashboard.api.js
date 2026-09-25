import api from './axios';

export const dashboardApi = {
  getStats:             () => api.get('/dashboard/stats'),
  getCharts:            () => api.get('/dashboard/charts'),
  getActivityFeed:      () => api.get('/dashboard/recent'),
  getFacultyDashboard:  () => api.get('/dashboard/faculty'),
};
