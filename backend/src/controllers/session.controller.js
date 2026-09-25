const TrainingSession = require('../models/TrainingSession');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { sendSuccess, sendCreated, sendNotFound, sendBadRequest } = require('../utils/apiResponse');
const { emitEventNotification, calcLiveStatus } = require('../services/notification.service');

/** Combine YYYY-MM-DD ISO date string or Date object with HH:MM time string into a local Date */
function toLocalDt(dVal, hhMM) {
  if (!dVal || !hhMM) return null;
  const dp = (dVal instanceof Date) ? dVal.toISOString().split('T')[0] : String(dVal).split('T')[0];
  const [y, mo, d] = dp.split('-').map(Number);
  const [h, m] = hhMM.split(':').map(Number);
  return new Date(y, mo - 1, d, h, m);
}

function validateDateTimes(startDate, startTime, endDate, endTime) {
  const s = toLocalDt(startDate, startTime);
  const e = toLocalDt(endDate, endTime);
  if (!s || !e) return 'Start date/time and end date/time are required.';
  if (e <= s)   return 'End date/time must be after start date/time.';
  return null;
}

/** Compute duration in decimal hours from the 4 fields. Returns 0 if inputs invalid. */
function calcHours(startDate, startTime, endDate, endTime) {
  const s = toLocalDt(startDate, startTime);
  const e = toLocalDt(endDate, endTime);
  if (!s || !e || e <= s) return 0;
  return parseFloat(((e - s) / 3_600_000).toFixed(2));
}

// GET /api/sessions
const getSessions = async (req, res) => {
  const { page, limit, skip, sort } = getPagination(req.query);
  const filter = {};
  if (req.query.batch) filter.batch = req.query.batch;
  if (req.query.department) filter.department = req.query.department;
  if (req.query.mode) filter.mode = req.query.mode;

  // Search: case-insensitive regex on title and description
  if (req.query.search && req.query.search.trim()) {
    const re = new RegExp(req.query.search.trim(), 'i');
    filter.$or = [{ title: re }, { description: re }];
  }

  let sessions = await TrainingSession.find(filter)
    .populate('faculty', 'name department')
    .populate('createdBy', 'name')
    .sort(sort);

  // If status filter is applied, filter by live computed status
  if (req.query.status) {
    const targetStatus = req.query.status.toLowerCase();
    sessions = sessions.filter((s) => {
      const live = calcLiveStatus(s.startDate, s.startTime, s.endDate, s.endTime, s.status);
      return live === targetStatus;
    });
  }

  const total = sessions.length;
  const paginated = sessions.slice(skip, skip + limit);

  const response = sendSuccess(res, paginated, 'Sessions fetched', 200, buildPaginationMeta(total, page, limit));

  // Fire notifications in the background — non-blocking, duplicate-safe
  setImmediate(() => {
    paginated.forEach(s => emitEventNotification('session', s).catch(() => {}));
  });

  return response;
};

// POST /api/sessions
const createSession = async (req, res) => {
  const err = validateDateTimes(req.body.startDate, req.body.startTime, req.body.endDate, req.body.endTime);
  if (err) return sendBadRequest(res, err);
  // Always compute totalHours from the datetime fields — never trust a manually sent value
  const totalHours = calcHours(req.body.startDate, req.body.startTime, req.body.endDate, req.body.endTime);
  const session = await TrainingSession.create({ ...req.body, totalHours, createdBy: req.user._id });
  return sendCreated(res, session, 'Session created successfully');
};

// GET /api/sessions/:id
const getSessionById = async (req, res) => {
  const session = await TrainingSession.findById(req.params.id)
    .populate('faculty', 'name department designation')
    .populate('createdBy', 'name');
  if (!session) return sendNotFound(res, 'Session not found');
  return sendSuccess(res, session);
};

// PUT /api/sessions/:id
const updateSession = async (req, res) => {
  // Validate datetimes if any datetime field is being changed
  if (req.body.startDate || req.body.endDate || req.body.startTime || req.body.endTime) {
    const existing = await TrainingSession.findById(req.params.id);
    if (!existing) return sendNotFound(res, 'Session not found');
    const startDate = req.body.startDate || existing.startDate;
    const startTime = req.body.startTime || existing.startTime;
    const endDate   = req.body.endDate   || existing.endDate;
    const endTime   = req.body.endTime   || existing.endTime;
    const dtErr = validateDateTimes(startDate, startTime, endDate, endTime);
    if (dtErr) return sendBadRequest(res, dtErr);
    // Re-compute totalHours from the resolved fields
    req.body.totalHours = calcHours(startDate, startTime, endDate, endTime);
  }
  const session = await TrainingSession.findByIdAndUpdate(req.params.id, req.body, {
    new: true, runValidators: true,
  });
  if (!session) return sendNotFound(res, 'Session not found');
  return sendSuccess(res, session, 'Session updated');
};

// DELETE /api/sessions/:id
const deleteSession = async (req, res) => {
  const session = await TrainingSession.findById(req.params.id);
  if (!session) return sendNotFound(res, 'Session not found');
  await session.deleteOne();
  return sendSuccess(res, null, 'Session deleted');
};

// GET /api/sessions/upcoming — for calendar & dashboard
const getUpcomingSessions = async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const allSessions = await TrainingSession.find()
    .populate('faculty', 'name')
    .sort({ startDate: 1 });

  const sessions = allSessions
    .filter((s) => {
      const liveStatus = calcLiveStatus(s.startDate, s.startTime, s.endDate, s.endTime, s.status);
      return liveStatus === 'upcoming' || liveStatus === 'ongoing';
    })
    .slice(0, limit);

  return sendSuccess(res, sessions, 'Upcoming sessions fetched');
};

// GET /api/sessions/my — returns sessions assigned to the logged-in faculty
// Admin calling this endpoint gets all non-cancelled sessions.
const getMySessions = async (req, res) => {
  const { page, limit, skip, sort } = getPagination(req.query);

  let sessions;

  if (req.user.role === 'admin') {
    // Admin: return all sessions (same as getSessions without filters)
    sessions = await TrainingSession.find()
      .populate('faculty', 'name department')
      .sort(sort);
  } else {
    // Faculty: resolve their Faculty profile, then filter by session.faculty
    const facultyDoc = await Faculty.findOne({ userId: req.user._id }).lean();
    if (!facultyDoc) {
      return sendSuccess(res, [], 'No Faculty profile found for this user');
    }
    sessions = await TrainingSession.find({ faculty: facultyDoc._id })
      .populate('faculty', 'name department')
      .sort(sort);
  }

  // Apply live-status filter if provided
  if (req.query.status) {
    const targetStatus = req.query.status.toLowerCase();
    sessions = sessions.filter((s) => {
      const live = calcLiveStatus(s.startDate, s.startTime, s.endDate, s.endTime, s.status);
      return live === targetStatus;
    });
  }

  const total = sessions.length;
  const paginated = sessions.slice(skip, skip + limit);
  return sendSuccess(res, paginated, 'Sessions fetched', 200, buildPaginationMeta(total, page, limit));
};

module.exports = {
  getSessions, createSession, getSessionById, updateSession,
  deleteSession, getUpcomingSessions, getMySessions,
};
