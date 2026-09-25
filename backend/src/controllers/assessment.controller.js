const Assessment = require('../models/Assessment');
const Student = require('../models/Student');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { sendSuccess, sendCreated, sendNotFound } = require('../utils/apiResponse');

// GET /api/assessments
const getAssessments = async (req, res) => {
  const { page, limit, skip, sort } = getPagination(req.query);
  const filter = {};
  if (req.query.category) filter.category = req.query.category;
  if (req.query.session) filter.session = req.query.session;
  if (req.query.student) filter.student = req.query.student;

  const [assessments, total] = await Promise.all([
    Assessment.find(filter)
      .populate('student', 'name rollNumber batch department')
      .populate('evaluatedBy', 'name')
      .populate('session', 'title')
      .sort(sort).skip(skip).limit(limit),
    Assessment.countDocuments(filter),
  ]);

  return sendSuccess(res, assessments, 'Assessments fetched', 200, buildPaginationMeta(total, page, limit));
};

// POST /api/assessments
const createAssessment = async (req, res) => {
  const assessment = await Assessment.create({ ...req.body, evaluatedBy: req.user._id });
  return sendCreated(res, assessment, 'Assessment recorded');
};

// GET /api/assessments/:id
const getAssessmentById = async (req, res) => {
  const assessment = await Assessment.findById(req.params.id)
    .populate('student', 'name rollNumber')
    .populate('evaluatedBy', 'name')
    .populate('session', 'title');
  if (!assessment) return sendNotFound(res, 'Assessment not found');
  return sendSuccess(res, assessment);
};

// PUT /api/assessments/:id
const updateAssessment = async (req, res) => {
  const assessment = await Assessment.findById(req.params.id);
  if (!assessment) return sendNotFound(res, 'Assessment not found');
  Object.assign(assessment, req.body);
  await assessment.save(); // triggers pre-save percentage calc
  return sendSuccess(res, assessment, 'Assessment updated');
};

// DELETE /api/assessments/:id
const deleteAssessment = async (req, res) => {
  const assessment = await Assessment.findById(req.params.id);
  if (!assessment) return sendNotFound(res, 'Assessment not found');
  await assessment.deleteOne();
  return sendSuccess(res, null, 'Assessment deleted');
};

// GET /api/assessments/student/:studentId
const getStudentAssessments = async (req, res) => {
  if (req.user.role === 'student') {
    const student = await Student.findOne({ userId: req.user._id });
    if (!student || student._id.toString() !== req.params.studentId) {
      return sendNotFound(res, 'Assessments not found');
    }
  }

  const assessments = await Assessment.find({ student: req.params.studentId })
    .populate('session', 'title')
    .populate('evaluatedBy', 'name')
    .sort({ date: -1 });

  // Group by category for summary
  const summary = {};
  assessments.forEach((a) => {
    if (!summary[a.category]) summary[a.category] = { count: 0, totalPct: 0, best: 0 };
    summary[a.category].count += 1;
    summary[a.category].totalPct += a.percentage || 0;
    summary[a.category].best = Math.max(summary[a.category].best, a.percentage || 0);
  });

  const categorySummary = Object.entries(summary).map(([cat, data]) => ({
    category: cat,
    count: data.count,
    average: parseFloat((data.totalPct / data.count).toFixed(2)),
    best: data.best,
  }));

  return sendSuccess(res, { assessments, categorySummary });
};

module.exports = {
  getAssessments, createAssessment, getAssessmentById,
  updateAssessment, deleteAssessment, getStudentAssessments,
};
