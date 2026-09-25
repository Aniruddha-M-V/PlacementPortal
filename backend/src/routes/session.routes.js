const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createSessionValidator, updateSessionValidator } = require('../validators/session.validator');
const {
  getSessions, createSession, getSessionById,
  updateSession, deleteSession, getUpcomingSessions,
  getMySessions,
} = require('../controllers/session.controller');

router.use(protect);
router.get('/upcoming', getUpcomingSessions);

// GET /sessions/my — faculty sees only sessions assigned to them
router.get('/my', authorize('admin', 'faculty'), getMySessions);

router.route('/')
  .get(getSessions)
  .post(authorize('admin'), createSessionValidator, validate, createSession);

router.route('/:id')
  .get(getSessionById)
  // PUT is admin-only — faculty cannot edit sessions via API
  .put(authorize('admin'), updateSessionValidator, validate, updateSession)
  .delete(authorize('admin'), deleteSession);

module.exports = router;
