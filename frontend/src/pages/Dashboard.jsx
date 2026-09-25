import { useEffect, useState } from 'react';
import { Users, CalendarCheck, Award, BookOpen, TrendingUp, Clock, CheckCircle2, AlertCircle, Activity } from 'lucide-react';
import { dashboardApi } from '../api/dashboard.api';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import StudentDashboard from './dashboard/StudentDashboard';
import FacultyDashboard from './dashboard/FacultyDashboard';

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, icon: Icon, color }) => (
  <div className="stat-card">
    <div className={`stat-icon ${color}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <p className="text-2xl font-bold text-text">{value ?? '—'}</p>
      <p className="text-sm font-medium text-text mt-0.5">{label}</p>
      {sub && <p className="text-xs text-text-muted mt-0.5">{sub}</p>}
    </div>
  </div>
);

// ─── Activity Item ─────────────────────────────────────────────────────────────
const ActivityItem = ({ item }) => {
  const icons = {
    student: <Users className="w-4 h-4 text-primary-600" />,
    session: <BookOpen className="w-4 h-4 text-secondary-500" />,
    attendance: <CalendarCheck className="w-4 h-4 text-success-500" />,
    assessment: <Award className="w-4 h-4 text-accent-500" />,
  };
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        {icons[item.type] || <Activity className="w-4 h-4 text-slate-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text">{item.message}</p>
        <p className="text-xs text-text-muted mt-0.5">{item.time}</p>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const { hasRole } = useAuth();

  // Students and Faculty get their own dedicated dashboards
  if (hasRole('student')) return <StudentDashboard />;
  if (hasRole('faculty')) return <FacultyDashboard />;

  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, c, f] = await Promise.all([
          dashboardApi.getStats(),
          dashboardApi.getCharts(),
          dashboardApi.getActivityFeed(),
        ]);
        setStats(s.data.data);
        setCharts(c.data.data);
        setFeed(f.data.data || []);
      } catch {
        // Stats will show — on API error
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="page-content py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="stat-card animate-pulse">
              <div className="w-11 h-11 rounded-lg bg-slate-100" />
              <div className="space-y-2">
                <div className="h-6 w-16 bg-slate-100 rounded" />
                <div className="h-4 w-24 bg-slate-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Students',
      value: stats?.totalStudents,
      sub: `${stats?.placementEligible ?? 0} placement eligible`,
      icon: Users,
      color: 'bg-primary-50 text-primary-600',
    },
    {
      label: 'Avg Attendance',
      value: stats?.overallAttendancePct != null ? `${stats.overallAttendancePct}%` : '—',
      sub: 'Across all sessions',
      icon: CalendarCheck,
      color: 'bg-success-50 text-success-600',
    },
    {
      label: 'Placement Eligible',
      value: stats?.placementEligible,
      sub: `of ${stats?.totalStudents ?? 0} students`,
      icon: Award,
      color: 'bg-secondary-50 text-secondary-600',
    },
    {
      label: 'Upcoming Sessions',
      value: stats?.upcomingSessions,
      sub: `${stats?.totalSessions ?? 0} total`,
      icon: BookOpen,
      color: 'bg-accent-50 text-accent-600',
    },
    {
      label: 'Avg Assessment Score',
      value: stats?.avgAssessmentScore != null ? `${stats.avgAssessmentScore}%` : '—',
      sub: 'All assessments',
      icon: TrendingUp,
      color: 'bg-slate-100 text-slate-600',
    },
  ];

  return (
    <div className="page-content py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-text">Dashboard</h1>
        <p className="text-sm text-text-muted mt-0.5">Welcome back — here's what's happening.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {statCards.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Charts + Feed */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Attendance Trend */}
        <div className="xl:col-span-2 card-padded">
          <h2 className="text-base font-semibold text-text mb-4">Attendance Trend</h2>
          {charts?.attendanceTrend?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={charts.attendanceTrend}>
                <defs>
                  <linearGradient id="attendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} domain={[0, 100]} unit="%" />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13 }}
                  formatter={(v) => [`${v}%`, 'Attendance']}
                />
                <Area type="monotone" dataKey="percentage" stroke="#2563EB" strokeWidth={2}
                  fill="url(#attendGrad)" dot={{ r: 3, fill: '#2563EB' }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-text-muted text-sm">
              No attendance data yet
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="card-padded">
          <h2 className="text-base font-semibold text-text mb-4">Recent Activity</h2>
          {feed.length > 0 ? (
            <div className="divide-y divide-border">
              {feed.slice(0, 8).map((item, i) => <ActivityItem key={i} item={item} />)}
            </div>
          ) : (
            <div className="empty-state text-text-muted text-sm">
              <Clock className="w-10 h-10 mb-3 opacity-30" />
              <p>No recent activity</p>
            </div>
          )}
        </div>
      </div>

      {/* Assessment Bar Chart */}
      {charts?.assessmentTrend?.length > 0 && (
        <div className="card-padded">
          <h2 className="text-base font-semibold text-text mb-4">Assessment Scores by Category</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={charts.assessmentTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="type" tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} tickLine={false} domain={[0, 100]} unit="%" />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13 }}
                formatter={(v) => [`${v}%`, 'Avg Score']}
              />
              <Bar dataKey="avgScore" fill="#14B8A6" radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
