import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Users, Calendar, MapPin, Pencil, Trash2, X, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { activitiesApi } from '../../api/activities.api';
import { computeStatus } from '../../utils/eventStatus';
import { useAuth } from '../../context/AuthContext';

// Activity schema enum: workshop | seminar | hackathon | webinar | other
// (No 'guestLecture' — it doesn't exist in the backend enum)
const TYPE_BADGE = {
  workshop: 'badge-primary', seminar: 'badge-secondary',
  hackathon: 'badge-warning', webinar: 'badge-success', other: 'badge-muted',
};

// ─── Modal ─────────────────────────────────────────────────────────────────────
function ActivityModal({ activity, onClose, onSaved }) {
  const isEdit = !!activity;
  const [form, setForm] = useState({
    title: activity?.title ?? '',
    type: activity?.type ?? 'workshop',
    description: activity?.description ?? '',
    startDate: activity?.startDate ? new Date(activity.startDate).toISOString().slice(0, 10) : '',
    startTime: activity?.startTime && activity.startTime !== '00:00' ? activity.startTime : '',
    endDate: activity?.endDate ? new Date(activity.endDate).toISOString().slice(0, 10) : '',
    endTime: activity?.endTime && activity.endTime !== '23:59' ? activity.endTime : '',
    venue: activity?.venue ?? '',
    organizer: activity?.organizer ?? '',
    mode: activity?.mode ?? 'offline',
    maxParticipants: activity?.maxParticipants ?? '',
    status: activity?.status === 'cancelled' ? 'cancelled' : 'upcoming',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ── Auto-calculate duration from the 4 datetime fields ────────────────────
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

  // Build a local Date from date string + time string
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
    if (!startDt || !endDt) {
      toast.error('Please fill in all date and time fields.');
      return;
    }
    if (endDt <= startDt) {
      toast.error('End date/time must be after Start date/time.');
      return;
    }

    setSaving(true);
    try {
      const payload = { ...form, duration: computedHours ?? 0 };
      if (!payload.maxParticipants) delete payload.maxParticipants;

      if (isEdit) {
        await activitiesApi.update(activity._id, payload);
        toast.success('Activity updated');
      } else {
        await activitiesApi.create(payload);
        toast.success('Activity created');
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
          <h2 className="text-base font-semibold text-text">{isEdit ? 'Edit Activity' : 'New Activity'}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon btn-sm"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="form-label">Title *</label>
            <input className="form-input" required value={form.title} onChange={e => set('title', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Type *</label>
              <select className="form-input" value={form.type} onChange={e => set('type', e.target.value)}>
                {['workshop', 'seminar', 'hackathon', 'webinar', 'other'].map(t => <option key={t} value={t}>{t}</option>)}
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

            {/* ── Status override ─────────────────────────────────── */}
            <div className="col-span-2">
              <label className="form-label">Status</label>
              <select className="form-input" value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="upcoming">Auto (Upcoming / Ongoing / Completed)</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <p className="text-xs text-text-muted mt-1">Status is set automatically from date/time. Choose Cancelled to override.</p>
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
              <label className="form-label">Max Participants</label>
              <input type="number" min="1" className="form-input" placeholder="Optional" value={form.maxParticipants} onChange={e => set('maxParticipants', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Venue</label>
              <input className="form-input" value={form.venue} onChange={e => set('venue', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Organizer</label>
              <input className="form-input" value={form.organizer} onChange={e => set('organizer', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="form-label">Description</label>
              <textarea className="form-input" rows={3} value={form.description} onChange={e => set('description', e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn btn-outline btn-sm">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary btn-sm">
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Activity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function ActivitiesPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  const [activities, setActivities] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', type: '', page: 1 });
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await activitiesApi.getAll(filters);
      setActivities(res.data.data || []);
      setMeta(res.data.meta || {});
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (a) => {
    if (!confirm(`Delete activity "${a.title}"?`)) return;
    try {
      await activitiesApi.delete(a._id);
      toast.success('Activity deleted');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="page-content py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text">Activities & Workshops</h1>
          <p className="text-sm text-text-muted">{meta.total ?? 0} activities</p>
        </div>
        {isAdmin && (
          <button onClick={() => setModal('create')} className="btn btn-primary btn-sm">
            <Plus className="w-4 h-4" /> New Activity
          </button>
        )}
      </div>

      <div className="card-padded">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input className="form-input pl-9" placeholder="Search activities..."
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))} />
          </div>
          <select className="form-input w-auto" value={filters.type}
            onChange={e => setFilters(f => ({ ...f, type: e.target.value, page: 1 }))}>
            <option value="">All Types</option>
            {['workshop', 'seminar', 'hackathon', 'webinar', 'other'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card-padded animate-pulse space-y-3">
              <div className="h-5 bg-slate-100 rounded w-3/4" />
              <div className="h-4 bg-slate-100 rounded w-1/2" />
            </div>
          ))
          : activities.length === 0
            ? <div className="col-span-full empty-state text-text-muted text-sm py-16">No activities found</div>
            : activities.map(a => (
              <div key={a._id} className="card-padded space-y-3 hover:shadow-dropdown transition-shadow">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-text text-sm leading-snug">{a.title}</h3>
                  <span className={`badge ${TYPE_BADGE[a.type] || 'badge-muted'} capitalize flex-shrink-0`}>{a.type}</span>
                </div>
                {a.description && <p className="text-xs text-text-muted line-clamp-2">{a.description}</p>}
                <div className="space-y-1.5 text-xs text-text-muted">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(a.startDate).toLocaleDateString()}
                    {a.endDate && a.endDate !== a.startDate && ` – ${new Date(a.endDate).toLocaleDateString()}`}
                  </div>
                  <div className="flex items-center gap-2"><Users className="w-3.5 h-3.5" />{a.participants?.length ?? 0} registered</div>
                  {a.venue && <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" />{a.venue}</div>}
                </div>
                <div className="pt-2 border-t border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted">{a.organizer || '—'} · {a.duration}h · {a.mode}</span>
                    {(() => { const s = computeStatus(a.startDate, a.startTime, a.endDate, a.endTime, a.status); const STYLE = { upcoming:'bg-primary-100 text-primary-700', ongoing:'bg-success-100 text-success-700', completed:'bg-slate-100 text-slate-600', cancelled:'bg-danger-100 text-danger-700' }; return <span className={`text-xs px-1.5 py-0.5 rounded capitalize font-medium ${STYLE[s]||''}`}>{s}</span>; })()}
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <button onClick={() => setModal(a)} className="btn btn-ghost btn-icon btn-sm" title="Edit">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(a)} className="btn btn-ghost btn-icon btn-sm text-danger-500 hover:bg-danger-50" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <Link to={`/activities/${a._id}`} className="btn btn-ghost btn-icon btn-sm" title="View">
                    <Eye className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
      </div>

      {modal && (
        <ActivityModal
          activity={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
