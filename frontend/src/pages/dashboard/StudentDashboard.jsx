import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, Activity, Bell, CheckCircle2, XCircle, Clock,
  TrendingUp, Award, CalendarCheck, Users,
} from 'lucide-react';
import api from '../../api/axios';
import { computeStatus } from '../../utils/eventStatus';
import { useAuth } from '../../context/AuthContext';

const STATUS_STYLE = {
  upcoming: 'bg-primary-50 text-primary-700 border-primary-200',
  ongoing: 'bg-success-50 text-success-700 border-success-200',
  completed: 'bg-slate-50 text-slate-600 border-slate-200',
  cancelled: 'bg-danger-50 text-danger-700 border-danger-200',
};

const NOTIF_ICON = {
  info: <Bell className="w-4 h-4 text-primary-500" />,
  success: <CheckCircle2 className="w-4 h-4 text-success-500" />,
  alert: <XCircle className="w-4 h-4 text-danger-500" />,
  warning: <Clock className="w-4 h-4 text-warning-500" />,
};

function SessionRow({ s }) {
  const status = computeStatus(s.startDate, s.startTime, s.endDate, s.endTime, s.status);
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text truncate">{s.title}</p>
        <p className="text-xs text-text-muted mt-0.5 capitalize">
          {s.category} · {s.totalHours ?? 0}h · {s.mode}
        </p>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full border capitalize font-medium ml-3 flex-shrink-0 ${STATUS_STYLE[status] || ''}`}>
        {status}
      </span>
    </div>
  );
}

function ActivityRow({ a }) {
  const status = computeStatus(a.startDate, a.startTime, a.endDate, a.endTime, a.status);
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text truncate">{a.title}</p>
        <p className="text-xs text-text-muted mt-0.5 capitalize">
          {a.type} {a.venue ? `· ${a.venue}` : ''}
        </p>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full border capitalize font-medium ml-3 flex-shrink-0 ${STATUS_STYLE[status] || ''}`}>
        {status}
      </span>
    </div>
  );
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/student')
      .then(r => setData(r.data.data))
      .catch(() => setData({}))
      .finally(() => setLoading(false));
  }, []);

  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const st = data?.student;
  const att = data?.attendanceSummary;
  const elig = data?.eligibility;

  if (loading) {
    return (
      <div className="page-content py-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="stat-card animate-pulse">
              <div className="w-11 h-11 rounded-lg bg-slate-100" />
              <div className="space-y-2 flex-1">
                <div className="h-6 w-16 bg-slate-100 rounded" />
                <div className="h-4 w-24 bg-slate-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page-content py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-lg font-bold text-primary-700 flex-shrink-0">
          {initials}
        </div>
        <div>
          <h1 className="text-xl font-semibold text-text">Welcome, {user?.name?.split(' ')[0]}!</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {st ? `${st.rollNumber} · ${st.department} · ${st.batch}` : 'Student Dashboard'}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Attendance */}
        <div className="stat-card">
          <div className="stat-icon bg-primary-50 text-primary-600"><CalendarCheck className="w-5 h-5" /></div>
          <div>
            <p className="text-2xl font-bold text-text">
              {att?.attendancePercent != null ? `${att.attendancePercent}%` : '—'}
            </p>
            <p className="text-sm font-medium text-text mt-0.5">My Attendance</p>
            {att && <p className="text-xs text-text-muted mt-0.5">{att.presentCount}/{att.totalSessions} sessions</p>}
          </div>
        </div>

        {/* Eligibility */}
        <div className="stat-card">
          <div className={`stat-icon ${elig?.isEligible ? 'bg-success-50 text-success-600' : 'bg-slate-100 text-slate-500'}`}>
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-text capitalize">
              {elig ? (elig.isEligible ? 'Eligible' : 'Not Eligible') : '—'}
            </p>
            <p className="text-sm font-medium text-text mt-0.5">Placement Status</p>
            {elig && <p className="text-xs text-text-muted mt-0.5 capitalize">{elig.placementStatus?.replace('_', ' ')}</p>}
          </div>
        </div>

        {/* Upcoming Sessions */}
        <div className="stat-card">
          <div className="stat-icon bg-accent-50 text-accent-600"><BookOpen className="w-5 h-5" /></div>
          <div>
            <p className="text-2xl font-bold text-text">{data?.upcomingSessions?.length ?? 0}</p>
            <p className="text-sm font-medium text-text mt-0.5">Upcoming Sessions</p>
            <p className="text-xs text-text-muted mt-0.5">Active & upcoming</p>
          </div>
        </div>

        {/* CGPA */}
        <div className="stat-card">
          <div className="stat-icon bg-secondary-50 text-secondary-600"><TrendingUp className="w-5 h-5" /></div>
          <div>
            <p className="text-2xl font-bold text-text">{st?.cgpa ?? '—'}</p>
            <p className="text-sm font-medium text-text mt-0.5">CGPA</p>
            <p className="text-xs text-text-muted mt-0.5">Semester {st?.semester ?? '—'}</p>
          </div>
        </div>
      </div>

      {/* Two-column content */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Upcoming Sessions */}
        <div className="card-padded">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-text flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary-500" /> Upcoming Training Sessions
            </h2>
            <Link to="/sessions" className="text-xs text-primary-600 hover:underline">View all →</Link>
          </div>
          {data?.upcomingSessions?.length > 0 ? (
            data.upcomingSessions.map(s => <SessionRow key={s._id} s={s} />)
          ) : (
            <p className="text-sm text-text-muted text-center py-8">No upcoming sessions</p>
          )}
        </div>

        {/* Upcoming Activities */}
        <div className="card-padded">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-text flex items-center gap-2">
              <Activity className="w-4 h-4 text-secondary-500" /> Upcoming Activities
            </h2>
            <Link to="/activities" className="text-xs text-primary-600 hover:underline">View all →</Link>
          </div>
          {data?.upcomingActivities?.length > 0 ? (
            data.upcomingActivities.map(a => <ActivityRow key={a._id} a={a} />)
          ) : (
            <p className="text-sm text-text-muted text-center py-8">No upcoming activities</p>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Assessments */}
        {data?.recentAssessments?.length > 0 && (
          <div className="card-padded">
            <h2 className="text-base font-semibold text-text flex items-center gap-2 mb-4">
              <Award className="w-4 h-4 text-accent-500" /> Recent Assessments
            </h2>
            {data.recentAssessments.map((a, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-text">{a.title || a.category}</p>
                  <p className="text-xs text-text-muted capitalize">{a.category}</p>
                </div>
                <span className={`text-sm font-semibold ${a.percentage >= 60 ? 'text-success-600' : 'text-danger-600'}`}>
                  {a.percentage != null ? `${a.percentage}%` : '—'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Recent Notifications */}
        <div className="card-padded">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-text flex items-center gap-2">
              <Bell className="w-4 h-4 text-warning-500" /> Recent Notifications
            </h2>
            <Link to="/notifications" className="text-xs text-primary-600 hover:underline">View all →</Link>
          </div>
          {data?.notifications?.length > 0 ? (
            data.notifications.map((n, i) => (
              <div key={i} className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
                <div className="mt-0.5 flex-shrink-0">{NOTIF_ICON[n.type] || <Bell className="w-4 h-4 text-slate-400" />}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text font-medium">{n.title}</p>
                  <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{n.message}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-text-muted text-center py-8">No notifications yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
