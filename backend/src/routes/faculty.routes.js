const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getAllFaculty, createFaculty, getFacultyById, updateFaculty, deleteFaculty, getFacultyDepartments } = require('../controllers/faculty.controller');

router.use(protect);
router.get('/departments', getFacultyDepartments);
router.route('/').get(authorize('admin'), getAllFaculty).post(authorize('admin'), createFaculty);
router.route('/:id').get(authorize('admin', 'faculty'), getFacultyById).put(authorize('admin'), updateFaculty).delete(authorize('admin'), deleteFaculty);

module.exports = router;
