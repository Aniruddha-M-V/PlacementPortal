const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getDashboardStats, getDashboardCharts, getRecentActivity,
  getStudentDashboard, getFacultyDashboard,
} = require('../controllers/dashboard.controller');

router.use(protect);
router.get('/stats',   authorize('admin', 'faculty'), getDashboardStats);
router.get('/charts',  authorize('admin', 'faculty'), getDashboardCharts);
router.get('/recent',  getRecentActivity);
router.get('/student', authorize('student'), getStudentDashboard);
router.get('/faculty', authorize('faculty'), getFacultyDashboard);

module.exports = router;
