const Activity = require('../models/Activity');
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

/** Compute duration in decimal hours. Returns 0 if inputs invalid. */
function calcHours(startDate, startTime, endDate, endTime) {
  const s = toLocalDt(startDate, startTime);
  const e = toLocalDt(endDate, endTime);
  if (!s || !e || e <= s) return 0;
  return parseFloat(((e - s) / 3_600_000).toFixed(2));
}

// GET /api/activities
const getActivities = async (req, res) => {
  const { page, limit, skip, sort } = getPagination(req.query);
  const filter = {};
  if (req.query.type) filter.type = req.query.type;
  if (req.query.mode) filter.mode = req.query.mode;

  // Search: case-insensitive regex on title and description
  if (req.query.search && req.query.search.trim()) {
    const re = new RegExp(req.query.search.trim(), 'i');
    filter.$or = [{ title: re }, { description: re }];
  }

  let activities = await Activity.find(filter).sort(sort);

  // If status filter is applied, filter by live computed status
  if (req.query.status) {
    const targetStatus = req.query.status.toLowerCase();
    activities = activities.filter((a) => {
      const live = calcLiveStatus(a.startDate, a.startTime, a.endDate, a.endTime, a.status);
      return live === targetStatus;
    });
  }

  const total = activities.length;
  const paginated = activities.slice(skip, skip + limit);

  const response = sendSuccess(res, paginated, 'Activities fetched', 200, buildPaginationMeta(total, page, limit));

  // Fire notifications in the background — non-blocking, duplicate-safe
  setImmediate(() => {
    paginated.forEach(a => emitEventNotification('activity', a).catch(() => {}));
  });

  return response;
};

// POST /api/activities
const createActivity = async (req, res) => {
  const err = validateDateTimes(req.body.startDate, req.body.startTime, req.body.endDate, req.body.endTime);
  if (err) return sendBadRequest(res, err);
  // Always compute duration from datetimes — never trust a manually sent value
  const duration = calcHours(req.body.startDate, req.body.startTime, req.body.endDate, req.body.endTime);
  const activity = await Activity.create({ ...req.body, duration, createdBy: req.user._id });
  return sendCreated(res, activity, 'Activity created');
};

// GET /api/activities/:id
const getActivityById = async (req, res) => {
  const activity = await Activity.findById(req.params.id)
    .populate('participants.student', 'name rollNumber department');
  if (!activity) return sendNotFound(res, 'Activity not found');
  return sendSuccess(res, activity);
};

// PUT /api/activities/:id
const updateActivity = async (req, res) => {
  if (req.body.startDate || req.body.endDate || req.body.startTime || req.body.endTime) {
    const existing = await Activity.findById(req.params.id);
    if (!existing) return sendNotFound(res, 'Activity not found');
    const startDate = req.body.startDate || existing.startDate;
    const startTime = req.body.startTime || existing.startTime;
    const endDate   = req.body.endDate   || existing.endDate;
    const endTime   = req.body.endTime   || existing.endTime;
    const dtErr = validateDateTimes(startDate, startTime, endDate, endTime);
    if (dtErr) return sendBadRequest(res, dtErr);
    // Re-compute duration from the resolved fields
    req.body.duration = calcHours(startDate, startTime, endDate, endTime);
  }
  const activity = await Activity.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!activity) return sendNotFound(res, 'Activity not found');
  return sendSuccess(res, activity, 'Activity updated');
};

// DELETE /api/activities/:id
const deleteActivity = async (req, res) => {
  const activity = await Activity.findById(req.params.id);
  if (!activity) return sendNotFound(res, 'Activity not found');
  await activity.deleteOne();
  return sendSuccess(res, null, 'Activity deleted');
};

// POST /api/activities/:id/participants — add participants
const addParticipants = async (req, res) => {
  const { studentIds } = req.body;
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return sendBadRequest(res, 'studentIds array is required');
  }

  const activity = await Activity.findById(req.params.id);
  if (!activity) return sendNotFound(res, 'Activity not found');

  if (activity.maxParticipants && activity.participants.length + studentIds.length > activity.maxParticipants) {
    return sendBadRequest(res, `Activity is at capacity (max ${activity.maxParticipants})`);
  }

  const existing = activity.participants.map((p) => p.student.toString());
  const newParticipants = studentIds
    .filter((id) => !existing.includes(id))
    .map((id) => ({ student: id, attended: false }));

  activity.participants.push(...newParticipants);
  await activity.save();

  return sendSuccess(res, activity, `${newParticipants.length} participants added`);
};

// PUT /api/activities/:id/attendance — mark attendance for activity
const markActivityAttendance = async (req, res) => {
  const { records } = req.body;
  // records = [{ studentId, attended, certificateUrl }]
  const activity = await Activity.findById(req.params.id);
  if (!activity) return sendNotFound(res, 'Activity not found');

  records.forEach((r) => {
    const participant = activity.participants.find((p) => p.student.toString() === r.studentId);
    if (participant) {
      participant.attended = r.attended;
      if (r.certificateUrl) participant.certificateUrl = r.certificateUrl;
    }
  });

  await activity.save();
  return sendSuccess(res, activity, 'Attendance updated');
};

module.exports = {
  getActivities, createActivity, getActivityById, updateActivity,
  deleteActivity, addParticipants, markActivityAttendance,
};
