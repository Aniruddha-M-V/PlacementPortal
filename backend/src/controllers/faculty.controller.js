const Faculty = require('../models/Faculty');
const User = require('../models/User');
const AcademicConfig = require('../models/AcademicConfig');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { sendSuccess, sendCreated, sendNotFound, sendBadRequest } = require('../utils/apiResponse');

// GET /api/faculty
const getAllFaculty = async (req, res) => {
  const { page, limit, skip, sort } = getPagination(req.query);
  const filter = {};
  if (req.query.department) filter.department = req.query.department;
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

  // Search: case-insensitive regex across name, email, department, employeeId
  if (req.query.search && req.query.search.trim()) {
    const re = new RegExp(req.query.search.trim(), 'i');
    filter.$or = [
      { name: re },
      { email: re },
      { department: re },
      { employeeId: re },
    ];
  }

  const [faculty, total] = await Promise.all([
    Faculty.find(filter).populate('userId', 'name email avatar lastLogin').sort(sort).skip(skip).limit(limit),
    Faculty.countDocuments(filter),
  ]);

  return sendSuccess(res, faculty, 'Faculty fetched', 200, buildPaginationMeta(total, page, limit));
};

// POST /api/faculty  (also creates a User account)
const createFaculty = async (req, res) => {
  const { name, email, password, phone, department, designation, specialization, employeeId } = req.body;

  // Validate department against centrally managed config (active departments only)
  if (department) {
    const deptExists = await AcademicConfig.findOne({ type: 'department', name: department, isActive: true });
    if (!deptExists) {
      return sendBadRequest(res, `Department "${department}" is not a valid active department. Please choose a configured department.`);
    }
  }

  // Create user account first
  const user = await User.create({ name, email, password: password || 'Faculty@123', role: 'faculty', phone });

  // Create faculty profile
  const faculty = await Faculty.create({
    userId: user._id, name, email, phone, department, designation, specialization, employeeId,
  });

  return sendCreated(res, { faculty, user }, 'Faculty created successfully');
};

// GET /api/faculty/:id
const getFacultyById = async (req, res) => {
  const faculty = await Faculty.findById(req.params.id).populate('userId', 'name email avatar lastLogin isActive');
  if (!faculty) return sendNotFound(res, 'Faculty not found');
  return sendSuccess(res, faculty);
};

// PUT /api/faculty/:id
const updateFaculty = async (req, res) => {
  const { name, email, phone, department, designation, specialization, employeeId, isActive } = req.body;
  const faculty = await Faculty.findByIdAndUpdate(
    req.params.id,
    { name, email, phone, department, designation, specialization, employeeId, isActive },
    { new: true, runValidators: true }
  );
  if (!faculty) return sendNotFound(res, 'Faculty not found');
  return sendSuccess(res, faculty, 'Faculty updated');
};

// DELETE /api/faculty/:id
const deleteFaculty = async (req, res) => {
  const faculty = await Faculty.findById(req.params.id);
  if (!faculty) return sendNotFound(res, 'Faculty not found');
  await User.findByIdAndDelete(faculty.userId);
  await faculty.deleteOne();
  return sendSuccess(res, null, 'Faculty deleted');
};

// GET /api/faculty/departments — for dropdown filters
const getFacultyDepartments = async (req, res) => {
  const departments = await Faculty.distinct('department');
  return sendSuccess(res, departments);
};

module.exports = { getAllFaculty, createFaculty, getFacultyById, updateFaculty, deleteFaculty, getFacultyDepartments };
