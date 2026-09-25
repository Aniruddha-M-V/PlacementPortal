import { useState, useEffect, useCallback } from 'react';
import { Search, CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { eligibilityApi } from '../../api/eligibility.api';

// Rule labels matching the service output keys (details object from getById)
const RULES = [
  { key: 'attendance',  label: 'Attendance ≥ 75%',    scoreKey: 'percentage' },
  { key: 'aptitude',    label: 'Aptitude ≥ 60%',       scoreKey: 'best' },
  { key: 'technical',  label: 'Technical ≥ 60%',       scoreKey: 'best' },
  { key: 'softSkills', label: 'Soft Skills ≥ 60%',     scoreKey: 'best' },
  { key: 'resume',     label: 'Resume Uploaded',       scoreKey: null },
  { key: 'backlogs',   label: 'No Active Backlogs',    scoreKey: null },
];

const RuleIcon = ({ pass }) =>
  pass
    ? <CheckCircle2 className="w-4 h-4 text-success-500 flex-shrink-0" />
    : <XCircle className="w-4 h-4 text-danger-500 flex-shrink-0" />;

// Derive pass/fail from details object returned by getById
function rulePass(rule, details) {
  if (!details) return null;
  if (rule.key === 'attendance')  return (details.attendance?.percentage ?? 0) >= 75;
  if (rule.key === 'aptitude')    return (details.aptitude?.best ?? 0) >= 60;
  if (rule.key === 'technical')   return (details.technical?.best ?? 0) >= 60;
  if (rule.key === 'softSkills')  return (details.softSkills?.best ?? 0) >= 60;
  if (rule.key === 'resume')      return details.resume?.uploaded === true;
  if (rule.key === 'backlogs')    return (details.backlogs ?? 1) === 0;
  return null;
}

function ruleScore(rule, details) {
  if (!details) return null;
  if (rule.key === 'attendance')  return details.attendance?.percentage;
  if (rule.key === 'aptitude')    return details.aptitude?.best;
  if (rule.key === 'technical')   return details.technical?.best;
  if (rule.key === 'softSkills')  return details.softSkills?.best;
  if (rule.key === 'resume')      return details.resume?.status;
  if (rule.key === 'backlogs')    return details.backlogs != null ? `${details.backlogs} backlog(s)` : null;
  return null;
}

// ─── Expanded detail row ────────────────────────────────────────────────────────
function EligibilityDetail({ studentId }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    eligibilityApi.getById(studentId)
      .then(r => setDetail(r.data.data))
      .catch(() => toast.error('Failed to load detail'))
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) return <div className="border-t border-border px-4 py-3 text-sm text-text-muted animate-pulse">Loading detail...</div>;
  if (!detail) return null;

  const { details } = detail;

  return (
    <div className="border-t border-border px-4 py-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {RULES.map(rule => {
          const pass = rulePass(rule, details);
          const score = ruleScore(rule, details);
          return (
            <div key={rule.key} className="flex items-center gap-2 text-sm">
              <RuleIcon pass={pass} />
              <span className={pass ? 'text-text' : 'text-danger-600'}>{rule.label}</span>
              {score != null && (
                <span className="text-xs text-text-muted ml-auto">
                  {typeof score === 'number' ? `${score.toFixed(1)}%` : score}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────────
export default function EligibilityPage() {
  const [data, setData]         = useState([]);
  const [meta, setMeta]         = useState({});
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage]         = useState(1);
  const [expanded, setExpanded] = useState(null);
  const [recalcLoading, setRecalcLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Send ?search and ?status — backend now reads both correctly
      const res = await eligibilityApi.getAll({ search, status: filterStatus, page, limit: 25 });
      setData(res.data.data || []);
      setMeta(res.data.meta || {});
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus, page]);

  useEffect(() => { load(); }, [load]);

  // Count from actual API-filtered results
  const eligible = data.filter(d => d.isPlacementEligible).length;

  const handleRecalculate = async () => {
    setRecalcLoading(true);
    try {
      await eligibilityApi.recalculate?.() ?? fetch('/api/eligibility/recalculate', { method: 'POST' });
      toast.success('Eligibility recalculated');
      load();
    } catch {
      toast.error('Recalculation failed');
    } finally {
      setRecalcLoading(false);
    }
  };

  return (
    <div className="page-content py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text">Placement Eligibility</h1>
          <p className="text-sm text-text-muted">
            {eligible} of {data.length} students shown are eligible
          </p>
        </div>
        <button
          onClick={handleRecalculate}
          disabled={recalcLoading}
          className="btn btn-outline btn-sm"
          title="Recalculate all eligibility"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${recalcLoading ? 'animate-spin' : ''}`} />
          Recalculate
        </button>
      </div>

      <div className="card-padded">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input className="form-input pl-9" placeholder="Search by name or roll no..."
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className="form-input w-auto" value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
            <option value="">All Students</option>
            <option value="eligible">Eligible Only</option>
            <option value="ineligible">Ineligible Only</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card-padded animate-pulse h-16" />
          ))
          : data.length === 0
            ? <div className="empty-state py-16 text-text-muted text-sm">
                {filterStatus === 'eligible'
                  ? 'No eligible students found'
                  : filterStatus === 'ineligible'
                    ? 'No ineligible students found'
                    : 'No eligibility data found'}
              </div>
            : data.map(row => {
              const isElig = row.isPlacementEligible;
              const failedCount = row.eligibilityReasons?.length ?? 0;
              const isExpanded = expanded === row._id;
              return (
                <div key={row._id} className="card">
                  <button
                    className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-50 transition-colors rounded-lg"
                    onClick={() => setExpanded(isExpanded ? null : row._id)}
                  >
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <p className="font-medium text-text text-sm">{row.name}</p>
                        <p className="text-xs text-text-muted font-mono">{row.rollNumber}</p>
                      </div>
                      <div className="text-xs text-text-muted">
                        <span>{row.batch}</span> · <span>{row.department}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isElig
                          ? <span className="badge-success flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Eligible</span>
                          : <span className="badge-danger flex items-center gap-1"><XCircle className="w-3 h-3" />Not Eligible</span>}
                        {!isElig && failedCount > 0 && (
                          <span className="text-xs text-danger-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {failedCount} {failedCount === 1 ? 'rule' : 'rules'} failed
                          </span>
                        )}
                      </div>
                    </div>
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-text-muted flex-shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-text-muted flex-shrink-0" />}
                  </button>

                  {isExpanded && <EligibilityDetail studentId={row._id} />}
                </div>
              );
            })}
      </div>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-muted">Page {meta.page} of {meta.totalPages}</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn btn-outline btn-sm">Previous</button>
            <button disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)} className="btn btn-outline btn-sm">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
