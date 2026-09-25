import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Mail, Phone, Pencil, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { facultyApi } from '../../api/faculty.api';
import { getDepartments } from '../../api/academicConfig.api';
import { useAuth } from '../../context/AuthContext';

// ─── Add/Edit Modal ────────────────────────────────────────────────────────────
function FacultyModal({ faculty, onClose, onSaved, departments }) {
  const isEdit = !!faculty;
  const [form, setForm] = useState({
    name: faculty?.name ?? '',
    email: faculty?.email ?? '',
    password: '',
    phone: faculty?.phone ?? '',
    department: faculty?.department ?? (departments[0]?.name ?? ''),
    designation: faculty?.designation ?? '',
    employeeId: faculty?.employeeId ?? '',
    specialization: faculty?.specialization ?? '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Faculty schema: specialization is String, not Array
      const payload = { ...form };
      if (isEdit) {
        await facultyApi.update(faculty._id, payload);
        toast.success('Faculty updated');
      } else {
        await facultyApi.create(payload);
        toast.success('Faculty created');
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
          <h2 className="text-base font-semibold text-text">{isEdit ? 'Edit Faculty' : 'Add Faculty'}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon btn-sm"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Full Name *</label>
              <input className="form-input" required value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Email *</label>
              <input type="email" className="form-input" required value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            {!isEdit && (
              <div>
                <label className="form-label">Password</label>
                <input type="password" className="form-input" placeholder="Default: Faculty@123" value={form.password} onChange={e => set('password', e.target.value)} />
              </div>
            )}
            <div>
              <label className="form-label">Employee ID</label>
              <input className="form-input" value={form.employeeId} onChange={e => set('employeeId', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Department *</label>
              <select className="form-input" value={form.department} onChange={e => set('department', e.target.value)}>
                {departments.length === 0
                  ? <option value="">Loading departments...</option>
                  : departments.map(d => <option key={d._id} value={d.name}>{d.name}</option>)
                }
              </select>
            </div>
            <div>
              <label className="form-label">Designation</label>
              <input className="form-input" placeholder="e.g. Assistant Professor" value={form.designation} onChange={e => set('designation', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Phone</label>
              <input className="form-input" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="form-label">Specializations <span className="text-text-muted font-normal">(comma separated)</span></label>
              <input className="form-input" placeholder="e.g. Data Structures, OS, DBMS" value={form.specialization} onChange={e => set('specialization', e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn btn-outline btn-sm">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary btn-sm">
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Faculty'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function FacultyPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  const [faculty, setFaculty] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null); // null | 'create' | facultyObj

  // API-driven departments (same source of truth as Students and Sessions)
  const [departments, setDepartments] = useState([]);
  useEffect(() => {
    getDepartments(true).then(r => setDepartments(r.data.data || [])).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await facultyApi.getAll({ search, page, limit: 20 });
      setFaculty(res.data.data || []);
      setMeta(res.data.meta || {});
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (f) => {
    if (!confirm(`Delete faculty member "${f.name}"? This cannot be undone.`)) return;
    try {
      await facultyApi.delete(f._id);
      toast.success('Faculty deleted');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="page-content py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text">Faculty</h1>
          <p className="text-sm text-text-muted">{meta.total ?? 0} faculty members</p>
        </div>
        {isAdmin && (
          <button onClick={() => setModal('create')} className="btn btn-primary btn-sm">
            <Plus className="w-4 h-4" /> Add Faculty
          </button>
        )}
      </div>

      <div className="card-padded">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input className="form-input pl-9" placeholder="Search by name, email, department, or employee ID..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card-padded animate-pulse space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-100" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-100 rounded" />
                  <div className="h-3 bg-slate-100 rounded w-3/4" />
                </div>
              </div>
            </div>
          ))
          : faculty.length === 0
            ? <div className="col-span-full empty-state text-text-muted text-sm py-16">No faculty found</div>
            : faculty.map(f => {
              const u = f.userId || {};
              const displayName = f.name || u.name || '—';
              const displayEmail = f.email || u.email || '—';
              const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
              return (
                <div key={f._id} className="card-padded space-y-4 hover:shadow-dropdown transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-secondary-100 flex items-center justify-center text-sm font-bold text-secondary-700">
                        {initials}
                      </div>
                      <div>
                        <p className="font-medium text-text text-sm">{displayName}</p>
                        <p className="text-xs text-text-muted">{f.designation || '—'}</p>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <button onClick={() => setModal(f)} className="btn btn-ghost btn-icon btn-sm" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(f)} className="btn btn-ghost btn-icon btn-sm text-danger-500 hover:bg-danger-50" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5 text-xs text-text-muted">
                    <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" />{displayEmail}</div>
                    {(f.phone || u.phone) && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" />{f.phone || u.phone}</div>}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="badge-muted">{f.department}</span>
                    {f.employeeId && <span className="badge-muted">{f.employeeId}</span>}
                  </div>
                  {f.specialization && (
                    <div className="flex flex-wrap gap-1">
                      <span className="badge-secondary text-xs">{f.specialization}</span>
                    </div>
                  )}
                </div>
              );
            })}
      </div>

      {modal && (
        <FacultyModal
          faculty={modal === 'create' ? null : modal}
          departments={departments}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
