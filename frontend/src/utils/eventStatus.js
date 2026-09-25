/**
 * eventStatus.js — shared utility for automatic event status calculation.
 *
 * Rules:
 *  - If storedStatus === 'cancelled' → always return 'cancelled' (manual override)
 *  - else if now < startDateTime  → 'upcoming'
 *  - else if now <= endDateTime   → 'ongoing'
 *  - else                          → 'completed'
 *
 * @param {string} startDateISO  — ISO date string from DB, e.g. "2026-08-22T00:00:00Z"
 * @param {string} startTime     — HH:MM string, e.g. "09:00"  (defaults to "00:00")
 * @param {string} endDateISO    — ISO date string from DB
 * @param {string} endTime       — HH:MM string, e.g. "17:30"  (defaults to "23:59")
 * @param {string} storedStatus  — current value stored in DB ("upcoming"|"ongoing"|"completed"|"cancelled")
 * @returns {"upcoming"|"ongoing"|"completed"|"cancelled"}
 */
export function computeStatus(startDateISO, startTime, endDateISO, endTime, storedStatus) {
  // Cancelled is always a manual override — never auto-computed away
  if (storedStatus === 'cancelled') return 'cancelled';

  if (!startDateISO || !endDateISO) return storedStatus || 'upcoming';

  const now = Date.now();

  // Combine the date's YYYY-MM-DD part with the HH:MM time in local timezone.
  // We split on 'T' to get the date portion without UTC offset issues.
  const start = localDateTimeMs(startDateISO, startTime || '00:00');
  const end   = localDateTimeMs(endDateISO,   endTime   || '23:59');

  if (now < start) return 'upcoming';
  if (now <= end)  return 'ongoing';
  return 'completed';
}

/**
 * Build a local-timezone Date from an ISO date string or Date object + HH:MM time string.
 * Returns ms timestamp.
 *
 * e.g. localDateTimeMs("2026-08-22T00:00:00Z", "09:30")
 *      → Date for Aug 22 2026 at 09:30 local time
 */
function localDateTimeMs(isoDateString, hhMM) {
  if (!isoDateString) return NaN;
  const datePart = (isoDateString instanceof Date)
    ? isoDateString.toISOString().split('T')[0]
    : String(isoDateString).split('T')[0];
  const [h, m] = (hhMM || '00:00').split(':').map(Number);
  const [year, month, day] = datePart.split('-').map(Number);
  return new Date(year, month - 1, day, h, m, 0, 0).getTime();
}
