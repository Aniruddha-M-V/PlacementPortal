import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Pencil, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { assessmentsApi } from '../../api/assessments.api';
import { studentsApi } from '../../api/students.api';
import { useAuth } from '../../context/AuthContext';

// Assessment schema enum: aptitude | technical | coding | resume | mock_interview | soft_skills
const CATEGORY_BADGE = {
  aptitude: 'badge-warning', technical: 'badge-primary',
  coding: 'badge-muted', resume: 'badge-secondary',
  mock_interview: 'badge-muted', soft_skills: 'badge-secondary',
};
const CATEGORIES = ['aptitude', 'technical', 'coding', 'resume', 'mock_interview', 'soft_skills'];

const ScoreBar = ({ value }) => (
  <div className="flex items-center gap-2">
    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full ${(value ?? 0) >= 75 ? 'bg-success-500' : (value ?? 0) >= 50 ? 'bg-accent-500' : 'bg-danger-500'}`}
        style={{ width: `${Math.min(100, value ?? 0)}%` }}
      />
    </div>
    <span className="text-xs font-medium text-text-secondary w-8 text-right">{(value ?? 0).toFixed(0)}%</span>
  </div>
);

// ─── Modal ─────────────────────────────────────────────────────────────────────
function AssessmentModal({ assessment, onClose, onSaved }) {
  const isEdit = !!assessment;
  const [form, setForm] = useState({
    title: assessment?.title ?? '',
    // Schema field: category (NOT type)
    category: assessment?.category ?? 'aptitude',
    marksObtained: assessment?.marksObtained ?? '',
    maxMarks: assessment?.maxMarks ?? 100,
    // Schema field: date (NOT assessedAt)
    date: assessment?.date ? new Date(assessment.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    // Schema field: student (NOT studentId)
    student: assessment?.student?._id ?? assessment?.student ?? '',
    remarks: assessment?.remarks ?? '',
  });
  const [students, setStudents] = useState([]);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    studentsApi.getAll({ limit: 200 })
      .then(res => setStudents(res.data.data || []))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.student) return toast.error('Please select a student');
    setSaving(true);
    try {
      if (isEdit) {
        await assessmentsApi.update(assessment._id, form);
        toast.success('Assessment updated');
      } else {
        await assessmentsApi.create(form);
        toast.success('Assessment created');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const pct = form.maxMarks > 0 && form.marksObtained !== ''
    ? ((Number(form.marksObtained) / Number(form.maxMarks)) * 100).toFixed(1)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-modal w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-base font-semibold text-text">{isEdit ? 'Edit Assessment' : 'Add Assessment Score'}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon btn-sm"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {!isEdit && (
            <div>
              <label className="form-label">Student *</label>
              <select className="form-input" required value={form.student} onChange={e => set('student', e.target.value)}>
                <option value="">Select student…</option>
                {students.map(s => (
                  <option key={s._id} value={s._id}>{s.name} ({s.rollNumber})</option>
                ))}
              </select>
              {students.length === 0 && (
                <p className="text-xs text-text-muted mt-1">No students found. Create a student first.</p>
              )}
            </div>
          )}
          <div>
            <label className="form-label">Title *</label>
            <input className="form-input" required placeholder="e.g. Aptitude Round 1" value={form.title} onChange={e => set('title', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Category *</label>
              <select className="form-input" value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Date *</label>
              <input type="date" className="form-input" required value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Marks Obtained *</label>
              <input type="number" min="0" className="form-input" required value={form.marksObtained} onChange={e => set('marksObtained', Number(e.target.value))} />
            </div>
            <div>
              <label className="form-label">Max Marks *</label>
              <input type="number" min="1" className="form-input" required value={form.maxMarks} onChange={e => set('maxMarks', Number(e.target.value))} />
            </div>
            <div className="col-span-2">
              <label className="form-label">Remarks</label>
              <textarea className="form-input" rows={2} value={form.remarks} onChange={e => set('remarks', e.target.value)} />
            </div>
          </div>
          {pct !== null && (
            <p className="text-sm text-text-muted">Score: <span className="font-medium text-text">{pct}%</span></p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn btn-outline btn-sm">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary btn-sm">
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Score'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function AssessmentsPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole('admin', 'faculty');
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ category: '', page: 1, limit: 25 });
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await assessmentsApi.getAll(filters);
      setData(res.data.data || []);
      setMeta(res.data.meta || {});
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this assessment?')) return;
    try {
      await assessmentsApi.delete(id);
      toast.success('Assessment deleted');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="page-content py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text">Assessments</h1>
          <p className="text-sm text-text-muted">{meta.total ?? 0} records</p>
        </div>
        {canEdit && (
          <button onClick={() => setModal('create')} className="btn btn-primary btn-sm">
            <Plus className="w-4 h-4" /> Add Score
          </button>
        )}
      </div>

      <div className="card-padded">
        <select className="form-input w-auto" value={filters.category}
          onChange={e => setFilters(f => ({ ...f, category: e.target.value, page: 1 }))}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
        </select>
      </div>

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Student</th><th>Title</th><th>Category</th>
              <th>Score</th><th>%</th><th>Evaluated By</th><th>Date</th>
              {canEdit && <th></th>}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                  <td key={j}><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                ))}</tr>
              ))
              : data.length === 0
                ? <tr><td colSpan={8}><div className="empty-state py-10 text-sm text-text-muted">No assessments found</div></td></tr>
                : data.map(a => (
                  <tr key={a._id}>
                    <td>
                      {/* populated as 'student' from controller */}
                      <div className="text-sm font-medium">{a.student?.name ?? '—'}</div>
                      <div className="text-xs text-text-muted font-mono">{a.student?.rollNumber}</div>
                    </td>
                    <td>{a.title}</td>
                    <td><span className={`badge ${CATEGORY_BADGE[a.category] || 'badge-muted'} capitalize`}>{a.category?.replace('_', ' ')}</span></td>
                    <td className="font-mono text-sm">{a.marksObtained}/{a.maxMarks}</td>
                    <td><ScoreBar value={a.percentage} /></td>
                    {/* populated as 'evaluatedBy' from controller */}
                    <td className="text-sm text-text-muted">{a.evaluatedBy?.name ?? '—'}</td>
                    <td className="text-sm text-text-muted">{a.date ? new Date(a.date).toLocaleDateString() : '—'}</td>
                    {canEdit && (
                      <td>
                        <div className="flex gap-1">
                          <button onClick={() => setModal(a)} className="btn btn-ghost btn-icon btn-sm" title="Edit">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(a._id)}
                            className="btn btn-ghost btn-icon btn-sm text-danger-500 hover:bg-danger-50">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <AssessmentModal
          assessment={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
