import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Upload, Archive, RotateCcw, Eye, Pencil, X, Download, FileWarning, Trash2, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { studentsApi } from '../../api/students.api';
import { getDepartments, getBatches } from '../../api/academicConfig.api';
import { useAuth } from '../../context/AuthContext';

// Dynamic badge cycling for department colours
const BADGE_CYCLE = ['badge-primary', 'badge-secondary', 'badge-warning', 'badge-muted', 'badge-success'];
const deptBadge = (() => {
  const cache = {}; let i = 0;
  return (dept) => { if (!cache[dept]) cache[dept] = BADGE_CYCLE[i++ % BADGE_CYCLE.length]; return cache[dept]; };
})();

const StatusBadge = ({ isArchived }) =>
  isArchived
    ? <span className="badge-muted">Archived</span>
    : <span className="badge-success">Active</span>;

// ─── Confirm Delete Dialog ─────────────────────────────────────────────────────
function ConfirmDeleteDialog({ student, onCancel, onConfirm, deleting }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-modal w-full max-w-sm p-6 space-y-4">
        {/* Icon + title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-danger-50 flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-5 h-5 text-danger-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-text">Delete Student?</h2>
            <p className="text-xs text-text-muted mt-0.5">This action cannot be undone.</p>
          </div>
        </div>

        {/* Body */}
        <p className="text-sm text-text">
          You are about to permanently delete{' '}
          <span className="font-semibold">{student.name}</span>{' '}({student.rollNumber}).
          All associated attendance, assessment, and resume records will also be removed.
        </p>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="btn btn-outline btn-sm"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="btn btn-sm bg-danger-600 hover:bg-danger-700 text-white border-transparent"
          >
            {deleting ? 'Deleting...' : 'Delete Permanently'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Create/Edit Modal ─────────────────────────────────────────────────────────
function StudentModal({ student, onClose, onSaved, departments, batches }) {
  const isEdit = !!student;
  const [form, setForm] = useState({
    name:       student?.name ?? '',
    email:      student?.email ?? '',
    password:   '',  // only used on create; Edit uses Profile › Change Password
    rollNumber: student?.rollNumber ?? '',
    department: student?.department ?? (departments[0]?.name ?? ''),
    batch:      student?.batch ?? '',
    semester:   student?.semester ?? 1,
    section:    student?.section ?? 'A',
    cgpa:       student?.cgpa ?? '',
    backlogs:   student?.backlogs ?? 0,
    phone:      student?.phone ?? '',
  });
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        // Password is NOT sent on edit — use Profile › Change Password instead
        const { password: _pw, ...editPayload } = form;
        await studentsApi.update(student._id, editPayload);
        toast.success('Student updated');
      } else {
        await studentsApi.create(form);
        // Don't re-display the password — admin already knows it; just confirm creation
        toast.success(
          `Account created!\nEmail: ${form.email}\nShare the temporary password you set with the student.`,
          { duration: 8000 }
        );
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-modal w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-base font-semibold text-text">{isEdit ? 'Edit Student' : 'Add Student'}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon btn-sm"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Full Name *</label>
              <input className="form-input" required value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div>
              <label className="form-label">College Email *</label>
              <input
                type="email"
                className="form-input"
                required
                placeholder="student@college.ac.in"
                value={form.email}
                onChange={e => set('email', e.target.value)}
              />
            </div>

            {/* ── Temporary password — only shown when creating a new student ── */}
            {!isEdit && (
              <div className="col-span-2">
                <label className="form-label">
                  Temporary Password *
                  <span className="ml-1 text-xs font-normal text-text-muted">(student uses this to first log in)</span>
                </label>
                <div className="relative">
                  <input
                    id="student-temp-password"
                    type={showPw ? 'text' : 'password'}
                    className="form-input pr-11"
                    required
                    minLength={8}
                    placeholder="Min. 8 characters"
                    value={form.password}
                    onChange={e => set('password', e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                    tabIndex={-1}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-text-muted mt-1">
                  The student will use these credentials to log in and can change the password later from their Profile.
                </p>
              </div>
            )}

            <div>
              <label className="form-label">Roll No *</label>
              <input className="form-input" required value={form.rollNumber} onChange={e => set('rollNumber', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Department *</label>
              <select className="form-input" value={form.department} onChange={e => set('department', e.target.value)}>
                {departments.length === 0
                  ? <option value="">Loading...</option>
                  : departments.map(d => <option key={d._id} value={d.name}>{d.name}</option>)
                }
              </select>
            </div>
            <div>
              <label className="form-label">Batch *</label>
              {batches.length > 0
                ? (
                  <select className="form-input" required value={form.batch} onChange={e => set('batch', e.target.value)}>
                    <option value="">Select batch...</option>
                    {batches.map(b => <option key={b._id} value={b.name}>{b.name}</option>)}
                  </select>
                )
                : <input className="form-input" placeholder="e.g. 2025-2027" required value={form.batch} onChange={e => set('batch', e.target.value)} />
              }
            </div>
            <div>
              <label className="form-label">Semester</label>
              <select className="form-input" value={form.semester} onChange={e => set('semester', Number(e.target.value))}>
                {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Section</label>
              <input className="form-input" value={form.section} onChange={e => set('section', e.target.value)} />
            </div>
            <div>
              <label className="form-label">CGPA</label>
              <input type="number" step="0.01" min="0" max="10" className="form-input" value={form.cgpa} onChange={e => set('cgpa', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Active Backlogs</label>
              <input type="number" min="0" className="form-input" value={form.backlogs} onChange={e => set('backlogs', Number(e.target.value))} />
            </div>
            <div className="col-span-2">
              <label className="form-label">Phone</label>
              <input className="form-input" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn btn-outline btn-sm">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary btn-sm">
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function StudentsPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');

  const [students, setStudents] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', batch: '', department: '', page: 1, limit: 20 });
  const [showArchived, setShowArchived] = useState(false);
  const [modal, setModal] = useState(null); // null | 'create' | studentObj
  const [deleteConfirm, setDeleteConfirm] = useState(null); // null | studentObj
  const [deleting, setDeleting] = useState(false);

  // API-driven departments and batches
  const [departments, setDepartments] = useState([]);
  const [batches, setBatches] = useState([]);

  useEffect(() => {
    getDepartments(true).then(r => setDepartments(r.data.data || [])).catch(() => {});
    getBatches(true).then(r => setBatches(r.data.data || [])).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...filters, archived: showArchived ? 'true' : 'false' };
      const res = await studentsApi.getAll(params);
      setStudents(res.data.data || []);
      setMeta(res.data.meta || {});
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters, showArchived]);

  useEffect(() => { load(); }, [load]);

  const handleArchive = async (student) => {
    try {
      await (student.isArchived ? studentsApi.restore(student._id) : studentsApi.archive(student._id));
      toast.success(student.isArchived ? 'Student restored' : 'Student archived');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await studentsApi.delete(deleteConfirm._id);
      toast.success('Student deleted successfully.');
      setDeleteConfirm(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to delete student.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page-content py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text">Students</h1>
          <p className="text-sm text-text-muted mt-0.5">{meta.total ?? 0} students total</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            {/* Download template */}
            <button
              className="btn btn-ghost btn-sm"
              title="Download import template"
              onClick={async () => {
                try {
                  const res = await studentsApi.downloadTemplate();
                  const url = URL.createObjectURL(new Blob([res.data]));
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'students_import_template.xlsx';
                  a.click();
                  URL.revokeObjectURL(url);
                } catch { toast.error('Failed to download template'); }
              }}
            >
              <Download className="w-4 h-4" /> Template
            </button>

            {/* Import Excel/CSV */}
            <label className="btn btn-outline btn-sm cursor-pointer">
              <Upload className="w-4 h-4" />
              Import
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden"
                onChange={async (e) => {
                  const f = e.target.files[0]; if (!f) return;
                  try {
                    const res = await studentsApi.importExcel(f);
                    const { created = 0, skipped = 0, errors = [] } = res.data.data || {};
                    if (created > 0) {
                      toast.success(`Import complete: ${created} created, ${skipped} skipped`);
                    } else {
                      toast.error(`Import failed: 0 created, ${skipped} skipped.`);
                    }
                    if (errors.length > 0) {
                      // Show first 3 row errors so the user knows exactly what to fix
                      errors.slice(0, 3).forEach(({ row, message }) =>
                        toast.error(`Row ${row}: ${message}`, { duration: 6000 })
                      );
                      if (errors.length > 3) {
                        toast(`…and ${errors.length - 3} more row errors`, { icon: <FileWarning className="w-4 h-4" /> });
                      }
                    }
                    load();
                  } catch (err) { toast.error(err.response?.data?.message || err.message); }
                  e.target.value = '';
                }}
              />
            </label>

            <button onClick={() => setModal('create')} className="btn btn-primary btn-sm">
              <Plus className="w-4 h-4" /> Add Student
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="card-padded">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input className="form-input pl-9" placeholder="Search by name or roll no..."
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))} />
          </div>
          <select className="form-input w-auto" value={filters.batch}
            onChange={e => setFilters(f => ({ ...f, batch: e.target.value, page: 1 }))}>
            <option value="">All Batches</option>
            {batches.map(b => <option key={b._id} value={b.name}>{b.name}</option>)}
          </select>
          <select className="form-input w-auto" value={filters.department}
            onChange={e => setFilters(f => ({ ...f, department: e.target.value, page: 1 }))}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d._id} value={d.name}>{d.name}</option>)}
          </select>
          <button
            onClick={() => setShowArchived(v => !v)}
            className={`btn btn-sm ${showArchived ? 'btn-primary' : 'btn-outline'}`}>
            {showArchived ? 'Hide Archived' : 'Show Archived'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Student</th><th>Roll No</th><th>Department</th>
              <th>Batch</th><th>Semester</th><th>CGPA</th><th>Backlogs</th>
              <th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 9 }).map((_, j) => (
                  <td key={j}><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                ))}</tr>
              ))
            ) : students.length === 0 ? (
              <tr><td colSpan={9}><div className="empty-state py-12 text-text-muted text-sm">No students found</div></td></tr>
            ) : students.map(s => (
              <tr key={s._id}>
                <td>
                  <div>
                    <div className="font-medium text-text">{s.name ?? s.userId?.name ?? '—'}</div>
                    <div className="text-xs text-text-muted">{s.email ?? s.userId?.email ?? '—'}</div>
                  </div>
                </td>
                <td className="font-mono text-xs">{s.rollNumber}</td>
                <td><span className={`badge ${deptBadge(s.department)}`}>{s.department}</span></td>
                <td>{s.batch}</td>
                <td>{s.semester}</td>
                <td>{s.cgpa != null ? Number(s.cgpa).toFixed(2) : '—'}</td>
                <td>
                  {s.backlogs > 0
                    ? <span className="badge-danger">{s.backlogs}</span>
                    : <span className="text-success-600">0</span>}
                </td>
                <td><StatusBadge isArchived={s.isArchived} /></td>
                <td>
                  <div className="flex items-center gap-1">
                    <Link to={`/students/${s._id}`} className="btn btn-ghost btn-icon btn-sm" title="View">
                      <Eye className="w-4 h-4" />
                    </Link>
                    {isAdmin && (
                      <>
                        <button onClick={() => setModal(s)} className="btn btn-ghost btn-icon btn-sm" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleArchive(s)} className="btn btn-ghost btn-icon btn-sm"
                          title={s.isArchived ? 'Restore' : 'Archive'}>
                          {s.isArchived ? <RotateCcw className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(s)}
                          className="btn btn-ghost btn-icon btn-sm text-danger-500 hover:text-danger-700 hover:bg-danger-50"
                          title="Delete permanently"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-muted">Page {meta.page} of {meta.totalPages}</p>
          <div className="flex gap-2">
            <button disabled={filters.page <= 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))} className="btn btn-outline btn-sm">Previous</button>
            <button disabled={filters.page >= meta.totalPages} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))} className="btn btn-outline btn-sm">Next</button>
          </div>
        </div>
      )}

      {/* Edit/Create Modal */}
      {modal && (
        <StudentModal
          student={modal === 'create' ? null : modal}
          departments={departments}
          batches={batches}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <ConfirmDeleteDialog
          student={deleteConfirm}
          deleting={deleting}
          onCancel={() => !deleting && setDeleteConfirm(null)}
          onConfirm={handleDeleteConfirmed}
        />
      )}
    </div>
  );
}
