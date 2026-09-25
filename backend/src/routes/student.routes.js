const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createStudentValidator, updateStudentValidator } = require('../validators/student.validator');
const { uploadExcel } = require('../middleware/upload');
const {
  getStudents, createStudent, getStudentById, updateStudent, deleteStudent,
  archiveStudent, unarchiveStudent, importStudents, getImportTemplate, getStudentSummary, getMyProfile, getStudentFilters,
} = require('../controllers/student.controller');

router.use(protect);

// All-role endpoints
router.get('/me', getMyProfile); // student's own profile
router.get('/filters', authorize('admin', 'faculty'), getStudentFilters);

router.route('/')
  .get(authorize('admin', 'faculty'), getStudents)
  .post(authorize('admin'), createStudentValidator, validate, createStudent);

router.post('/import', authorize('admin'), uploadExcel.single('file'), importStudents);
router.get('/import/template', authorize('admin'), getImportTemplate);

// Must be before /:id to avoid /:id catching 'summary'
router.get('/:id/summary', getStudentSummary);

router.route('/:id')
  .get(getStudentById)
  .put(authorize('admin'), updateStudentValidator, validate, updateStudent)
  .delete(authorize('admin'), deleteStudent);

router.put('/:id/archive', authorize('admin'), archiveStudent);
router.put('/:id/unarchive', authorize('admin'), unarchiveStudent);

module.exports = router;
