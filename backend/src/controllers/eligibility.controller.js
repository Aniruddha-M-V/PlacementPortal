const { calculateEligibility, recalculateAll } = require('../services/eligibility.service');
const Student = require('../models/Student');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { sendSuccess, sendNotFound } = require('../utils/apiResponse');

// GET /api/eligibility
const getEligibilityList = async (req, res) => {
  const { page, limit, skip, sort } = getPagination(req.query);
  const filter = { isArchived: false };
  if (req.query.department) filter.department = req.query.department;
  if (req.query.batch) filter.batch = req.query.batch;

  // ?status=eligible | ineligible
  if (req.query.status === 'eligible') filter.isPlacementEligible = true;
  else if (req.query.status === 'ineligible') filter.isPlacementEligible = false;

  // ?search — name or rollNumber
  if (req.query.search && req.query.search.trim()) {
    const re = new RegExp(req.query.search.trim(), 'i');
    filter.$or = [{ name: re }, { rollNumber: re }];
  }

  const [students, total] = await Promise.all([
    Student.find(filter, 'name rollNumber batch department semester isPlacementEligible eligibilityReasons placementStatus')
      .sort(sort).skip(skip).limit(limit),
    Student.countDocuments(filter),
  ]);

  return sendSuccess(res, students, 'Eligibility list fetched', 200, buildPaginationMeta(total, page, limit));
};

// GET /api/eligibility/:studentId
const getStudentEligibility = async (req, res) => {
  const result = await calculateEligibility(req.params.studentId);
  const student = await Student.findById(req.params.studentId, 'name rollNumber batch department');
  if (!student) return sendNotFound(res, 'Student not found');
  return sendSuccess(res, { student, ...result });
};

// POST /api/eligibility/recalculate — batch recalculate all
const recalculateEligibility = async (req, res) => {
  const result = await recalculateAll();
  return sendSuccess(res, result, `Eligibility recalculated for ${result.total} students`);
};

// POST /api/eligibility/recalculate/:studentId — single student
const recalculateSingle = async (req, res) => {
  const { updateStudentEligibility } = require('../services/eligibility.service');
  const result = await updateStudentEligibility(req.params.studentId);
  return sendSuccess(res, result, 'Eligibility recalculated');
};

module.exports = { getEligibilityList, getStudentEligibility, recalculateEligibility, recalculateSingle };
