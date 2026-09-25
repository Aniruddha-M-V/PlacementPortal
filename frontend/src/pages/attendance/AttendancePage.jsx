/**
 * AttendancePage.jsx
 *
 * Role-aware attendance management.
 *
 * ADMIN
 *   - Can select any non-cancelled session.
 *   - Can mark attendance for upcoming / ongoing sessions.
 *   - Can enter Correction Mode for completed sessions.
 *
 * FACULTY (assigned to session)
 *   - Can mark attendance ONLY while their session is ONGOING.
 *   - Session is locked once completed (read-only, admin-only correction).
 *   - Cannot mark for sessions assigned to other faculty.
 *
 * FACULTY (not assigned / session has no faculty)
 *   - Read-only view.
 *
 * STUDENT
 *   - Does not reach this page (protected by app routing).
 */

import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2, XCircle, Clock, MinusCircle,
  Save, Lock, AlertCircle, Info, ShieldAlert, Pencil,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { attendanceApi } from '../../api/attendance.api';
import { sessionsApi }   from '../../api/sessions.api';
import { studentsApi }   from '../../api/students.api';
import { useAuth }       from '../../context/AuthContext';
import { computeStatus } from '../../utils/eventStatus';

// ─── constants ────────────────────────────────────────────────────────────────

const STATUS_OPTS = [
  { value: 'present', icon: CheckCircle2, label: 'Present', color: 'text-success-600' },
  { value: 'absent',  icon: XCircle,      label: 'Absent',  color: 'text-danger-600'  },
  { value: 'late',    icon: Clock,        label: 'Late',    color: 'text-accent-500'  },
  { value: 'excused', icon: MinusCircle,  label: 'Excused', color: 'text-slate-400'   },
];

