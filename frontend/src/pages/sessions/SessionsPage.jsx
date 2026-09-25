import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Eye, Pencil, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { sessionsApi } from '../../api/sessions.api';
import { facultyApi }  from '../../api/faculty.api';
import { getDepartments, getBatches } from '../../api/academicConfig.api';
import { computeStatus } from '../../utils/eventStatus';
import { useAuth } from '../../context/AuthContext';

const STATUS_BADGE = {
  upcoming: 'badge-primary', ongoing: 'badge-secondary',
  completed: 'badge-success', cancelled: 'badge-danger',
};

// ─── Create / Edit Modal (Admin only) ──────────────────────────────────────────
function SessionModal({ session, onClose, onSaved, departments, batches, facultyList }) {
  const isEdit = !!session;
  const [form, setForm] = useState({
    title:       session?.title ?? '',
    category:    session?.category ?? 'aptitude',
    description: session?.description ?? '',
    startDate:   session?.startDate ? new Date(session.startDate).toISOString().slice(0, 10) : '',
    startTime:   session?.startTime && session.startTime !== '00:00' ? session.startTime : '',
    endDate:     session?.endDate   ? new Date(session.endDate).toISOString().slice(0, 10) : '',
    endTime:     session?.endTime   && session.endTime   !== '23:59' ? session.endTime   : '',
    venue:       session?.venue ?? '',
    mode:        session?.mode ?? 'offline',
    batch:       session?.batch ?? '',
    department:  session?.department ?? '',
    status:      session?.status === 'cancelled' ? 'cancelled' : 'upcoming',
    // Faculty assignment: store Faculty._id (ObjectId), empty string means "no assignment"
    faculty:     session?.faculty?._id ?? session?.faculty ?? '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ── Auto-calculate total hours from the 4 datetime fields ──────────────────
  const computedHours = useMemo(() => {
    if (!form.startDate || !form.startTime || !form.endDate || !form.endTime) return null;
    const [sy, sm, sd] = form.startDate.split('-').map(Number);
    const [sh, smi]    = form.startTime.split(':').map(Number);
    const [ey, em, ed] = form.endDate.split('-').map(Number);
    const [eh, emi]    = form.endTime.split(':').map(Number);
    const start = new Date(sy, sm - 1, sd, sh, smi).getTime();
    const end   = new Date(ey, em - 1, ed, eh, emi).getTime();
    if (end <= start) return null;
    return parseFloat(((end - start) / 3_600_000).toFixed(2));
  }, [form.startDate, form.startTime, form.endDate, form.endTime]);

  const durationLabel = useMemo(() => {
    if (computedHours === null) return '—';
    const totalMins = Math.round(computedHours * 60);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }, [computedHours]);

  const toLocalDt = (date, time) => {
    if (!date || !time) return null;
    const [y, m, d] = date.split('-').map(Number);
    const [h, mi] = time.split(':').map(Number);
    return new Date(y, m - 1, d, h, mi);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const startDt = toLocalDt(form.startDate, form.startTime);
    const endDt   = toLocalDt(form.endDate,   form.endTime);
    if (!startDt || !endDt) { toast.error('Please fill in all date and time fields.'); return; }
    if (endDt <= startDt)   { toast.error('End date/time must be after Start date/time.'); return; }

    setSaving(true);
    try {
      // Send faculty as ObjectId string, or null/undefined if cleared
      const payload = {
        ...form,
        totalHours: computedHours ?? 0,
        faculty: form.faculty || null,
      };
      if (isEdit) {
        await sessionsApi.update(session._id, payload);
        toast.success('Session updated');
      } else {
        await sessionsApi.create(payload);
        toast.success('Session created');
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
          <h2 className="text-base font-semibold text-text">{isEdit ? 'Edit Session' : 'New Training Session'}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon btn-sm"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="form-label">Title *</label>
            <input className="form-input" required value={form.title} onChange={e => set('title', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Category *</label>
              <select className="form-input" value={form.category} onChange={e => set('category', e.target.value)}>
                {['aptitude', 'technical', 'softSkills', 'coding', 'mock'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Mode</label>
              <select className="form-input" value={form.mode} onChange={e => set('mode', e.target.value)}>
                {['offline', 'online', 'hybrid'].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>

            {/* ── Start datetime ─────────────────────────────────── */}
            <div className="col-span-2">
              <p className="form-label mb-1.5">Start *</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Date</label>
                  <input type="date" className="form-input" required
                    value={form.startDate} onChange={e => set('startDate', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Time</label>
                  <input type="time" className="form-input" required
                    value={form.startTime} onChange={e => set('startTime', e.target.value)} />
                </div>
              </div>
            </div>

            {/* ── End datetime ───────────────────────────────────── */}
            <div className="col-span-2">
              <p className="form-label mb-1.5">End *</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Date</label>
                  <input type="date" className="form-input" required
                    value={form.endDate} onChange={e => set('endDate', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Time</label>
                  <input type="time" className="form-input" required
                    value={form.endTime} onChange={e => set('endTime', e.target.value)} />
                </div>
              </div>
            </div>

            {/* ── Auto-calculated duration ────────────────────── */}
            <div className="col-span-2">
              <label className="form-label">Duration <span className="text-xs font-normal text-text-muted">(auto-calculated)</span></label>
              <div className={`form-input flex items-center gap-2 cursor-not-allowed select-none ${
                computedHours === null ? 'text-text-muted bg-slate-50' : 'text-text bg-slate-50'
              }`}>
                <span className="text-base font-semibold">{durationLabel}</span>
                {computedHours !== null && (
                  <span className="text-xs text-text-muted">({computedHours} hours)</span>
                )}
              </div>
              <p className="text-xs text-text-muted mt-1">Calculated automatically from Start and End date/time.</p>
            </div>

            <div>
              <label className="form-label">Status</label>
              <select className="form-input" value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="upcoming">Auto (Upcoming / Ongoing / Completed)</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <p className="text-xs text-text-muted mt-1">Status is set automatically from date/time. Choose Cancelled to override.</p>
            </div>
            <div>
              <label className="form-label">Venue</label>
              <input className="form-input" value={form.venue} onChange={e => set('venue', e.target.value)} />
            </div>

            {/* ── Assign Faculty ─────────────────────────────────── */}
            <div className="col-span-2">
              <label className="form-label">Assigned Faculty <span className="text-xs font-normal text-text-muted">(optional)</span></label>
              <select
                id="session-faculty-select"
                className="form-input"
                value={form.faculty}
                onChange={e => set('faculty', e.target.value)}
              >
                <option value="">— No faculty assigned —</option>
                {facultyList.map(f => (
                  <option key={f._id} value={f._id}>
                    {f.name}{f.department ? ` (${f.department})` : ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-text-muted mt-1">
                The assigned faculty can mark attendance for this session while it is ongoing.
              </p>
            </div>

            <div>
              <label className="form-label">Target Batch</label>
              {batches.length > 0
                ? (
                  <select className="form-input" value={form.batch} onChange={e => set('batch', e.target.value)}>
                    <option value="">All Batches</option>
                    {batches.map(b => <option key={b._id} value={b.name}>{b.name}</option>)}
                  </select>
                )
                : <input className="form-input" placeholder="e.g. 2025-2027" value={form.batch} onChange={e => set('batch', e.target.value)} />
              }
            </div>
            <div className="col-span-2">
              <label className="form-label">Target Department</label>
              <select className="form-input" value={form.department} onChange={e => set('department', e.target.value)}>
                <option value="">All Departments</option>
                {departments.map(d => <option key={d._id} value={d.name}>{d.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="form-label">Description</label>
              <textarea className="form-input" rows={3} value={form.description} onChange={e => set('description', e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn btn-outline btn-sm">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary btn-sm">
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────────
export default function SessionsPage() {
  const { hasRole } = useAuth();
  const isAdmin   = hasRole('admin');
  const isFaculty = hasRole('faculty');

  const [sessions,     setSessions]     = useState([]);
  const [meta,         setMeta]         = useState({});
  const [loading,      setLoading]      = useState(true);
  const [filters,      setFilters]      = useState({ search: '', status: '', page: 1 });
  const [modal,        setModal]        = useState(null);
  const [departments,  setDepartments]  = useState([]);
  const [batches,      setBatches]      = useState([]);
  const [facultyList,  setFacultyList]  = useState([]);

  useEffect(() => {
    getDepartments(true).then(r => setDepartments(r.data.data || [])).catch(() => {});
    getBatches(true).then(r => setBatches(r.data.data || [])).catch(() => {});
    // Admin needs faculty list for the session assignment dropdown
    if (isAdmin) {
      facultyApi.getAll({ limit: 100 })
        .then(r => setFacultyList(r.data.data || []))
        .catch(() => {});
    }
  }, [isAdmin]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Faculty: use getMy() to see only their assigned sessions
      // Admin & Student: use getAll()
      const fetcher = isFaculty ? sessionsApi.getMy : sessionsApi.getAll;
      const res = await fetcher(filters);
      setSessions(res.data.data || []);
      setMeta(res.data.meta || {});
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters, isFaculty]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (s) => {
    if (!confirm(`Delete session "${s.title}"?`)) return;
    try {
      await sessionsApi.delete(s._id);
      toast.success('Session deleted');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const pageTitle = isFaculty ? 'My Assigned Sessions' : 'Training Sessions';
  const emptyMsg  = isFaculty
    ? 'No sessions are assigned to you yet. Ask the Admin to assign you to a session.'
    : 'No sessions found';

  return (
    <div className="page-content py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text">{pageTitle}</h1>
          <p className="text-sm text-text-muted">{meta.total ?? sessions.length} sessions</p>
        </div>
        {isAdmin && (
          <button onClick={() => setModal('create')} className="btn btn-primary btn-sm">
            <Plus className="w-4 h-4" /> New Session
          </button>
        )}
      </div>

      <div className="card-padded">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input className="form-input pl-9" placeholder="Search sessions..."
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))} />
          </div>
          <select className="form-input w-auto" value={filters.status}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))}>
            <option value="">All Status</option>
            {['upcoming', 'ongoing', 'completed', 'cancelled'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Title</th><th>Category</th><th>Start Date</th>
              <th>End Date</th><th>Hours</th><th>Mode</th>
              {isAdmin && <th>Faculty</th>}
              <th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: isAdmin ? 9 : 8 }).map((_, j) => (
                  <td key={j}><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                ))}</tr>
              ))
              : sessions.length === 0
                ? <tr><td colSpan={isAdmin ? 9 : 8}><div className="empty-state py-12 text-sm text-text-muted">{emptyMsg}</div></td></tr>
                : sessions.map(s => (
                  <tr key={s._id}>
                    <td className="font-medium">{s.title}</td>
                    <td><span className="badge-muted capitalize">{s.category}</span></td>
                    <td className="text-sm">{s.startDate ? new Date(s.startDate).toLocaleDateString() : '—'}</td>
                    <td className="text-sm">{s.endDate   ? new Date(s.endDate).toLocaleDateString()   : '—'}</td>
                    <td className="text-sm">{s.totalHours ?? 0}h</td>
                    <td className="text-sm capitalize">{s.mode}</td>
                    {isAdmin && (
                      <td className="text-sm text-text-muted">
                        {s.faculty?.name || <span className="text-xs text-slate-400 italic">Unassigned</span>}
                      </td>
                    )}
                    <td>
                      <span className={`badge ${STATUS_BADGE[computeStatus(s.startDate, s.startTime, s.endDate, s.endTime, s.status)] || 'badge-muted'} capitalize`}>
                        {computeStatus(s.startDate, s.startTime, s.endDate, s.endTime, s.status)}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Link to={`/sessions/${s._id}`} className="btn btn-ghost btn-icon btn-sm" title="View">
                          <Eye className="w-4 h-4" />
                        </Link>
                        {isAdmin && (
                          <>
                            <button onClick={() => setModal(s)} className="btn btn-ghost btn-icon btn-sm" title="Edit">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(s)} className="btn btn-ghost btn-icon btn-sm text-danger-500 hover:bg-danger-50" title="Delete">
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

      {meta.totalPages > 1 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-text-muted">Page {meta.page} of {meta.totalPages}</p>
          <div className="flex gap-2">
            <button disabled={filters.page <= 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))} className="btn btn-outline btn-sm">Previous</button>
            <button disabled={filters.page >= meta.totalPages} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))} className="btn btn-outline btn-sm">Next</button>
          </div>
        </div>
      )}

      {modal && (
        <SessionModal
          session={modal === 'create' ? null : modal}
          departments={departments}
          batches={batches}
          facultyList={facultyList}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
