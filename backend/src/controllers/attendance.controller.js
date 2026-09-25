/**
 * attendance.controller.js
 *
 * Authorization model:
 *
 *  POST /bulk  (markBulkAttendance)
 *    Admin:            allowed for any non-cancelled session (any live status).
 *    Assigned Faculty: allowed ONLY when session is ONGOING AND they are the
 *                      Faculty document linked to session.faculty.
 *    Other Faculty:    403 Forbidden.
 *    Student:          blocked at route level (not an authorised role).
 *
 *  PUT /:id   (updateAttendance)
 *    Admin only:       correction for any record (route-level authorize).
 *
 *  GET routes: admin + all faculty (read-only); students: self-only.
 */

const Attendance      = require('../models/Attendance');
const Student         = require('../models/Student');
const Faculty         = require('../models/Faculty');
const TrainingSession = require('../models/TrainingSession');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const {
  sendSuccess,
  sendNotFound,
  sendBadRequest,
  sendForbidden,
} = require('../utils/apiResponse');
const { calcLiveStatus } = require('../services/notification.service');

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Compute live status from a session document. */
function sessionLiveStatus(session) {
  return calcLiveStatus(
    session.startDate, session.startTime,
    session.endDate,   session.endTime,
    session.status,
  );
}

/**
 * Resolve the Faculty document for the currently logged-in faculty user.
 * Returns null if not found (e.g. user has role faculty but no Faculty profile yet).
 */
async function resolveFacultyDoc(userId) {
  return Faculty.findOne({ userId }).lean();
}

/**
 * Determine whether a faculty user is the assigned faculty for a session.
 *
 * The TrainingSession stores `faculty` as an ObjectId ref to the Faculty collection.
 * The logged-in user is a User doc. We join via Faculty.userId.
 *
 * Returns:
 *   { isAssigned: true,  facultyDoc }  — caller is the assigned faculty
 *   { isAssigned: false, facultyDoc }  — caller is a faculty but NOT assigned
 *   { isAssigned: false, facultyDoc: null } — no Faculty profile found
 */
async function checkFacultyAssignment(userId, session) {
  // If this session has no faculty assigned, no faculty can mark it
  if (!session.faculty) return { isAssigned: false, facultyDoc: null };

  const facultyDoc = await resolveFacultyDoc(userId);
  if (!facultyDoc) return { isAssigned: false, facultyDoc: null };

  const isAssigned = String(session.faculty) === String(facultyDoc._id);
  return { isAssigned, facultyDoc };
}

// ─── POST /api/attendance/bulk ────────────────────────────────────────────────
/**
 * Mark (or correct) bulk attendance for a training session.
 *
 * Authorization matrix:
 *
 *   Role     | Status    | Permission
 *   ---------|-----------|------------------------------------------
 *   admin    | upcoming  | allowed (pre-mark)
 *   admin    | ongoing   | allowed
 *   admin    | completed | allowed (correction)
 *   admin    | cancelled | DENIED — 403
 *   faculty* | upcoming  | DENIED — session not started yet
 *   faculty* | ongoing   | allowed
 *   faculty* | completed | DENIED — session ended, admin-only correction
 *   faculty* | cancelled | DENIED
 *   faculty† | any       | DENIED — not assigned to this session
 *
 *  * assigned faculty (session.faculty === this faculty's Faculty._id)
 *  † other faculty
 */