const BADGE_CLASS = {
  present: 'badge-success',
  absent:  'badge-danger',
  late:    'badge-warning',
  excused: 'badge-muted',
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '—';
  const dp = (iso instanceof Date ? iso.toISOString() : String(iso)).split('T')[0];
  const [y, m, d] = dp.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

const STATUS_LABEL = {
  upcoming:  'Upcoming',
  ongoing:   'Ongoing',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

// ─── component ────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const { hasRole } = useAuth();

  const isAdmin   = hasRole('admin');
  const isFaculty = hasRole('faculty');

  // ── state ──────────────────────────────────────────────────────────────────
  const [sessions,        setSessions]        = useState([]);
  const [selectedId,      setSelectedId]      = useState('');
  const [selectedSession, setSelectedSession] = useState(null);

  // Returned by the server after loading session attendance:
  const [serverLiveStatus,    setServerLiveStatus]    = useState(null);
  const [isAssignedFaculty,   setIsAssignedFaculty]   = useState(false);

  const [students,        setStudents]        = useState([]);
  const [records,         setRecords]         = useState({});
  const [loading,         setLoading]         = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [sessionDate,     setSessionDate]     = useState('');
  const [correctionMode,  setCorrectionMode]  = useState(false);

  // ── derived state ──────────────────────────────────────────────────────────
  // Prefer live status from the server response; fall back to client calculation
  const liveStatus = serverLiveStatus
    ?? (selectedSession
      ? computeStatus(
          selectedSession.startDate, selectedSession.startTime,
          selectedSession.endDate,   selectedSession.endTime,
          selectedSession.status,
        )
      : null);

  // Determine if the current user is allowed to edit attendance right now:
  //
  //   Admin:
  //     - upcoming / ongoing / completed+correctionMode → can edit
  //     - completed without correction mode → locked (click "Correct Attendance" first)
  //     - cancelled → never
  //
  //   Assigned Faculty:
  //     - ongoing only → can edit
  //     - anything else → locked
  //
  //   Non-assigned Faculty / others:
  //     - never
  const canEdit = (() => {
    if (!liveStatus || liveStatus === 'cancelled') return false;
    if (isAdmin) {
      if (liveStatus === 'completed') return correctionMode;
      return true; // upcoming or ongoing
    }
    if (isFaculty && isAssignedFaculty) {
      return liveStatus === 'ongoing';
    }
    return false;
  })();

  const presentCount = Object.values(records).filter(v => v === 'present' || v === 'late').length;

  // ── load sessions dropdown ─────────────────────────────────────────────────
  useEffect(() => {
    sessionsApi
      .getAll({ limit: 200 })
      .then(res => {
        const all = res.data.data || [];
        // Exclude cancelled from the selector entirely
        const valid = all.filter(s =>
          computeStatus(s.startDate, s.startTime, s.endDate, s.endTime, s.status) !== 'cancelled'
        );
        setSessions(valid);
      })
      .catch(() => toast.error('Failed to load sessions'));
  }, []);

  // ── load students + existing attendance ────────────────────────────────────
  const loadStudents = useCallback(async (sessionId, sessionObj) => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const params = { limit: 200 };
      if (sessionObj?.targetBatch)      params.batch      = sessionObj.targetBatch;
      if (sessionObj?.targetDepartment) params.department = sessionObj.targetDepartment;

      const [stuRes, repRes] = await Promise.all([
        studentsApi.getAll(params),
        attendanceApi.getSessionReport(sessionId).catch(() => ({
          data: { data: { records: [], sessionLiveStatus: null, isAssignedFaculty: false } },
        })),
      ]);

      const repData = repRes.data.data ?? {};

      // Server now returns { records, sessionLiveStatus, isAssignedFaculty }
      const existingRecords = Array.isArray(repData)
        ? repData                       // backward-compat
        : (repData.records ?? []);

      setServerLiveStatus(repData.sessionLiveStatus ?? null);
      setIsAssignedFaculty(repData.isAssignedFaculty ?? false);

      // Build lookup: studentId → status
      const existingMap = {};
      for (const r of existingRecords) {
        const sid = r.student?._id || r.student;
        if (sid) existingMap[String(sid)] = r.status;
      }

      const stus = stuRes.data.data || [];
      setStudents(stus);

      const init = {};
      stus.forEach(s => { init[s._id] = existingMap[s._id] ?? 'present'; });
      setRecords(init);

      // Derive attendance date from session start date
      const rawDate = sessionObj?.startDate;
      if (rawDate) {
        const dp = (rawDate instanceof Date ? rawDate.toISOString() : String(rawDate)).split('T')[0];
        setSessionDate(dp);
      } else {
        setSessionDate(new Date().toISOString().split('T')[0]);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load session data');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── session selector handler ───────────────────────────────────────────────
  const handleSessionChange = (id) => {
    setSelectedId(id);
    setCorrectionMode(false);
    setServerLiveStatus(null);
    setIsAssignedFaculty(false);
    if (!id) {
      setSelectedSession(null);
      setStudents([]);
      setRecords({});
      return;
    }
    const sess = sessions.find(s => s._id === id) ?? null;
    setSelectedSession(sess);
    setStudents([]);
    setRecords({});
    loadStudents(id, sess);
  };

  // ── mark all shortcut ──────────────────────────────────────────────────────
  const markAll = (status) => {
    if (!canEdit) return;
    const next = {};
    students.forEach(s => { next[s._id] = status; });
    setRecords(next);
  };

  // ── save / correct ─────────────────────────────────────────────────────────
  const save = async () => {
    if (!selectedId || !canEdit) return;
    setSaving(true);
    try {
      const rec = Object.entries(records).map(([studentId, status]) => ({ studentId, status }));
      await attendanceApi.bulkMark(selectedId, sessionDate, rec);
      const msg = liveStatus === 'completed' ? 'Attendance correction saved' : 'Attendance saved successfully';
      toast.success(msg);
      if (correctionMode) setCorrectionMode(false);
    } catch (err) {
      // Show the server's specific 403 message when permission is denied
      const msg = err.response?.data?.message || err.message || 'Failed to save attendance';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="page-content py-6 space-y-5">

      {/* page header */}
      <div>
        <h1 className="text-xl font-semibold text-text">Attendance</h1>
        <p className="text-sm text-text-muted">
          {isAdmin   ? 'Mark and manage session attendance' : ''}
          {isFaculty ? 'Mark attendance for your assigned sessions' : ''}
        </p>
      </div>

      {/* faculty context notice */}
      {isFaculty && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-blue-200 bg-blue-50 text-blue-800 text-sm">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            You can mark attendance <strong>only for sessions assigned to you</strong> and only while the session is <strong>Ongoing</strong>.
            Admin is required for corrections after a session ends.
          </span>
        </div>
      )}

      {/* session selector */}
      <div className="card-padded space-y-3">
        <label className="form-label">Select Session</label>
        <select
          id="attendance-session-select"
          className="form-input max-w-xl"
          value={selectedId}
          onChange={e => handleSessionChange(e.target.value)}
        >
          <option value="">Choose a session…</option>
          {sessions.map(s => {
            const live = computeStatus(s.startDate, s.startTime, s.endDate, s.endTime, s.status);
            return (
              <option key={s._id} value={s._id}>
                {s.title} — {fmtDate(s.startDate)} [{STATUS_LABEL[live] ?? live}]
              </option>
            );
          })}
        </select>
        {sessions.length === 0 && (
          <p className="text-xs text-text-muted">
            No sessions found. Create a Training Session first.
          </p>
        )}
      </div>

      {/* session details + attendance table */}
      {selectedId && selectedSession && (
        <div className="space-y-4">

          {/* ── status banners ───────────────────────────────────── */}

          {/* Admin: upcoming pre-mark notice */}
          {isAdmin && liveStatus === 'upcoming' && (
            <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                This session hasn't started yet (<strong>Upcoming</strong>).
                You can pre-mark attendance; it can be updated once the session begins.
              </span>
            </div>
          )}

          {/* Faculty: upcoming — cannot mark yet */}
          {isFaculty && liveStatus === 'upcoming' && (
            <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                This session hasn't started yet. Attendance marking will be available once it is <strong>Ongoing</strong>.
              </span>
            </div>
          )}

          {/* Faculty: not the assigned faculty */}
          {isFaculty && !isAssignedFaculty && selectedId && !loading && (
            <div className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 text-sm">
              <Lock className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                You are <strong>not the assigned faculty</strong> for this session. Attendance is view-only.
              </span>
            </div>
          )}

          {/* Admin: completed — locked unless correction mode */}
          {isAdmin && liveStatus === 'completed' && !correctionMode && (
            <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50 text-sm">
              <div className="flex items-start gap-3 text-slate-600">
                <Lock className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  This session has <strong>ended</strong>.
                  Attendance is locked. Use the correction mode to make authorised changes.
                </span>
              </div>
              <button
                id="btn-correction-mode"
                onClick={() => setCorrectionMode(true)}
                className="btn btn-outline btn-sm shrink-0 flex items-center gap-1.5 text-amber-700 border-amber-300 hover:bg-amber-50"
              >
                <Pencil className="w-3.5 h-3.5" />
                Correct Attendance
              </button>
            </div>
          )}

          {/* Faculty: completed — cannot correct */}
          {isFaculty && liveStatus === 'completed' && (
            <div className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 text-sm">
              <Lock className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                This session has ended. Attendance is <strong>locked</strong>.
                Contact an Admin to make corrections.
              </span>
            </div>
          )}

          {/* Admin: correction mode active */}
          {isAdmin && liveStatus === 'completed' && correctionMode && (
            <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 text-sm">
              <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                <strong>Admin Correction Mode</strong> — you are editing attendance for a completed session.
                Changes are saved immediately on "Save Correction".
              </span>
            </div>
          )}

          {/* ── attendance card ───────────────────────────────────── */}
          <div className="card-padded space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm font-medium text-text">
                  {presentCount} / {students.length} present
                </p>
                {students.length > 0 && (
                  <p className="text-xs text-text-muted">
                    {Math.round((presentCount / students.length) * 100)}% attendance
                  </p>
                )}
              </div>

              {/* Action buttons — only shown when editing is permitted */}
              {canEdit && (
                <div className="flex flex-wrap gap-2">
                  <button
                    id="btn-mark-all-present"
                    onClick={() => markAll('present')}
                    className="btn btn-outline btn-sm text-success-600 border-success-200 hover:bg-success-50"
                  >
                    Mark All Present
                  </button>
                  <button
                    id="btn-mark-all-absent"
                    onClick={() => markAll('absent')}
                    className="btn btn-outline btn-sm text-danger-600 border-danger-200 hover:bg-danger-50"
                  >
                    Mark All Absent
                  </button>
                  <button
                    id="btn-save-attendance"
                    onClick={save}
                    disabled={saving || students.length === 0}
                    className="btn btn-primary btn-sm flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    {saving
                      ? 'Saving…'
                      : liveStatus === 'completed'
                        ? 'Save Correction'
                        : 'Save Attendance'
                    }
                  </button>
                </div>
              )}

              {/* Lock indicator for read-only view */}
              {!canEdit && liveStatus && liveStatus !== 'cancelled' && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Lock className="w-3.5 h-3.5" />
                  {liveStatus === 'completed'
                    ? 'Attendance locked (session ended)'
                    : liveStatus === 'upcoming'
                      ? 'Session not started yet'
                      : 'View only'
                  }
                </div>
              )}
            </div>

            {/* Attendance table */}
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Roll No</th>
                    <th>Department</th>
                    <th>Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={4}>
                          <div className="h-8 bg-slate-100 rounded animate-pulse" />
                        </td>
                      </tr>
                    ))
                    : students.length === 0
                      ? (
                        <tr>
                          <td colSpan={4} className="text-center py-8 text-sm text-text-muted">
                            No students match this session's batch / department configuration.
                          </td>
                        </tr>
                      )
                      : students.map(s => (
                        <tr key={s._id}>
                          <td className="font-medium">
                            {s.userId?.name || s.name || '—'}
                          </td>
                          <td className="font-mono text-xs">{s.rollNumber || '—'}</td>
                          <td className="text-sm text-text-muted capitalize">{s.department || '—'}</td>
                          <td>
                            {canEdit ? (
                              /* Interactive status buttons */
                              <div className="flex flex-wrap gap-1">
                                {STATUS_OPTS.map(opt => {
                                  const active = records[s._id] === opt.value;
                                  return (
                                    <button
                                      key={opt.value}
                                      id={`btn-status-${s._id}-${opt.value}`}
                                      onClick={() => setRecords(r => ({ ...r, [s._id]: opt.value }))}
                                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                                        active
                                          ? 'bg-slate-900 text-white border-slate-900'
                                          : 'bg-surface border-border text-text-muted hover:border-slate-300'
                                      }`}
                                    >
                                      <opt.icon className={`w-3.5 h-3.5 ${active ? 'text-white' : opt.color}`} />
                                      <span>{opt.label}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              /* Read-only badge */
                              <span className={`badge capitalize ${BADGE_CLASS[records[s._id]] ?? 'badge-muted'}`}>
                                {records[s._id] || 'Not marked'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
