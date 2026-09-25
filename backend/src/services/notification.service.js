/**
 * notification.service.js
 *
 * Generates event status notifications for students.
 * Deduplication is enforced by the unique sparse `statusKey` index on Notification —
 * a duplicate insert is silently ignored (Mongo error code 11000).
 *
 * Only generates notifications for: upcoming, ongoing, cancelled.
 * Completed is intentionally skipped per project spec.
 */

const Notification = require('../models/Notification');
const User = require('../models/User');

// We need the system admin user's _id as the notification sender.
// Cache it after first lookup.
let _systemSenderId = null;
async function getSystemSender() {
  if (_systemSenderId) return _systemSenderId;
  const admin = await User.findOne({ role: 'admin' }).select('_id').lean();
  if (admin) _systemSenderId = admin._id;
  return _systemSenderId;
}

/** Compute live status from stored date/time fields (server-side mirror of frontend computeStatus). */
function calcLiveStatus(startDate, startTime, endDate, endTime, storedStatus) {
  if (storedStatus === 'cancelled') return 'cancelled';
  if (!startDate || !endDate) return storedStatus || 'upcoming';

  function localMs(dVal, hhMM) {
    const dateStr = (dVal instanceof Date) ? dVal.toISOString().split('T')[0] : String(dVal).split('T')[0];
    const [y, mo, d] = dateStr.split('-').map(Number);
    const [h, m] = (hhMM || '00:00').split(':').map(Number);
    return new Date(y, mo - 1, d, h, m).getTime();
  }

  const now = Date.now();
  const start = localMs(startDate, startTime || '00:00');
  const end   = localMs(endDate,   endTime   || '23:59');

  if (isNaN(start) || isNaN(end)) return storedStatus || 'upcoming';

  if (now < start) return 'upcoming';
  if (now <= end)  return 'ongoing';
  return 'completed';
}

/**
 * Emit a notification for an event status.
 * Safe to call frequently — duplicate statusKeys are silently ignored.
 *
 * @param {'session'|'activity'} moduleType
 * @param {Object} event — Mongoose document with _id, title, startDate, startTime, etc.
 */
async function emitEventNotification(moduleType, event) {
  const liveStatus = calcLiveStatus(
    event.startDate, event.startTime,
    event.endDate,   event.endTime,
    event.status
  );

  // Only notify for these statuses
  if (!['upcoming', 'ongoing', 'cancelled'].includes(liveStatus)) return;

  const statusKey = `${moduleType}:${event._id}:${liveStatus}`;

  // Build human-readable message
  const moduleLabel = moduleType === 'session' ? 'Training Session' : 'Activity';
  let title, message, notifType;

  const startDateStr = event.startDate
    ? new Date(String(event.startDate).split('T')[0]).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';
  const startTimeStr = event.startTime || '';

  if (liveStatus === 'upcoming') {
    title   = `Upcoming: ${event.title}`;
    message = `${moduleLabel} "${event.title}" is upcoming on ${startDateStr}${startTimeStr ? ' at ' + formatTime(startTimeStr) : ''}.`;
    notifType = 'info';
  } else if (liveStatus === 'ongoing') {
    title   = `Ongoing: ${event.title}`;
    message = `${moduleLabel} "${event.title}" is currently ongoing.`;
    notifType = 'success';
  } else {
    title   = `Cancelled: ${event.title}`;
    message = `${moduleLabel} "${event.title}" has been cancelled.`;
    notifType = 'alert';
  }

  const sender = await getSystemSender();
  if (!sender) return; // No admin in DB — can't send

  try {
    await Notification.create({
      title,
      message,
      type: notifType,
      sender,
      targetRole: 'student',
      isGlobal: true,
      relatedModule: moduleType,
      relatedId: event._id,
      statusKey,
    });
  } catch (err) {
    // 11000 = duplicate key — this notification already exists; skip silently
    if (err.code !== 11000) {
      console.error('[NotificationService] Failed to create notification:', err.message);
    }
  }
}

/** Format "14:30" → "2:30 PM" */
function formatTime(hhMM) {
  const [h, m] = hhMM.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

module.exports = { emitEventNotification, calcLiveStatus };
