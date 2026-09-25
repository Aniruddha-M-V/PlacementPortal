import { useState, useEffect } from 'react';
import { Shield, Database, Save, BookOpen, Plus, Pencil, Check, X, ToggleLeft, ToggleRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { usersApi } from '../../api/users.api';
import { academicConfigApi } from '../../api/academicConfig.api';

// ─── Academic Config Section ────────────────────────────────────────────────────
function AcademicSection({ type, label }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');

  const load = () => {
    setLoading(true);
    academicConfigApi.getAll({ type })
      .then(r => setItems(r.data.data || []))
      .catch(() => toast.error(`Failed to load ${label}s`))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [type]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      await academicConfigApi.create({ type, name: newName.trim() });
      toast.success(`${label} added`);
      setNewName(''); setAdding(false); load();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const handleEdit = async (id) => {
    if (!editName.trim()) return;
    try {
      await academicConfigApi.update(id, { name: editName.trim() });
      toast.success(`${label} updated`);
      setEditId(null); load();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  const handleToggle = async (id, current) => {
    try {
      await academicConfigApi.toggle(id);
      toast.success(`${label} ${current ? 'deactivated' : 'activated'}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text">{label}s</h3>
        {!adding && (
          <button onClick={() => setAdding(true)} className="btn btn-outline btn-sm">
            <Plus className="w-3 h-3" /> Add {label}
          </button>
        )}
      </div>

      {adding && (
        <div className="flex gap-2">
          <input
            autoFocus
            className="form-input flex-1"
            placeholder={`${label} name`}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setAdding(false); setNewName(''); } }}
          />
          <button onClick={handleAdd} className="btn btn-primary btn-sm"><Check className="w-4 h-4" /></button>
          <button onClick={() => { setAdding(false); setNewName(''); }} className="btn btn-outline btn-sm"><X className="w-4 h-4" /></button>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-9 bg-slate-100 rounded animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-text-muted py-2">No {label.toLowerCase()}s configured yet.</p>
      ) : (
        <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
          {items.map(item => (
            <div key={item._id} className="flex items-center gap-3 px-3 py-2.5 bg-white">
              {editId === item._id ? (
                <>
                  <input
                    autoFocus
                    className="form-input flex-1 py-1 text-sm"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleEdit(item._id); if (e.key === 'Escape') setEditId(null); }}
                  />
                  <button onClick={() => handleEdit(item._id)} className="btn btn-primary btn-icon btn-sm"><Check className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setEditId(null)} className="btn btn-ghost btn-icon btn-sm"><X className="w-3.5 h-3.5" /></button>
                </>
              ) : (
                <>
                  <span className={`flex-1 text-sm ${item.isActive ? 'text-text' : 'text-text-muted line-through'}`}>
                    {item.name}
                  </span>
                  {item.isActive
                    ? <span className="badge-success text-xs">Active</span>
                    : <span className="badge-muted text-xs">Inactive</span>
                  }
                  <button
                    onClick={() => { setEditId(item._id); setEditName(item.name); }}
                    className="btn btn-ghost btn-icon btn-sm" title="Rename"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleToggle(item._id, item.isActive)}
                    className="btn btn-ghost btn-icon btn-sm"
                    title={item.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {item.isActive
                      ? <ToggleRight className="w-4 h-4 text-success-600" />
                      : <ToggleLeft className="w-4 h-4 text-text-muted" />
                    }
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  const [eligibilityRules, setEligibilityRules] = useState({
    attendanceMin: 75,
    aptitudeMin: 60,
    technicalMin: 60,
    softSkillsMin: 60,
  });

  const saveRules = () => {
    toast.success('Settings saved (frontend only — connect backend to persist)');
  };

  if (!isAdmin) {
    return (
      <div className="page-content py-6">
        <div className="empty-state text-text-muted">
          <Shield className="w-12 h-12 mb-3 opacity-20" />
          <p className="text-sm">Only admins can access settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content py-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-text">Settings</h1>
        <p className="text-sm text-text-muted">System configuration and preferences</p>
      </div>

      {/* Academic Configuration */}
      <div className="card-padded space-y-6">
        <div>
          <h2 className="text-base font-semibold text-text flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary-600" /> Academic Configuration
          </h2>
          <p className="text-sm text-text-muted mt-1">
            Manage departments and batches. These values appear in all student, session, and attendance dropdowns.
            Deactivating an item hides it from new records but does not affect existing data.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AcademicSection type="department" label="Department" />
          <AcademicSection type="batch" label="Batch" />
        </div>
      </div>

      {/* Eligibility Rules */}
      <div className="card-padded space-y-4">
        <h2 className="text-base font-semibold text-text flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary-600" /> Placement Eligibility Rules
        </h2>
        <p className="text-sm text-text-muted">
          Students must meet all thresholds to be marked eligible for placement.
        </p>
        <div className="grid grid-cols-2 gap-4">
          {[
            { key: 'attendanceMin', label: 'Minimum Attendance %' },
            { key: 'aptitudeMin', label: 'Minimum Aptitude Score %' },
            { key: 'technicalMin', label: 'Minimum Technical Score %' },
            { key: 'softSkillsMin', label: 'Minimum Soft Skills Score %' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="form-label">{label}</label>
              <input
                type="number" min={0} max={100}
                className="form-input"
                value={eligibilityRules[key]}
                onChange={e => setEligibilityRules(r => ({ ...r, [key]: Number(e.target.value) }))}
              />
            </div>
          ))}
        </div>
        <button onClick={saveRules} className="btn btn-primary btn-sm">
          <Save className="w-4 h-4" /> Save Rules
        </button>
      </div>

      {/* System Info */}
      <div className="card-padded space-y-4">
        <h2 className="text-base font-semibold text-text flex items-center gap-2">
          <Database className="w-4 h-4 text-secondary-500" /> System Information
        </h2>
        <div className="divide-y divide-border">
          {[
            { label: 'Application', value: 'Training & Placement Portal' },
            { label: 'Version', value: '1.0.0' },
            { label: 'Backend', value: 'Node.js + Express' },
            { label: 'Database', value: 'MongoDB' },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between py-2.5">
              <span className="text-sm text-text-muted">{label}</span>
              <span className="text-sm font-medium text-text">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
