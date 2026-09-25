const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getEligibilityList, getStudentEligibility, recalculateEligibility, recalculateSingle } = require('../controllers/eligibility.controller');

router.use(protect);
router.get('/', authorize('admin', 'faculty'), getEligibilityList);
router.post('/recalculate', authorize('admin'), recalculateEligibility);
router.post('/recalculate/:studentId', authorize('admin'), recalculateSingle);
router.get('/:studentId', getStudentEligibility);

module.exports = router;
