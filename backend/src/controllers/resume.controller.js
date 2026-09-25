const Resume = require('../models/Resume');
const Student = require('../models/Student');
const { getFileUrl } = require('../middleware/upload');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { sendSuccess, sendCreated, sendNotFound, sendBadRequest } = require('../utils/apiResponse');

// GET /api/resumes — all resumes (admin/faculty) with optional search & status filter
const getAllResumes = async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (req.query.status) filter.reviewStatus = req.query.status;

  const [resumes, total] = await Promise.all([
    Resume.find(filter)
      .populate({ path: 'student', populate: { path: 'userId', select: 'name email' } })
      .populate('uploadedBy', 'name')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Resume.countDocuments(filter),
  ]);

  // Apply name search in-memory (avoids complex $lookup)
  let result = resumes;
  if (req.query.search) {
    const q = req.query.search.toLowerCase();
    result = resumes.filter(r =>
      r.student?.userId?.name?.toLowerCase().includes(q)
    );
  }

  return sendSuccess(res, result, 'Resumes fetched', 200, buildPaginationMeta(total, page, limit));
};

// POST /api/resumes/upload
const uploadResume = async (req, res) => {
  if (!req.file) return sendBadRequest(res, 'No file uploaded');

  const studentId = req.body.studentId || req.query.studentId;
  if (!studentId) return sendBadRequest(res, 'studentId is required');

  const student = await Student.findById(studentId);
  if (!student) return sendNotFound(res, 'Student not found');

  if (req.user.role === 'student') {
    const myStudent = await Student.findOne({ userId: req.user._id });
    if (!myStudent || myStudent._id.toString() !== studentId) {
      return sendNotFound(res, 'Student not found');
    }
  }

  await Resume.updateMany({ student: studentId, isLatest: true }, { isLatest: false });

  const count = await Resume.countDocuments({ student: studentId });
  const fileUrl = getFileUrl(req.file.filename, 'resumes');

  const resume = await Resume.create({
    student: studentId,
    uploadedBy: req.user._id,
    fileName: req.file.originalname,
    fileUrl,
    cloudinaryId: req.file.filename,
    fileSize: req.file.size,
    mimeType: req.file.mimetype,
    version: count + 1,
    isLatest: true,
  });

  return sendCreated(res, resume, 'Resume uploaded successfully');
};

// GET /api/resumes/:studentId — resumes for one student
const getStudentResumes = async (req, res) => {
  if (req.user.role === 'student') {
    const myStudent = await Student.findOne({ userId: req.user._id });
    if (!myStudent || myStudent._id.toString() !== req.params.studentId) {
      return sendNotFound(res, 'Resumes not found');
    }
  }

  const resumes = await Resume.find({ student: req.params.studentId })
    .populate('uploadedBy', 'name')
    .populate('reviewedBy', 'name')
    .sort({ createdAt: -1 });

  return sendSuccess(res, resumes, 'Resumes fetched');
};

// PUT /api/resumes/:id/review
const reviewResume = async (req, res) => {
  const { reviewStatus, reviewNotes } = req.body;
  const valid = ['reviewed', 'approved', 'rejected'];
  if (!valid.includes(reviewStatus)) return sendBadRequest(res, 'Invalid review status');

  const resume = await Resume.findByIdAndUpdate(
    req.params.id,
    { reviewStatus, reviewNotes, reviewedBy: req.user._id, reviewedAt: new Date() },
    { new: true }
  ).populate('reviewedBy', 'name');

  if (!resume) return sendNotFound(res, 'Resume not found');
  return sendSuccess(res, resume, 'Resume reviewed');
};

// DELETE /api/resumes/:id
const deleteResume = async (req, res) => {
  const resume = await Resume.findById(req.params.id);
  if (!resume) return sendNotFound(res, 'Resume not found');
  await resume.deleteOne();
  return sendSuccess(res, null, 'Resume deleted');
};

module.exports = { getAllResumes, uploadResume, getStudentResumes, reviewResume, deleteResume };
