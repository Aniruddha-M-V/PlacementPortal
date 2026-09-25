const Student = require('../models/Student');
const User = require('../models/User');
const Assessment = require('../models/Assessment');
const Attendance = require('../models/Attendance');
const Resume = require('../models/Resume');
const Activity = require('../models/Activity');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { sendSuccess, sendCreated, sendNotFound, sendBadRequest } = require('../utils/apiResponse');
const importService = require('../services/import.service');

// GET /api/students
const getStudents = async (req, res) => {
  const { page, limit, skip, sort } = getPagination(req.query);

  const filter = { isArchived: false };
  if (req.query.batch) filter.batch = req.query.batch;
  if (req.query.department) filter.department = req.query.department;
  if (req.query.semester) filter.semester = Number(req.query.semester);
  if (req.query.section) filter.section = req.query.section.toUpperCase();
  if (req.query.placementStatus) filter.placementStatus = req.query.placementStatus;
  if (req.query.isEligible !== undefined) filter.isPlacementEligible = req.query.isEligible === 'true';
  if (req.query.archived === 'true') filter.isArchived = true;

  // Search: case-insensitive regex on name, rollNumber, email
  if (req.query.search) {
    const re = new RegExp(req.query.search.trim(), 'i');
    filter.$or = [
      { name: re },
      { rollNumber: re },
      { email: re },
    ];
  }

  const [students, total] = await Promise.all([
    Student.find(filter).sort(sort).skip(skip).limit(limit),
    Student.countDocuments(filter),
  ]);

  return sendSuccess(res, students, 'Students fetched', 200, buildPaginationMeta(total, page, limit));
};

// POST /api/students
const createStudent = async (req, res) => {
  const { name, email, password, rollNumber, batch, department, semester, section, cgpa, backlogs, phone, gender } = req.body;

  // Create User account — password is bcrypt-hashed by the User pre-save hook.
  // The route is already protected by authorize('admin') so only admins reach here.
  const user = await User.create({ name, email, password, role: 'student', phone });

  const student = await Student.create({
    userId: user._id, name, email, rollNumber, batch, department, semester, section, cgpa, backlogs, phone, gender
  });

  return sendCreated(res, student, 'Student created successfully');
};


// GET /api/students/:id
const getStudentById = async (req, res) => {
  // Students can only view their own record
  if (req.user.role === 'student') {
    const student = await Student.findOne({ userId: req.user._id });
    if (!student || student._id.toString() !== req.params.id) {
      return sendNotFound(res, 'Student not found');
    }
    return sendSuccess(res, student);
  }

  const student = await Student.findById(req.params.id);
  if (!student) return sendNotFound(res, 'Student not found');
  return sendSuccess(res, student);
};

// PUT /api/students/:id
const updateStudent = async (req, res) => {
  const student = await Student.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!student) return sendNotFound(res, 'Student not found');
  return sendSuccess(res, student, 'Student updated');
};

// DELETE /api/students/:id  (admin only — permanent, cascades related records)
const deleteStudent = async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) return sendNotFound(res, 'Student not found');

  const sid = student._id;

  // Cascade: remove all related records before deleting the student
  await Promise.all([
    // 1. Attendance records for this student
    Attendance.deleteMany({ student: sid }),
    // 2. Assessment records for this student
    Assessment.deleteMany({ student: sid }),
    // 3. Resume records for this student
    Resume.deleteMany({ student: sid }),
    // 4. Remove student from Activity participant arrays (do NOT delete the activity)
    Activity.updateMany(
      { 'participants.student': sid },
      { $pull: { participants: { student: sid } } }
    ),
  ]);

  // 5. Delete the linked User account (login credentials)
  if (student.userId) await User.findByIdAndDelete(student.userId);

  // 6. Finally delete the Student document itself
  await student.deleteOne();

  return sendSuccess(res, null, 'Student deleted successfully');
};

// PUT /api/students/:id/archive
const archiveStudent = async (req, res) => {
  const student = await Student.findByIdAndUpdate(
    req.params.id,
    { isArchived: true, archivedAt: new Date() },
    { new: true }
  );
  if (!student) return sendNotFound(res, 'Student not found');
  return sendSuccess(res, student, 'Student archived');
};

// PUT /api/students/:id/unarchive
const unarchiveStudent = async (req, res) => {
  const student = await Student.findByIdAndUpdate(
    req.params.id,
    { isArchived: false, archivedAt: null },
    { new: true }
  );
  if (!student) return sendNotFound(res, 'Student not found');
  return sendSuccess(res, student, 'Student restored');
};

// POST /api/students/import
const importStudents = async (req, res) => {
  if (!req.file) return sendBadRequest(res, 'No file uploaded');
  const result = await importService.importStudentsFromExcel(req.file.path);
  return sendSuccess(res, result, `Import complete: ${result.created} created, ${result.skipped} skipped`);
};

// GET /api/students/import/template — download xlsx template
const getImportTemplate = (req, res) => {
  const buffer = importService.generateImportTemplate();
  res.setHeader('Content-Disposition', 'attachment; filename="students_import_template.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
};

// GET /api/students/:id/summary
const getStudentSummary = async (req, res) => {
  const student = await Student.findById(req.params.id).populate('userId', 'name email lastLogin');
  if (!student) return sendNotFound(res, 'Student not found');

  // Attendance
  const attendanceRecords = await Attendance.find({ student: req.params.id });
  const totalSessions = attendanceRecords.length;
  const presentCount = attendanceRecords.filter(a => a.status === 'present' || a.status === 'late').length;
  const attendancePercent = totalSessions > 0
    ? parseFloat(((presentCount / totalSessions) * 100).toFixed(1))
    : null;

  // Assessments
  const assessments = await Assessment.find({ student: req.params.id })
    .sort({ date: -1 })
    .limit(20);

  const avgByCategory = (cat) => {
    const relevant = assessments.filter(a => a.category === cat && a.percentage != null);
    if (!relevant.length) return null;
    return parseFloat((relevant.reduce((s, a) => s + a.percentage, 0) / relevant.length).toFixed(1));
  };

  // Resume
  const resume = await Resume.findOne({ student: req.params.id, isLatest: true });

  return sendSuccess(res, {
    student,
    attendancePercent,
    totalSessions,
    presentCount,
    aptitudeAvg:      avgByCategory('aptitude'),
    technicalAvg:     avgByCategory('technical'),
    codingAvg:        avgByCategory('coding'),
    softSkillsAvg:    avgByCategory('soft_skills'),
    mockInterviewAvg: avgByCategory('mock_interview'),
    assessments,
    resumeStatus: resume ? resume.reviewStatus : 'none',
    isEligible: student.isPlacementEligible,
    placementStatus: student.placementStatus,
  }, 'Summary fetched');
};

// GET /api/students/me — for student role (own profile)
const getMyProfile = async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id });
  if (!student) return sendNotFound(res, 'Student profile not found');
  return sendSuccess(res, student, 'Profile fetched');
};

// GET /api/students/filters — unique batches, departments, sections for filter dropdowns
const getStudentFilters = async (req, res) => {
  const [batches, departments, sections] = await Promise.all([
    Student.distinct('batch', { isArchived: false }),
    Student.distinct('department', { isArchived: false }),
    Student.distinct('section', { isArchived: false }),
  ]);
  return sendSuccess(res, { batches, departments, sections });
};

module.exports = {
  getStudents,
  createStudent,
  getStudentById,
  updateStudent,
  deleteStudent,
  archiveStudent,
  unarchiveStudent,
  importStudents,
  getImportTemplate,
  getStudentSummary,
  getMyProfile,
  getStudentFilters,
};
