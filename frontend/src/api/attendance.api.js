import api from './axios';

export const attendanceApi = {
  getAll: (params) => api.get('/attendance', { params }),
  /**
   * POST /attendance/bulk — mark attendance for a session.
   * Payload: { sessionId, date, records: [{ studentId, status, remarks? }] }
   */
  bulkMark: (sessionId, date, records) =>
    api.post('/attendance/bulk', { sessionId, date, records }),
  update: (id, data) => api.patch(`/attendance/${id}`, data),
  getStudentSummary: (studentId, params) =>
    api.get(`/attendance/student/${studentId}`, { params }),
  /** GET /attendance/session/:sessionId — returns array of records (admin/faculty only) */
  getSessionReport: (sessionId) =>
    api.get(`/attendance/session/${sessionId}`),
};
