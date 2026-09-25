import { useState, useEffect, useCallback } from 'react';
import { Upload, Search, Eye, CheckCircle2, XCircle, Clock, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { resumeApi } from '../../api/resume.api';
import { useAuth } from '../../context/AuthContext';

const STATUS_BADGE = {
  pending: 'badge-warning',
  reviewed: 'badge-muted',
  approved: 'badge-success',
  rejected: 'badge-danger',
};

export default function ResumePage() {
  const { user, hasRole } = useAuth();
  const isStudent = hasRole('student');
  const canReview = hasRole('admin', 'faculty');
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', status: '', page: 1 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await resumeApi.getAll(filters);
      setResumes(res.data.data || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await resumeApi.upload(user._id, file);
      toast.success('Resume uploaded');
      load();
    } catch (err) {
      toast.error(err.message);
    }
    e.target.value = '';
  };

  const handleReview = async (id, reviewStatus) => {
    const reviewNotes = reviewStatus === 'rejected' ? prompt('Enter feedback for rejection:') : undefined;
    try {
      await resumeApi.review(id, { reviewStatus, reviewNotes });
      toast.success(`Resume ${reviewStatus}`);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="page-content py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text">Resume Review</h1>
          <p className="text-sm text-text-muted">Upload and review student resumes</p>
        </div>
        {isStudent && (
          <label className="btn btn-primary btn-sm cursor-pointer">
            <Upload className="w-4 h-4" /> Upload Resume
            <input type="file" accept=".pdf" className="hidden" onChange={handleUpload} />
          </label>
        )}
      </div>

      {!isStudent && (
        <div className="card-padded">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input className="form-input pl-9" placeholder="Search by student name..."
                value={filters.search}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
            </div>
            <select className="form-input w-auto" value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
              <option value="">All Status</option>
              {['pending', 'reviewed', 'approved', 'rejected'].map(s => (
                <option key={s} value={s} className="capitalize">{s}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Student</th>
              <th>File</th>
              <th>Version</th>
              <th>Status</th>
              <th>Reviewed By</th>
              <th>Feedback</th>
              <th>Uploaded</th>
              {canReview && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                  <td key={j}><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                ))}</tr>
              ))
              : resumes.length === 0
                ? <tr><td colSpan={8}><div className="empty-state py-10 text-sm text-text-muted"><FileText className="w-10 h-10 mb-3 opacity-20" /><p>No resumes found</p></div></td></tr>
                : resumes.map(r => (
                  <tr key={r._id}>
                    <td className="font-medium">{r.student?.userId?.name ?? '—'}</td>
                    <td>
                      <a href={r.fileUrl} target="_blank" rel="noreferrer"
                        className="text-primary-600 hover:underline flex items-center gap-1.5 text-sm">
                        <Eye className="w-3.5 h-3.5" /> {r.fileName}
                      </a>
                    </td>
                    <td className="text-center">v{r.version}</td>
                    <td><span className={`badge ${STATUS_BADGE[r.reviewStatus] || 'badge-muted'} capitalize`}>{r.reviewStatus || 'pending'}</span></td>
                    <td className="text-sm text-text-muted">{r.reviewedBy?.name ?? '—'}</td>
                    <td className="text-sm text-text-muted max-w-xs truncate">{r.reviewNotes || '—'}</td>
                    <td className="text-sm text-text-muted">{new Date(r.createdAt).toLocaleDateString()}</td>
                    {canReview && (
                      <td>
                        <div className="flex gap-1">
                          <button onClick={() => handleReview(r._id, 'approved')}
                            className="btn btn-ghost btn-icon btn-sm text-success-600 hover:bg-success-50" title="Approve">
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleReview(r._id, 'rejected')}
                            className="btn btn-ghost btn-icon btn-sm text-danger-500 hover:bg-danger-50" title="Reject">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