const markBulkAttendance = async (req, res) => {
  const { sessionId, date, records } = req.body;

  if (!sessionId)                                      return sendBadRequest(res, 'sessionId is required');
  if (!Array.isArray(records) || records.length === 0) return sendBadRequest(res, 'records array is required');

  // Fetch session — needed for status check and faculty assignment check
  const session = await TrainingSession.findById(sessionId).lean();
  if (!session) return sendNotFound(res, 'Training session not found');

  const live = sessionLiveStatus(session);

  // ── role-based authorization ──────────────────────────────────────────────
  if (req.user.role === 'admin') {
    // Admin: only cancelled sessions are off-limits
    if (live === 'cancelled') {
      return sendForbidden(res, 'Attendance cannot be marked for a cancelled session.');
    }
    // Admin is allowed for upcoming / ongoing / completed (correction)

  } else if (req.user.role === 'faculty') {
    // Step 1: Cancelled — no one but nobody
    if (live === 'cancelled') {
      return sendForbidden(res, 'Attendance cannot be marked for a cancelled session.');
    }

    // Step 2: Check faculty assignment
    const { isAssigned } = await checkFacultyAssignment(req.user._id, session);

    if (!isAssigned) {
      return sendForbidden(
        res,
        'Access denied. You are not the assigned faculty for this session.',
      );
    }

    // Step 3: Assigned faculty can only mark while the session is ONGOING
    if (live === 'upcoming') {
      return sendForbidden(
        res,
        'Attendance marking is not yet allowed. The session has not started.',
      );
    }
    if (live === 'completed') {
      return sendForbidden(
        res,
        'This session has ended. Only an Admin can correct attendance for completed sessions.',
      );
    }
    // live === 'ongoing' → allowed ✓

  } else {
    // Student or any other role that somehow bypassed the route authorize()
    return sendForbidden(res, 'Access denied.');
  }

  // ── build attendance date ─────────────────────────────────────────────────
  let attendanceDate;
  if (date) {
    attendanceDate = new Date(date);
  } else if (session.startDate) {
    const dp = (session.startDate instanceof Date)
      ? session.startDate.toISOString().split('T')[0]
      : String(session.startDate).split('T')[0];
    attendanceDate = new Date(dp);
  } else {
    attendanceDate = new Date();
  }

  // ── upsert records (prevents duplicates, allows correction) ───────────────
  const ops = records.map((r) => ({
    updateOne: {
      filter: { session: sessionId, student: r.studentId, date: attendanceDate },
      update: {
        $set: {
          status:   r.status,
          remarks:  r.remarks || '',
          markedBy: req.user._id,
        },
      },
      upsert: true,
    },
  }));

  await Attendance.bulkWrite(ops);

  const action = live === 'completed' ? 'corrected' : 'marked';
  return sendSuccess(res, null, `Attendance ${action} for ${records.length} student(s)`);
};

// ─── GET /api/attendance/session/:sessionId ───────────────────────────────────
/**
 * Get all attendance records for a session.
 * Returns the live session status so the frontend can render the correct lock state.
 * Also returns whether the calling faculty is the assigned faculty.
 */
const getSessionAttendance = async (req, res) => {
  const { date } = req.query;
  const filter = { session: req.params.sessionId };
  if (date) {
    const d = new Date(date);
    filter.date = { $gte: d, $lt: new Date(new Date(date).setDate(d.getDate() + 1)) };
  }

  const [records, session] = await Promise.all([
    Attendance.find(filter)
      .populate('student', 'name rollNumber section department')
      .populate('markedBy', 'name')
      .sort({ date: -1 }),
    TrainingSession.findById(req.params.sessionId).lean(),
  ]);

  const liveStatus = session ? sessionLiveStatus(session) : null;

  // For faculty callers: tell the frontend whether they are the assigned faculty
  let isAssignedFaculty = false;
  if (req.user.role === 'faculty' && session) {
    const { isAssigned } = await checkFacultyAssignment(req.user._id, session);
    isAssignedFaculty = isAssigned;
  }

  return sendSuccess(res, {
    records,
    sessionLiveStatus: liveStatus,
    isAssignedFaculty,          // frontend uses this to show/hide mark buttons
  }, 'Attendance fetched');
};

// ─── GET /api/attendance/student/:studentId ───────────────────────────────────
/**
 * Get all attendance records for a student.
 * Students can only fetch their own records.
 */
