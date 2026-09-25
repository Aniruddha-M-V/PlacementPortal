import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Users, MapPin, Clock, Calendar, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { sessionsApi } from '../../api/sessions.api';
import { attendanceApi } from '../../api/attendance.api';
import { useAuth } from '../../context/AuthContext';
import { computeStatus } from '../../utils/eventStatus';

const STATUS_BADGE = {
  upcoming: 'badge-primary', ongoing: 'badge-secondary',
  completed: 'badge-success', cancelled: 'badge-danger',
};
const ATTEND_BADGE = {
  present: 'badge-success', absent: 'badge-danger',
  late: 'badge-warning', excused: 'badge-muted',
};

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(hhMM) {
  if (!hhMM) return '';
  const [h, m] = hhMM.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export default function SessionDetail() {
  const { id } = useParams();
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin') || hasRole('faculty');

  const [session, setSession] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const sRes = await sessionsApi.getById(id);
        setSession(sRes.data.data);

        // Attendance report is admin/faculty-only; skip for students
        if (isAdmin) {
          try {
            const rRes = await attendanceApi.getSessionReport(id);
            setReport(rRes.data.data);
          } catch {
            // Non-critical — attendance unavailable
          }
        }
      } catch (err) {
        toast.error(err.message || 'Failed to load session details');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isAdmin]);

  if (loading) return (
    <div className="page-content py-6">
      <div className="animate-pulse space-y-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-lg" />)}
      </div>
    </div>
  );

  if (!session) return (
    <div className="page-content py-6">
      <Link to="/sessions" className="btn btn-ghost btn-sm -ml-2 mb-4 inline-flex">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <p className="text-text-muted text-sm">Session not found.</p>
    </div>
  );

  const liveStatus = computeStatus(session.startDate, session.startTime, session.endDate, session.endTime, session.status);
  const records = Array.isArray(report) ? report : (report?.records || []);
  const attended = records.filter(r => r.status === 'present' || r.status === 'late').length;
  const total = records.length;

  return (
    <div className="page-content py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Link to="/sessions" className="btn btn-ghost btn-sm -ml-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
      </div>

      {/* Main Info */}
      <div className="card-padded">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-semibold text-text">{session.title}</h1>
            <div className="flex flex-wrap gap-3 mt-2 text-sm text-text-muted">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(session.startDate)}{session.startTime ? ` · ${formatTime(session.startTime)}` : ''}
              </span>
              {session.endDate && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Ends {formatDate(session.endDate)}{session.endTime ? ` · ${formatTime(session.endTime)}` : ''}
                </span>
              )}
              {session.venue && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{session.venue}</span>}
              {session.meetingLink && (
                <a href={session.meetingLink} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary-600 hover:underline">
                  Join Online
                </a>
              )}
            </div>
          </div>
          <span className={`badge ${STATUS_BADGE[liveStatus] || 'badge-muted'} capitalize`}>{liveStatus}</span>
        </div>
        {session.description && <p className="mt-4 text-sm text-text-muted">{session.description}</p>}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t border-border">
          <div>
            <dt className="text-xs text-text-muted uppercase tracking-wide">Category</dt>
            <dd className="text-sm font-medium mt-0.5 capitalize">{session.category || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-text-muted uppercase tracking-wide">Duration</dt>
            <dd className="text-sm font-medium mt-0.5">{session.totalHours ? `${session.totalHours}h` : '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-text-muted uppercase tracking-wide">Mode</dt>
            <dd className="text-sm font-medium mt-0.5 capitalize">{session.mode || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-text-muted uppercase tracking-wide">Faculty / Trainer</dt>
            <dd className="text-sm font-medium mt-0.5">{session.faculty?.name || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-text-muted uppercase tracking-wide">Target Batch</dt>
            <dd className="text-sm font-medium mt-0.5">{session.targetBatch || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-text-muted uppercase tracking-wide">Department</dt>
            <dd className="text-sm font-medium mt-0.5">{session.targetDepartment || '—'}</dd>
          </div>
        </div>
      </div>

      {/* Attendance — admin/faculty only */}
      {isAdmin && (
        <div className="card-padded space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-text flex items-center gap-2">
              <Users className="w-4 h-4 text-primary-600" /> Attendance
            </h2>
            {total > 0 && (
              <span className="text-sm font-medium text-text-muted">
                {attended}/{total} ({Math.round((attended / total) * 100)}%)
              </span>
            )}
          </div>
          {records.length > 0 ? (
            <div className="table-wrapper">
              <table className="table">
                <thead><tr><th>Student</th><th>Roll No</th><th>Status</th><th>Remarks</th></tr></thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r._id}>
                      <td className="font-medium">{r.studentId?.userId?.name ?? r.student?.name ?? r.studentId?.name ?? '—'}</td>
                      <td className="font-mono text-xs">{r.studentId?.rollNo || r.student?.rollNumber || r.studentId?.rollNumber}</td>
                      <td><span className={`badge ${ATTEND_BADGE[r.status]} capitalize`}>{r.status}</span></td>
                      <td className="text-text-muted">{r.remarks || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-text-muted text-center py-8">No attendance marked for this session</p>
          )}
        </div>
      )}
    </div>
  );
}
