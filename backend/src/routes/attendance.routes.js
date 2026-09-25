const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  markBulkAttendance,
  getSessionAttendance,
  getStudentAttendance,
  getAttendanceSummary,
  updateAttendance,
  getAttendance,
} = require('../controllers/attendance.controller');

router.use(protect);

// ─── READ endpoints ───────────────────────────────────────────────────────────
// Admin and ALL faculty may VIEW attendance (the controller enforces session-level scope)
router.get('/',                   authorize('admin', 'faculty'), getAttendance);
router.get('/session/:sessionId', authorize('admin', 'faculty'), getSessionAttendance);

// Students can only access their own records (controller self-enforces)
router.get('/student/:studentId', getStudentAttendance);
router.get('/summary/:studentId', getAttendanceSummary);

// ─── WRITE endpoints ──────────────────────────────────────────────────────────
// POST /bulk — admin always allowed; faculty allowed only if they are the session's
//              assigned faculty AND the session is currently ongoing.
//              All other cases → 403.  Logic is enforced inside the controller
//              (not just here) because we need to inspect the session document.
router.post('/bulk', authorize('admin', 'faculty'), markBulkAttendance);

// PUT /:id  — Admin-only correction for completed sessions.
//             Assigned faculty cannot edit after a session is completed.
router.put('/:id', authorize('admin'), updateAttendance);

module.exports = router;