const getStudentAttendance = async (req, res) => {
  if (req.user.role === 'student') {
    const student = await Student.findOne({ userId: req.user._id }).lean();
    if (!student || student._id.toString() !== req.params.studentId) {
      return sendNotFound(res, 'Attendance not found');
    }
  }

  const records = await Attendance.find({ student: req.params.studentId })
    .populate('session', 'title category startDate startTime endDate endTime status')
    .sort({ date: -1 });

  return sendSuccess(res, records, 'Student attendance fetched');
};

// ─── GET /api/attendance/summary/:studentId ───────────────────────────────────
/**
 * Attendance summary stats. Cancelled-session records are excluded.
 */
const getAttendanceSummary = async (req, res) => {
  if (req.user.role === 'student') {
    const student = await Student.findOne({ userId: req.user._id }).lean();
    if (!student || student._id.toString() !== req.params.studentId) {
      return sendNotFound(res, 'Attendance not found');
    }
  }

  const records = await Attendance.find({ student: req.params.studentId })
    .populate('session', 'title category startDate startTime endDate endTime status');

  const validRecords = records.filter((r) => {
    if (!r.session) return false;
    return sessionLiveStatus(r.session) !== 'cancelled';
  });

  const total   = validRecords.length;
  const present = validRecords.filter((r) => r.status === 'present').length;
  const absent  = validRecords.filter((r) => r.status === 'absent').length;
  const late    = validRecords.filter((r) => r.status === 'late').length;
  const excused = validRecords.filter((r) => r.status === 'excused').length;
  const percentage = total > 0 ? parseFloat(((present + late) / total * 100).toFixed(2)) : 0;

  const byCategory = {};
  validRecords.forEach((r) => {
    const cat = r.session?.category || 'Unknown';
    if (!byCategory[cat]) byCategory[cat] = { total: 0, attended: 0 };
    byCategory[cat].total += 1;
    if (r.status === 'present' || r.status === 'late') byCategory[cat].attended += 1;
  });

  const categoryBreakdown = Object.entries(byCategory).map(([cat, data]) => ({
    category:   cat,
    total:      data.total,
    attended:   data.attended,
    percentage: parseFloat((data.attended / data.total * 100).toFixed(2)),
  }));

  return sendSuccess(res, { total, present, absent, late, excused, percentage, categoryBreakdown });
};

// ─── PUT /api/attendance/:id ──────────────────────────────────────────────────
/**
 * Admin-only: correct a single attendance record.
 * Only status and remarks are updatable — session/student/date are immutable.
 */
const updateAttendance = async (req, res) => {
  const { status, remarks } = req.body;
  const update = {};
  if (status)              update.status  = status;
  if (remarks !== undefined) update.remarks = remarks;

  const record = await Attendance.findByIdAndUpdate(
    req.params.id,
    { $set: { ...update, markedBy: req.user._id } },
    { new: true },
  );
  if (!record) return sendNotFound(res, 'Attendance record not found');
  return sendSuccess(res, record, 'Attendance corrected');
};

// ─── GET /api/attendance ──────────────────────────────────────────────────────
/** Paginated attendance list. Admin + faculty (read-only). */
const getAttendance = async (req, res) => {
  const { page, limit, skip, sort } = getPagination(req.query);
  const filter = {};
  if (req.query.session) filter.session = req.query.session;
  if (req.query.student) filter.student = req.query.student;
  if (req.query.status)  filter.status  = req.query.status;
  if (req.query.date) {
    const d = new Date(req.query.date);
    filter.date = { $gte: d, $lt: new Date(d.setDate(d.getDate() + 1)) };
  }

  const [records, total] = await Promise.all([
    Attendance.find(filter)
      .populate('student', 'name rollNumber department')
      .populate('session', 'title category')
      .sort(sort).skip(skip).limit(limit),
    Attendance.countDocuments(filter),
  ]);

  return sendSuccess(res, records, 'Attendance fetched', 200, buildPaginationMeta(total, page, limit));
};

module.exports = {
  markBulkAttendance,
  getSessionAttendance,
  getStudentAttendance,
  getAttendanceSummary,
  updateAttendance,
  getAttendance,
};
