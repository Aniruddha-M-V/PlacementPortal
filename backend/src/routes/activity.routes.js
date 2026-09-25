const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getActivities, createActivity, getActivityById, updateActivity, deleteActivity, addParticipants, markActivityAttendance } = require('../controllers/activity.controller');

router.use(protect);
router.route('/').get(getActivities).post(authorize('admin'), createActivity);
router.route('/:id').get(getActivityById).put(authorize('admin'), updateActivity).delete(authorize('admin'), deleteActivity);
router.post('/:id/participants', authorize('admin', 'faculty'), addParticipants);
router.put('/:id/attendance', authorize('admin', 'faculty'), markActivityAttendance);

module.exports = router;
