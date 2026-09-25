/**
 * FacultyDashboard.jsx
 *
 * Dedicated dashboard for Faculty users.
 * Shows faculty-relevant information only:
 *   - Welcome with name / department / designation
 *   - Session counts by live status (upcoming / ongoing / completed)
 *   - Upcoming assigned sessions list
 *   - Ongoing assigned sessions list (with link to mark attendance)
 *   - Recent attendance they marked
 *   - Recent assessments
 *   - Unread notifications
 *
 * Does NOT show admin-only stats (total students, placement eligibility,
 * institution-wide analytics, etc.)
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, CalendarCheck, CheckCircle2, Clock,
  Bell, ClipboardList, ChevronRight, UserCheck, AlertCircle,
} from 'lucide-react';
import { dashboardApi } from '../../api/dashboard.api';
import { useAuth } from '../../context/AuthContext';

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

// ─── small sub-components ─────────────────────────────────────────────────────

const StatTile = ({ label, value, icon: Icon, color }) => (
  <div className="stat-card">
    <div className={`stat-icon ${color}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <p className="text-2xl font-bold text-text">{value ?? '—'}</p>
      <p className="text-sm font-medium text-text mt-0.5">{label}</p>
    </div>
  </div>
);

const SessionRow = ({ session, badge }) => (
  <div className="flex items-start justify-between py-3 border-b border-border last:border-0 gap-3">
    <div className="min-w-0">
      <p className="text-sm font-medium text-text truncate">{session.title}</p>
      <p className="text-xs text-text-muted mt-0.5">
        {fmtDate(session.startDate)}
        {session.startTime ? ` · ${fmtTime(session.startTime)}` : ''}
        {session.venue ? ` · ${session.venue}` : ''}
      </p>
    </div>
    <div className="flex items-center gap-2 shrink-0">
      <span className={`badge capitalize text-xs ${badge}`}>{session.liveStatus}</span>
      <Link
        to="/attendance"
        className="btn btn-ghost btn-icon btn-sm"
        title={session.liveStatus === 'ongoing' ? 'Mark Attendance' : 'View Attendance'}
      >
        <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  </div>
);

// ─── main component ───────────────────────────────────────────────────────────

export default function FacultyDashboard() {
  const { user } = useAuth();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.getFacultyDashboard()
      .then(res => setData(res.data.data))
      .catch(() => {}) // graceful — page still renders with empty states
      .finally(() => setLoading(false));
  }, []);

  const faculty   = data?.faculty;
  const stats     = data?.sessionStats ?? {};
  const upcoming  = data?.upcomingSessions ?? [];
  const ongoing   = data?.ongoingSessions ?? [];
  const recentAtt = data?.recentAttendance ?? [];
  const recentAss = data?.recentAssessments ?? [];
  const notifs    = data?.notifications ?? [];

  const displayName = faculty?.name || user?.name || 'Faculty';

  return (
    <div className="page-content py-6 space-y-6">

      {/* ── Welcome header ─────────────────────────────────────── */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
          <UserCheck className="w-6 h-6 text-primary-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-text">
            Welcome, {displayName}
          </h1>
          <p className="text-sm text-text-muted mt-0.5">
            {faculty?.designation ? `${faculty.designation} · ` : ''}
            {faculty?.department || ''}
          </p>
        </div>
      </div>

      {/* ── No Faculty profile notice ───────────────────────────── */}
      {!loading && !faculty?.department && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Your account doesn't have a complete Faculty profile yet.
            Contact the Admin to set up your department, designation, and session assignments.
          </span>
        </div>
      )}

      {/* ── Session stat tiles ──────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="stat-card animate-pulse">
              <div className="w-11 h-11 rounded-lg bg-slate-100" />
              <div className="space-y-2">
                <div className="h-6 w-10 bg-slate-100 rounded" />
                <div className="h-4 w-24 bg-slate-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatTile
            label="Upcoming Sessions"
            value={stats.upcoming ?? 0}
            icon={Clock}
            color="bg-amber-50 text-amber-600"
          />
          <StatTile
            label="Ongoing Sessions"
            value={stats.ongoing ?? 0}
            icon={BookOpen}
            color="bg-success-50 text-success-600"
          />
          <StatTile
            label="Completed Sessions"
            value={stats.completed ?? 0}
            icon={CheckCircle2}
            color="bg-primary-50 text-primary-600"
          />
        </div>
      )}

      {/* ── Ongoing sessions (action required) ─────────────────── */}
      {ongoing.length > 0 && (
        <div className="card-padded">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-text flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
              Ongoing Sessions
            </h2>
            <Link to="/attendance" className="text-xs text-primary-600 hover:underline">
              Mark Attendance →
            </Link>
          </div>
          {ongoing.map(s => (
            <SessionRow key={s._id} session={s} badge="badge-secondary" />
          ))}
        </div>
      )}

      {/* ── Upcoming sessions ───────────────────────────────────── */}
      <div className="card-padded">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-text">My Upcoming Sessions</h2>
          <Link to="/sessions" className="text-xs text-primary-600 hover:underline">
            View All →
          </Link>
        </div>
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map(i => <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />)}
          </div>
        ) : upcoming.length === 0 ? (
          <div className="py-8 text-center text-sm text-text-muted">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No upcoming sessions assigned to you.
          </div>
        ) : (
          upcoming.map(s => (
            <SessionRow key={s._id} session={s} badge="badge-primary" />
          ))
        )}
      </div>

      {/* ── Two-column: recent attendance + notifications ───────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Recent Attendance Marked */}
        <div className="card-padded">
          <div className="flex items-center gap-2 mb-3">
            <CalendarCheck className="w-4 h-4 text-text-muted" />
            <h2 className="text-base font-semibold text-text">Recently Marked Attendance</h2>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-8 bg-slate-100 rounded animate-pulse" />)}
            </div>
          ) : recentAtt.length === 0 ? (
            <div className="py-6 text-center text-sm text-text-muted">
              You haven't marked any attendance yet.
            </div>
          ) : (
            <div>
              {recentAtt.slice(0, 8).map((r, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0 gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-text truncate">
                      {r.student?.name || 'Student'}
                    </p>
                    <p className="text-xs text-text-muted">
                      {r.session?.title || 'Session'}
                    </p>
                  </div>
                  <span className={`badge capitalize text-xs ${
                    r.status === 'present' ? 'badge-success'
                    : r.status === 'absent'  ? 'badge-danger'
                    : r.status === 'late'    ? 'badge-warning'
                    : 'badge-muted'
                  }`}>
                    {r.status}
                  </span>
                </div>
              ))}
              <Link to="/attendance" className="block text-xs text-primary-600 hover:underline mt-3">
                Go to Attendance →
              </Link>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="card-padded">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-text-muted" />
            <h2 className="text-base font-semibold text-text">Notifications</h2>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-8 bg-slate-100 rounded animate-pulse" />)}
            </div>
          ) : notifs.length === 0 ? (
            <div className="py-6 text-center text-sm text-text-muted">
              No unread notifications.
            </div>
          ) : (
            <div>
              {notifs.map((n, i) => (
                <div key={i} className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
                  <div className="w-7 h-7 rounded-full bg-primary-50 flex items-center justify-center shrink-0 mt-0.5">
                    <Bell className="w-3.5 h-3.5 text-primary-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-text">{n.message || n.title}</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {fmtDate(n.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
              <Link to="/notifications" className="block text-xs text-primary-600 hover:underline mt-3">
                View All Notifications →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Assessments ──────────────────────────────────── */}
      {recentAss.length > 0 && (
        <div className="card-padded">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-text-muted" />
              <h2 className="text-base font-semibold text-text">Recent Assessments</h2>
            </div>
            <Link to="/assessments" className="text-xs text-primary-600 hover:underline">
              View All →
            </Link>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Avg Score</th>
                </tr>
              </thead>
              <tbody>
                {recentAss.map((a, i) => (
                  <tr key={i}>
                    <td className="font-medium">{a.title}</td>
                    <td className="capitalize text-sm text-text-muted">{a.type}</td>
                    <td className="text-sm">{fmtDate(a.date)}</td>
                    <td className="text-sm">
                      {a.percentage != null ? `${a.percentage}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
