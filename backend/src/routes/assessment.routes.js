const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createAssessmentValidator, updateAssessmentValidator } = require('../validators/assessment.validator');
const { getAssessments, createAssessment, getAssessmentById, updateAssessment, deleteAssessment, getStudentAssessments } = require('../controllers/assessment.controller');

router.use(protect);
router.get('/student/:studentId', getStudentAssessments);
router.route('/')
  .get(authorize('admin', 'faculty'), getAssessments)
  .post(authorize('admin', 'faculty'), createAssessmentValidator, validate, createAssessment);
router.route('/:id')
  .get(getAssessmentById)
  .put(authorize('admin', 'faculty'), updateAssessmentValidator, validate, updateAssessment)
  .delete(authorize('admin'), deleteAssessment);

module.exports = router;
