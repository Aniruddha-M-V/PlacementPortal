const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  exportExcel, exportPdf,
  exportStudentsExcel, exportAttendanceExcel, exportAssessmentsExcel,
  exportEligibilityExcel, exportStudentsPDF, getReportSummary,
} = require('../controllers/report.controller');

router.use(protect, authorize('admin', 'faculty'));

// ── Unified export endpoints (used by ReportsPage) ──────────────────────────
// GET /api/reports/export/excel?type=attendance|assessments|eligibility|workshops
router.get('/export/excel', exportExcel);
// GET /api/reports/export/pdf?type=attendance|assessments|eligibility|workshops
router.get('/export/pdf', exportPdf);

// ── Legacy per-type routes (preserved for backwards compatibility) ───────────
router.get('/summary', getReportSummary);
router.get('/students/excel', exportStudentsExcel);
router.get('/students/pdf', exportStudentsPDF);
router.get('/attendance/excel', exportAttendanceExcel);
router.get('/assessments/excel', exportAssessmentsExcel);
router.get('/eligibility/excel', exportEligibilityExcel);

module.exports = router;
