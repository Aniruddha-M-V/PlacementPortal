import { useState, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { reportsApi } from '../../api/reports.api';
import { getDepartments, getBatches } from '../../api/academicConfig.api';

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

export default function ReportsPage() {
  const [reportType, setReportType] = useState('attendance');
  const [filters, setFilters] = useState({ batch: '', department: '', semester: '', startDate: '', endDate: '' });
  const [exporting, setExporting] = useState('');

  // ── Dynamic Academic Configuration (same source as Settings) ──────────────────
  const [departments, setDepartments] = useState([]);
  const [batches, setBatches] = useState([]);

  useEffect(() => {
    getDepartments(true).then(r => setDepartments(r.data.data || [])).catch(() => {});
    getBatches(true).then(r => setBatches(r.data.data || [])).catch(() => {});
  }, []);

  const handleExport = async (format) => {
    setExporting(format);
    try {
      const params = { type: reportType, ...filters };
      const res = format === 'excel'
        ? await reportsApi.exportExcel(params)
        : await reportsApi.exportPdf(params);
      const ext = format === 'excel' ? 'xlsx' : 'pdf';
      downloadBlob(res.data, `${reportType}-report.${ext}`);
      toast.success(`${format.toUpperCase()} exported`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setExporting('');
    }
  };

  return (
    <div className="page-content py-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-text">Reports</h1>
        <p className="text-sm text-text-muted">Generate and export placement reports</p>
      </div>

      {/* Report Type Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {['attendance', 'assessments', 'eligibility', 'workshops'].map(t => (
          <button
            key={t}
            onClick={() => setReportType(t)}
            className={`card p-4 text-left capitalize text-sm font-medium transition-all ${reportType === t ? 'border-primary-500 bg-primary-50 text-primary-700' : 'text-text hover:bg-slate-50'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card-padded space-y-4">
        <h2 className="text-sm font-semibold text-text flex items-center gap-2">
          <Filter className="w-4 h-4" /> Filter Options
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <div>
            <label className="form-label">Batch</label>
            <select className="form-input" value={filters.batch}
              onChange={e => setFilters(f => ({ ...f, batch: e.target.value }))}>
              <option value="">All Batches</option>
              {batches.map(b => (
                <option key={b._id} value={b.name}>{b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Department</label>
            <select className="form-input" value={filters.department}
              onChange={e => setFilters(f => ({ ...f, department: e.target.value }))}>
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d._id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Semester</label>
            <select className="form-input" value={filters.semester}
              onChange={e => setFilters(f => ({ ...f, semester: e.target.value }))}>
              <option value="">All Semesters</option>
              {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">From Date</label>
            <input type="date" className="form-input" value={filters.startDate}
              onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))} />
          </div>
          <div>
            <label className="form-label">To Date</label>
            <input type="date" className="form-input" value={filters.endDate}
              onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))} />
          </div>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => handleExport('excel')}
          disabled={exporting === 'excel'}
          className="btn btn-primary"
        >
          <FileSpreadsheet className="w-4 h-4" />
          {exporting === 'excel' ? 'Exporting...' : 'Export as Excel'}
        </button>
        <button
          onClick={() => handleExport('pdf')}
          disabled={exporting === 'pdf'}
          className="btn btn-outline"
        >
          <FileText className="w-4 h-4" />
          {exporting === 'pdf' ? 'Exporting...' : 'Export as PDF'}
        </button>
      </div>

      <div className="card-padded text-center py-16 text-text-muted">
        <Download className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p className="text-sm">Select filters above and click Export to download the report</p>
        <p className="text-xs mt-1">Reports include all records matching the selected criteria</p>
      </div>
    </div>
  );
}
