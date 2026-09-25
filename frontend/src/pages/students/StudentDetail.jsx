import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, GraduationCap, Award, CalendarCheck, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { studentsApi } from '../../api/students.api';

const Field = ({ label, value }) => (
  <div>
    <dt className="text-xs text-text-muted font-medium uppercase tracking-wide">{label}</dt>
    <dd className="mt-0.5 text-sm text-text">{value || '—'}</dd>
  </div>
);

export default function StudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const sumRes = await studentsApi.getSummary(id);
        const data = sumRes.data.data;
        setStudent(data.student);
        setSummary(data);
      } catch (err) {
        toast.error(err.response?.data?.message || err.message);
        navigate('/students');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate]);

  if (loading) return (
    <div className="page-content py-6">
      <div className="animate-pulse space-y-4">
        <div className="h-6 w-48 bg-slate-100 rounded" />
        <div className="card-padded space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 bg-slate-100 rounded" />)}
        </div>
      </div>
    </div>
  );

  if (!student) return null;

  // Name/email: the summary endpoint populates student.userId;
  // fall back to student.name/email for students created without User account
  const displayName  = student.userId?.name  || student.name  || '—';
  const displayEmail = student.userId?.email || student.email || '—';

  return (
    <div className="page-content py-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link to="/students" className="btn btn-ghost btn-sm -ml-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <span className="text-text-muted">/</span>
        <span className="text-sm text-text">{displayName}</span>
      </div>

      {/* Profile Header */}
      <div className="card-padded flex items-start gap-6">
        <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-xl font-bold text-primary-700 flex-shrink-0">
          {displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-text">{displayName}</h1>
          <div className="flex flex-wrap gap-3 mt-2 text-sm text-text-muted">
            <span className="flex items-center gap-1"><Mail className="w-4 h-4" />{displayEmail}</span>
            {student.phone && <span className="flex items-center gap-1"><Phone className="w-4 h-4" />{student.phone}</span>}
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="badge-primary">{student.department}</span>
            <span className="badge-muted">Batch {student.batch}</span>
            <span className="badge-muted">Sem {student.semester}</span>
            {student.isArchived && <span className="badge-warning">Archived</span>}
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-padded space-y-4">
          <h2 className="text-base font-semibold text-text flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-primary-600" /> Academic Info
          </h2>
          <dl className="grid grid-cols-2 gap-4">
            <Field label="Roll No" value={student.rollNumber} />
            <Field label="CGPA" value={student.cgpa?.toFixed(2)} />
            <Field label="Backlogs" value={student.backlogs} />
            <Field label="Semester" value={student.semester} />
            <Field label="Batch" value={student.batch} />
            <Field label="Department" value={student.department} />
          </dl>
        </div>

        <div className="card-padded space-y-4">
          <h2 className="text-base font-semibold text-text flex items-center gap-2">
            <Award className="w-4 h-4 text-secondary-500" /> Placement Summary
          </h2>
          {summary ? (
            <dl className="grid grid-cols-2 gap-4">
              <Field label="Attendance %" value={summary.attendancePercent != null ? `${summary.attendancePercent}%` : null} />
              <Field label="Sessions" value={summary.totalSessions} />
              <Field label="Aptitude Avg" value={summary.aptitudeAvg != null ? `${summary.aptitudeAvg}%` : null} />
              <Field label="Technical Avg" value={summary.technicalAvg != null ? `${summary.technicalAvg}%` : null} />
              <Field label="Coding Avg" value={summary.codingAvg != null ? `${summary.codingAvg}%` : null} />
              <Field label="Soft Skills" value={summary.softSkillsAvg != null ? `${summary.softSkillsAvg}%` : null} />
              <Field label="Resume Status" value={summary.resumeStatus} />
              <Field label="Placement" value={summary.placementStatus?.replace('_', ' ')} />
              <Field label="Eligibility" value={summary.isEligible ? '✅ Eligible' : '❌ Not Eligible'} />
            </dl>
          ) : (
            <p className="text-sm text-text-muted">No summary data available</p>
          )}
        </div>
      </div>

      {/* Assessment History */}
      {summary?.assessments?.length > 0 && (
        <div className="card-padded">
          <h2 className="text-base font-semibold text-text mb-4">Recent Assessments</h2>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th><th>Type</th><th>Score</th><th>%</th><th>Date</th>
                </tr>
              </thead>
              <tbody>
                {summary.assessments.slice(0, 10).map(a => (
                  <tr key={a._id}>
                    <td>{a.title}</td>
                    <td><span className="badge-muted capitalize">{a.category}</span></td>
                    <td>{a.marksObtained}/{a.maxMarks}</td>
                    <td>{a.percentage?.toFixed(1)}%</td>
                    <td>{new Date(a.date).toLocaleDateString()}</td>
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
