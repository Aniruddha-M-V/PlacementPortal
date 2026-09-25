const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { uploadResume: uploadMiddleware } = require('../middleware/upload');
const {
  getAllResumes,
  uploadResume,
  getStudentResumes,
  reviewResume,
  deleteResume,
} = require('../controllers/resume.controller');

router.use(protect);

// GET /api/resumes — all resumes (admin/faculty)
router.get('/', authorize('admin', 'faculty'), getAllResumes);

// POST /api/resumes/upload — upload a resume file
router.post('/upload', uploadMiddleware.single('resume'), uploadResume);

// GET /api/resumes/:studentId — resumes for a specific student
router.get('/:studentId', getStudentResumes);

// PUT /api/resumes/:id/review — review a resume
router.put('/:id/review', authorize('admin', 'faculty'), reviewResume);

// DELETE /api/resumes/:id — delete a resume
router.delete('/:id', authorize('admin'), deleteResume);

module.exports = router;
