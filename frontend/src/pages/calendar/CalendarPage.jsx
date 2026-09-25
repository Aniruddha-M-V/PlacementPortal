import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { sessionsApi } from '../../api/sessions.api';
import { activitiesApi } from '../../api/activities.api';
import { computeStatus } from '../../utils/eventStatus';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// ── Status badge helpers (matches Training Sessions module) ─────────────────────
const STATUS_STYLE = {
  upcoming:  'bg-primary-100  text-primary-700',
  ongoing:   'bg-success-100  text-success-700',
  completed: 'bg-slate-100    text-slate-600',
  cancelled: 'bg-danger-100   text-danger-700',
};
const STATUS_DOT = {
  upcoming:  'bg-primary-500',
  ongoing:   'bg-success-500',
  completed: 'bg-slate-400',
  cancelled: 'bg-danger-500',
};

/**
 * Parse a date string from the API without timezone shift.
 * ISO strings like "2026-08-22T00:00:00.000Z" converted via `new Date()` are
 * interpreted as UTC midnight and then shifted to local time, causing off-by-one.
 * We extract the local date parts directly from the string instead.
 */
function parseLocalDate(iso) {
  if (!iso) return null;
  // "2026-08-22T..." → [2026, 8, 22] local
  const [datePart] = iso.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  return new Date(y, m - 1, d); // local midnight — no timezone shift
}

/**
 * Check if a date-only local Date falls within the range [start, end] (inclusive).
 * Both start and end are also local Dates.
 */
function dateInRange(date, start, end) {
  const d = date.getTime();
  const s = start ? start.getTime() : d;
  const e = end   ? end.getTime()   : d;
  return d >= s && d <= e;
}

export default function CalendarPage() {
  const today = new Date();
  const [current, setCurrent] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [events, setEvents] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    // Fetch all sessions and activities (no date range param — backend doesn't filter by date range,
    // so we fetch with a high limit and filter client-side by the viewed month)
    Promise.all([
      sessionsApi.getAll({ limit: 200 }),
      activitiesApi.getAll({ limit: 200 }),
    ]).then(([sRes, aRes]) => {
      // Sessions: use startDate field (actual field on TrainingSession model)
      const sessions = (sRes.data.data || []).map(s => ({
        _id: s._id,
        title: s.title,
        type: 'session',
        // Compute live status from dates+times — cancelled overrides
        status: computeStatus(s.startDate, s.startTime, s.endDate, s.endTime, s.status),
        category: s.category || '',
        startDate: parseLocalDate(s.startDate),
        endDate: parseLocalDate(s.endDate),
      })).filter(e => e.startDate !== null);

      // Activities: use startDate field (actual field on Activity model)
      const acts = (aRes.data.data || []).map(a => ({
        _id: a._id,
        title: a.title,
        type: 'activity',
        status: computeStatus(a.startDate, a.startTime, a.endDate, a.endTime, a.status),
        actType: a.type || '',
        startDate: parseLocalDate(a.startDate),
        endDate: parseLocalDate(a.endDate),
      })).filter(e => e.startDate !== null);

      setEvents([...sessions, ...acts]);
    }).catch(() => {});
  }, [current]); // re-fetch when month changes so CRUD changes are reflected

  const firstDay = new Date(current.year, current.month, 1).getDay();
  const daysInMonth = new Date(current.year, current.month + 1, 0).getDate();

  /** Returns events that cover a given calendar day (handles multi-day spans) */
  const getEventsForDay = (day) => {
    const dayDate = new Date(current.year, current.month, day);
    return events.filter(e => {
      const end = e.endDate || e.startDate;
      return dateInRange(dayDate, e.startDate, end);
    });
  };

  const prev = () => setCurrent(c => c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 });
  const next = () => setCurrent(c => c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 });

  const dayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  return (
    <div className="page-content py-6 space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-text">Calendar</h1>
        <p className="text-sm text-text-muted">Training sessions and activities timeline</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ── Calendar Grid ── */}
        <div className="xl:col-span-2 card-padded">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-text">
              {MONTHS[current.month]} {current.year}
            </h2>
            <div className="flex gap-1">
              <button onClick={prev} className="btn btn-ghost btn-icon btn-sm"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setCurrent({ year: today.getFullYear(), month: today.getMonth() })} className="btn btn-outline btn-sm text-xs">Today</button>
              <button onClick={next} className="btn btn-ghost btn-icon btn-sm"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-px">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-text-muted py-2">{d}</div>
            ))}
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvts = getEventsForDay(day);
              const isToday = day === today.getDate() && current.month === today.getMonth() && current.year === today.getFullYear();
              const isSelected = selectedDay === day;
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`min-h-[56px] p-1.5 rounded-lg text-sm transition-colors flex flex-col items-center gap-0.5
                    ${isSelected ? 'bg-primary-600 text-white' : isToday ? 'bg-primary-50 text-primary-700 font-bold' : 'hover:bg-slate-50 text-text'}`}
                >
                  <span>{day}</span>
                  {dayEvts.length > 0 && (
                    <div className="flex gap-0.5 flex-wrap justify-center">
                      {dayEvts.slice(0, 3).map(e => (
                        <span
                          key={e._id}
                          className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : (STATUS_DOT[e.status] || (e.type === 'session' ? 'bg-primary-500' : 'bg-secondary-500'))}`}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-text-muted">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-primary-500 inline-block" /> Upcoming</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-success-500 inline-block" /> Ongoing</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-400  inline-block" /> Completed</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-danger-500  inline-block" /> Cancelled</span>
          </div>
        </div>

        {/* ── Day Events Panel ── */}
        <div className="card-padded space-y-3">
          <h2 className="text-base font-semibold text-text">
            {selectedDay
              ? `${MONTHS[current.month]} ${selectedDay}`
              : 'Select a day'}
          </h2>
          {selectedDay ? (
            dayEvents.length === 0
              ? <p className="text-sm text-text-muted">No events on this day</p>
              : dayEvents.map(e => (
                <div key={e._id} className={`flex items-start gap-3 p-3 rounded-lg ${e.type === 'session' ? 'bg-primary-50' : 'bg-secondary-50'}`}>
                  <CalendarIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${e.type === 'session' ? 'text-primary-600' : 'text-secondary-600'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text truncate">{e.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <p className="text-xs text-text-muted">
                        {e.type === 'session' ? `Training · ${e.category || 'session'}` : `Activity · ${e.actType || 'event'}`}
                      </p>
                      <span className={`text-xs px-1.5 py-0.5 rounded capitalize font-medium ${STATUS_STYLE[e.status] || 'bg-slate-100 text-slate-600'}`}>
                        {e.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))
          ) : (
            <p className="text-sm text-text-muted">Click on a date to see events</p>
          )}
        </div>
      </div>
    </div>
  );
}
