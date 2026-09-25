const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Assessment = require('../models/Assessment');
const Activity = require('../models/Activity');
const { sendSuccess, sendBadRequest } = require('../utils/apiResponse');

// ─── Report Data Helpers ───────────────────────────────────────────────────────

const getStudentReportData = async (filters = {}) => {
  const query = { isArchived: false, ...filters };
  return Student.find(query).select(
    'name email rollNumber batch department semester section cgpa backlogs isPlacementEligible placementStatus'
  );
};

const getAttendanceReportData = async (filters = {}) => {
  const match = {};
  if (filters.session) match.session = filters.session;
  if (filters.student) match.student = filters.student;

  return Attendance.find(match)
    .populate('student', 'name rollNumber batch department')
    .populate('session', 'title category')
    .sort({ date: -1 });
};

const getAssessmentReportData = async (filters = {}) => {
  const match = {};
  if (filters.category) match.category = filters.category;
  if (filters.student) match.student = filters.student;

  return Assessment.find(match)
    .populate('student', 'name rollNumber batch department')
    .populate('session', 'title')
    .sort({ date: -1 });
};

const getWorkshopReportData = async (filters = {}) => {
  const match = {};
  if (filters.startDate || filters.endDate) {
    match.date = {};
    if (filters.startDate) match.date.$gte = new Date(filters.startDate);
    if (filters.endDate)   match.date.$lte = new Date(filters.endDate);
  }
  return Activity.find(match)
    .populate('participants.student', 'name rollNumber batch department')
    .sort({ date: -1 });
};

// ─── Excel Export ─────────────────────────────────────────────────────────────

const HEADER_STYLE = {
  font: { bold: true, color: { argb: 'FFFFFFFF' } },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } },
  alignment: { vertical: 'middle', horizontal: 'center' },
};

const buildStudentSheet = (ws, students) => {
  ws.columns = [
    { header: 'Roll No', key: 'roll', width: 14 },
    { header: 'Name', key: 'name', width: 24 },
    { header: 'Email', key: 'email', width: 28 },
    { header: 'Batch', key: 'batch', width: 12 },
    { header: 'Department', key: 'dept', width: 18 },
    { header: 'Semester', key: 'sem', width: 12 },
    { header: 'CGPA', key: 'cgpa', width: 10 },
    { header: 'Backlogs', key: 'backlogs', width: 12 },
    { header: 'Eligible', key: 'eligible', width: 12 },
    { header: 'Placement Status', key: 'status', width: 18 },
  ];
  ws.getRow(1).eachCell((cell) => Object.assign(cell, HEADER_STYLE));

  students.forEach((s) => {
    ws.addRow({
      roll: s.rollNumber, name: s.name, email: s.email,
      batch: s.batch, dept: s.department, sem: s.semester,
      cgpa: s.cgpa, backlogs: s.backlogs,
      eligible: s.isPlacementEligible ? 'Yes' : 'No',
      status: s.placementStatus,
    });
  });
};

const buildAttendanceSheet = (ws, records) => {
  ws.columns = [
    { header: 'Roll No', key: 'roll', width: 14 },
    { header: 'Name', key: 'name', width: 24 },
    { header: 'Session', key: 'session', width: 28 },
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Remarks', key: 'remarks', width: 20 },
  ];
  ws.getRow(1).eachCell((cell) => Object.assign(cell, HEADER_STYLE));

  records.forEach((r) => {
    ws.addRow({
      roll: r.student?.rollNumber, name: r.student?.name,
      session: r.session?.title, date: r.date?.toISOString().split('T')[0],
      status: r.status, remarks: r.remarks,
    });
  });
};

const buildAssessmentSheet = (ws, records) => {
  ws.columns = [
    { header: 'Roll No', key: 'roll', width: 14 },
    { header: 'Name', key: 'name', width: 24 },
    { header: 'Assessment', key: 'title', width: 28 },
    { header: 'Category', key: 'cat', width: 16 },
    { header: 'Max Marks', key: 'max', width: 12 },
    { header: 'Marks', key: 'marks', width: 10 },
    { header: 'Percentage', key: 'pct', width: 14 },
    { header: 'Remarks', key: 'remarks', width: 20 },
  ];
  ws.getRow(1).eachCell((cell) => Object.assign(cell, HEADER_STYLE));

  records.forEach((r) => {
    ws.addRow({
      roll: r.student?.rollNumber, name: r.student?.name,
      title: r.title, cat: r.category,
      max: r.maxMarks, marks: r.marksObtained, pct: `${r.percentage}%`,
      remarks: r.remarks,
    });
  });
};

const buildWorkshopSheet = (ws, activities) => {
  ws.columns = [
    { header: 'Activity Title', key: 'title', width: 30 },
    { header: 'Type', key: 'type', width: 14 },
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Venue', key: 'venue', width: 20 },
    { header: 'Total Participants', key: 'total', width: 20 },
    { header: 'Attended', key: 'attended', width: 14 },
  ];
  ws.getRow(1).eachCell((cell) => Object.assign(cell, HEADER_STYLE));

  activities.forEach((a) => {
    const participants = a.participants || [];
    ws.addRow({
      title: a.title,
      type: a.type,
      date: a.date ? new Date(a.date).toISOString().split('T')[0] : '',
      venue: a.venue || '',
      total: participants.length,
      attended: participants.filter(p => p.attended).length,
    });
  });
};

// ─── Unified dispatcher — GET /api/reports/export/excel?type=attendance|assessments|eligibility|workshops ──
const exportExcel = async (req, res) => {
  const { type, batch, department, semester, startDate, endDate } = req.query;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Placement Portal';
  let filename = 'report.xlsx';

  if (type === 'attendance') {
    const match = {};
    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = new Date(startDate);
      if (endDate)   match.date.$lte = new Date(endDate);
    }
    let records = await Attendance.find(match)
      .populate({ path: 'student', select: 'name rollNumber batch department semester' })
      .populate('session', 'title date')
      .sort({ date: 1 });

    // Apply student-level filters after populate (same logic as before)
    if (batch)      records = records.filter(r => r.student?.batch === batch);
    if (department) records = records.filter(r => r.student?.department === department);
    if (semester)   records = records.filter(r => String(r.student?.semester) === String(semester));

    filename = 'Attendance_Report.xlsx';

    // ── Helpers ──────────────────────────────────────────────────────────────
    const fmtDate = (d) => {
      if (!d) return '';
      const dt = new Date(d);
      const dd = String(dt.getDate()).padStart(2, '0');
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const yyyy = dt.getFullYear();
      return `${dd}-${mm}-${yyyy}`;
    };

    // Safe Excel sheet name: strip forbidden chars, max 31 chars
    const safeSheetName = (raw) =>
      raw.replace(/[\\\/\?\*\[\]:]/g, ' ').substring(0, 31).trim();

    // ── Group records by session ───────────────────────────────────────────────
    // sessionMap: sessionId → { title, date, records[] }
    const sessionMap = new Map();
    for (const r of records) {
      const sid = String(r.session?._id || r.session || 'unknown');
      if (!sessionMap.has(sid)) {
        sessionMap.set(sid, {
          title: r.session?.title || 'Unknown Session',
          date:  r.session?.date  || r.date,
          records: [],
        });
      }
      sessionMap.get(sid).records.push(r);
    }

    if (records.length === 0) {
      // ── Empty workbook – no matching records ───────────────────────────────
      const wsStu = workbook.addWorksheet('Student Summary');
      wsStu.columns = [{ header: 'Note', key: 'note', width: 60 }];
      wsStu.getRow(1).eachCell(cell => Object.assign(cell, HEADER_STYLE));
      wsStu.addRow({ note: 'No attendance records found for the selected filters.' });

      const wsSess = workbook.addWorksheet('Session Summary');
      wsSess.columns = [{ header: 'Note', key: 'note', width: 60 }];
      wsSess.getRow(1).eachCell(cell => Object.assign(cell, HEADER_STYLE));
      wsSess.addRow({ note: 'No attendance records found for the selected filters.' });

    } else {
      // ── 1. One worksheet per session ───────────────────────────────────────
      const usedNames = new Map(); // safeName → count
      for (const [, sess] of sessionMap) {
        let baseName = safeSheetName(sess.title);
        usedNames.set(baseName, (usedNames.get(baseName) || 0) + 1);
        const count = usedNames.get(baseName);
        const sheetName = count === 1 ? baseName : `${baseName.substring(0, 27)} (${count})`;

        const ws = workbook.addWorksheet(sheetName);
        ws.columns = [
          { header: 'Roll No',  key: 'roll',    width: 16 },
          { header: 'Name',     key: 'name',    width: 26 },
          { header: 'Status',   key: 'status',  width: 12 },
          { header: 'Date',     key: 'date',    width: 14 },
          { header: 'Remarks',  key: 'remarks', width: 24 },
        ];
        ws.getRow(1).eachCell(cell => Object.assign(cell, HEADER_STYLE));

        for (const r of sess.records) {
          const row = ws.addRow({
            roll:    r.student?.rollNumber || '',
            name:    r.student?.name       || '',
            status:  r.status              || '',
            date:    fmtDate(r.date),
            remarks: r.remarks             || '',
          });
          // Colour-code Present / Absent
          const statusCell = row.getCell('status');
          if (r.status === 'present' || r.status === 'Present') {
            statusCell.font = { color: { argb: 'FF16A34A' }, bold: true };
          } else if (r.status === 'absent' || r.status === 'Absent') {
            statusCell.font = { color: { argb: 'FFDC2626' }, bold: true };
          }
        }
      }

      // ── 2. Student Summary sheet ────────────────────────────────────────────
      const studentMap = new Map(); // rollNumber → { name, present, absent }
      for (const r of records) {
        const key = r.student?.rollNumber || String(r.student?._id || 'unknown');
        if (!studentMap.has(key)) {
          studentMap.set(key, { name: r.student?.name || '', present: 0, absent: 0 });
        }
        const s = studentMap.get(key);
        const st = (r.status || '').toLowerCase();
        if (st === 'present') s.present++;
        else s.absent++;
      }

      const wsStu = workbook.addWorksheet('Student Summary');
      wsStu.columns = [
        { header: 'Roll No',        key: 'roll',    width: 16 },
        { header: 'Name',           key: 'name',    width: 26 },
        { header: 'Total Sessions', key: 'total',   width: 16 },
        { header: 'Present',        key: 'present', width: 12 },
        { header: 'Absent',         key: 'absent',  width: 12 },
        { header: 'Attendance %',   key: 'pct',     width: 16 },
      ];
      wsStu.getRow(1).eachCell(cell => Object.assign(cell, HEADER_STYLE));

      for (const [roll, stu] of studentMap) {
        const total = stu.present + stu.absent;
        const pct   = total > 0 ? ((stu.present / total) * 100).toFixed(2) + '%' : '0%';
        const row = wsStu.addRow({
          roll, name: stu.name, total, present: stu.present, absent: stu.absent, pct,
        });
        // Highlight low attendance
        if (total > 0 && (stu.present / total) < 0.75) {
          row.getCell('pct').font = { color: { argb: 'FFDC2626' }, bold: true };
        } else {
          row.getCell('pct').font = { color: { argb: 'FF16A34A' }, bold: true };
        }
      }

      // ── 3. Session Summary sheet ────────────────────────────────────────────
      const wsSess = workbook.addWorksheet('Session Summary');
      wsSess.columns = [
        { header: 'Session',          key: 'session', width: 30 },
        { header: 'Date',             key: 'date',    width: 14 },
        { header: 'Total Students',   key: 'total',   width: 16 },
        { header: 'Present',          key: 'present', width: 12 },
        { header: 'Absent',           key: 'absent',  width: 12 },
        { header: 'Attendance %',     key: 'pct',     width: 16 },
      ];
      wsSess.getRow(1).eachCell(cell => Object.assign(cell, HEADER_STYLE));

      for (const [, sess] of sessionMap) {
        const total   = sess.records.length;
        const present = sess.records.filter(r => (r.status || '').toLowerCase() === 'present').length;
        const absent  = total - present;
        const pct     = total > 0 ? ((present / total) * 100).toFixed(2) + '%' : '0%';
        wsSess.addRow({
          session: sess.title,
          date:    fmtDate(sess.date),
          total, present, absent, pct,
        });
      }
    }

  } else if (type === 'assessments') {
    let records = await Assessment.find({})
      .populate({ path: 'student', select: 'name rollNumber batch department semester' })
      .populate('session', 'title')
      .sort({ date: 1 });

    if (batch)      records = records.filter(r => r.student?.batch === batch);
    if (department) records = records.filter(r => r.student?.department === department);
    if (semester)   records = records.filter(r => String(r.student?.semester) === String(semester));
    if (startDate)  records = records.filter(r => !r.date || new Date(r.date) >= new Date(startDate));
    if (endDate)    records = records.filter(r => !r.date || new Date(r.date) <= new Date(endDate));

    filename = 'Assessment_Report.xlsx';

    // ── Date formatter (reuse same fmtDate pattern) ────────────────────────
    const fmtDate = (d) => {
      if (!d) return '';
      const dt = new Date(d);
      return `${String(dt.getDate()).padStart(2,'0')}-${String(dt.getMonth()+1).padStart(2,'0')}-${dt.getFullYear()}`;
    };
    const safeSheet = (raw) => (raw || 'Unknown').replace(/[\\\/\?\*\[\]:]/g,' ').substring(0,31).trim();

    if (records.length === 0) {
      const ws = workbook.addWorksheet('Assessment Summary');
      ws.columns = [{ header: 'Note', key: 'note', width: 60 }];
      ws.getRow(1).eachCell(cell => Object.assign(cell, HEADER_STYLE));
      ws.addRow({ note: 'No assessment records found for the selected filters.' });

    } else {
      // Group by assessment title (each unique title = one sheet)
      const titleMap = new Map(); // title → records[]
      for (const r of records) {
        const key = r.title || 'Untitled';
        if (!titleMap.has(key)) titleMap.set(key, []);
        titleMap.get(key).push(r);
      }

      // ── 1. One sheet per assessment title ────────────────────────────────
      const usedNames = new Map();
      for (const [title, recs] of titleMap) {
        let base = safeSheet(title);
        usedNames.set(base, (usedNames.get(base) || 0) + 1);
        const n = usedNames.get(base);
        const sheetName = n === 1 ? base : `${base.substring(0,27)} (${n})`;

        const ws = workbook.addWorksheet(sheetName);
        ws.columns = [
          { header: 'Roll No',    key: 'roll',    width: 16 },
          { header: 'Name',       key: 'name',    width: 26 },
          { header: 'Category',   key: 'cat',     width: 16 },
          { header: 'Date',       key: 'date',    width: 14 },
          { header: 'Max Marks',  key: 'max',     width: 12 },
          { header: 'Marks',      key: 'marks',   width: 10 },
          { header: 'Percentage', key: 'pct',     width: 14 },
          { header: 'Grade',      key: 'grade',   width: 10 },
          { header: 'Remarks',    key: 'remarks', width: 24 },
        ];
        ws.getRow(1).eachCell(cell => Object.assign(cell, HEADER_STYLE));

        for (const r of recs) {
          const row = ws.addRow({
            roll:    r.student?.rollNumber || '',
            name:    r.student?.name       || '',
            cat:     r.category            || '',
            date:    fmtDate(r.date),
            max:     r.maxMarks,
            marks:   r.marksObtained,
            pct:     r.percentage != null ? `${r.percentage}%` : '',
            grade:   r.grade               || '',
            remarks: r.remarks             || '',
          });
          // Colour by percentage using existing stored value
          if (r.percentage != null) {
            const pctCell = row.getCell('pct');
            pctCell.font = { bold: true, color: { argb: r.percentage >= 50 ? 'FF16A34A' : 'FFDC2626' } };
          }
        }
      }

      // ── 2. Student Summary — avg % per student across all assessments ────
      const stuMap = new Map(); // rollNumber → { name, totalPct, count }
      for (const r of records) {
        const key = r.student?.rollNumber || String(r.student?._id || 'unknown');
        if (!stuMap.has(key)) stuMap.set(key, { name: r.student?.name || '', totalPct: 0, count: 0 });
        const s = stuMap.get(key);
        s.totalPct += (r.percentage || 0);
        s.count    += 1;
      }

      const wsStu = workbook.addWorksheet('Student Summary');
      wsStu.columns = [
        { header: 'Roll No',          key: 'roll',   width: 16 },
        { header: 'Name',             key: 'name',   width: 26 },
        { header: 'Assessments Taken',key: 'count',  width: 20 },
        { header: 'Avg Percentage',   key: 'avg',    width: 18 },
      ];
      wsStu.getRow(1).eachCell(cell => Object.assign(cell, HEADER_STYLE));
      for (const [roll, s] of stuMap) {
        const avg = s.count > 0 ? (s.totalPct / s.count).toFixed(2) + '%' : '0%';
        const row = wsStu.addRow({ roll, name: s.name, count: s.count, avg });
        row.getCell('avg').font = {
          bold: true,
          color: { argb: s.count > 0 && (s.totalPct / s.count) >= 50 ? 'FF16A34A' : 'FFDC2626' },
        };
      }

      // ── 3. Assessment Summary — per-title class avg ────────────────────────
      const wsSum = workbook.addWorksheet('Assessment Summary');
      wsSum.columns = [
        { header: 'Assessment',       key: 'title',    width: 30 },
        { header: 'Category',         key: 'cat',      width: 16 },
        { header: 'Total Students',   key: 'total',    width: 16 },
        { header: 'Class Avg %',      key: 'avg',      width: 14 },
        { header: 'Highest %',        key: 'highest',  width: 14 },
        { header: 'Lowest %',         key: 'lowest',   width: 14 },
      ];
      wsSum.getRow(1).eachCell(cell => Object.assign(cell, HEADER_STYLE));
      for (const [title, recs] of titleMap) {
        const pcts   = recs.map(r => r.percentage || 0);
        const avg    = pcts.length > 0 ? (pcts.reduce((a,b)=>a+b,0)/pcts.length).toFixed(2)+'%' : '0%';
        const highest= pcts.length > 0 ? Math.max(...pcts).toFixed(2)+'%' : '0%';
        const lowest = pcts.length > 0 ? Math.min(...pcts).toFixed(2)+'%' : '0%';
        wsSum.addRow({
          title,
          cat:     recs[0]?.category || '',
          total:   recs.length,
          avg, highest, lowest,
        });
      }
    }

  } else if (type === 'eligibility') {
    const filter = { isArchived: false };
    if (batch)      filter.batch = batch;
    if (department) filter.department = department;
    if (semester)   filter.semester = Number(semester);

    const students = await Student.find(filter).select(
      'name email rollNumber batch department semester cgpa backlogs isPlacementEligible placementStatus eligibilityReasons'
    );

    filename = 'Eligibility_Report.xlsx';

    const eligColDef = [
      { header: 'Roll No',    key: 'roll',     width: 16 },
      { header: 'Name',       key: 'name',     width: 26 },
      { header: 'Batch',      key: 'batch',    width: 12 },
      { header: 'Department', key: 'dept',     width: 20 },
      { header: 'Semester',   key: 'sem',      width: 12 },
      { header: 'CGPA',       key: 'cgpa',     width: 10 },
      { header: 'Backlogs',   key: 'backlogs', width: 12 },
      { header: 'Eligible',   key: 'eligible', width: 12 },
      { header: 'Status',     key: 'status',   width: 20 },
      { header: 'Reasons (if not eligible)', key: 'reasons', width: 50 },
    ];

    const addStudentsToSheet = (ws, rows) => {
      ws.columns = eligColDef;
      ws.getRow(1).eachCell(cell => Object.assign(cell, HEADER_STYLE));
      for (const s of rows) {
        const row = ws.addRow({
          roll:     s.rollNumber,
          name:     s.name,
          batch:    s.batch,
          dept:     s.department,
          sem:      s.semester,
          cgpa:     s.cgpa,
          backlogs: s.backlogs,
          eligible: s.isPlacementEligible ? 'Yes' : 'No',
          status:   s.placementStatus,
          reasons:  (s.eligibilityReasons || []).join('; '),
        });
        row.getCell('eligible').font = {
          bold: true,
          color: { argb: s.isPlacementEligible ? 'FF16A34A' : 'FFDC2626' },
        };
      }
    };

    if (students.length === 0) {
      const ws = workbook.addWorksheet('Student Eligibility');
      ws.columns = [{ header: 'Note', key: 'note', width: 60 }];
      ws.getRow(1).eachCell(cell => Object.assign(cell, HEADER_STYLE));
      ws.addRow({ note: 'No students found for the selected filters.' });
    } else {
      const eligible   = students.filter(s =>  s.isPlacementEligible);
      const ineligible = students.filter(s => !s.isPlacementEligible);

      // ── Sheet 1: All Students ──────────────────────────────────────────────
      const wsAll = workbook.addWorksheet('All Students');
      addStudentsToSheet(wsAll, students);

      // ── Sheet 2: Eligible Students ────────────────────────────────────────
      const wsElig = workbook.addWorksheet('Eligible Students');
      if (eligible.length > 0) {
        addStudentsToSheet(wsElig, eligible);
      } else {
        wsElig.columns = [{ header: 'Note', key: 'note', width: 60 }];
        wsElig.getRow(1).eachCell(cell => Object.assign(cell, HEADER_STYLE));
        wsElig.addRow({ note: 'No eligible students in this filter.' });
      }

      // ── Sheet 3: Ineligible Students ──────────────────────────────────────
      const wsInelig = workbook.addWorksheet('Ineligible Students');
      if (ineligible.length > 0) {
        addStudentsToSheet(wsInelig, ineligible);
      } else {
        wsInelig.columns = [{ header: 'Note', key: 'note', width: 60 }];
        wsInelig.getRow(1).eachCell(cell => Object.assign(cell, HEADER_STYLE));
        wsInelig.addRow({ note: 'All students in this filter are eligible.' });
      }
    }

  } else if (type === 'workshops') {
    const activities = await getWorkshopReportData({ startDate, endDate });

    filename = 'Workshop_Report.xlsx';

    const fmtDate = (d) => {
      if (!d) return '';
      const dt = new Date(d);
      return `${String(dt.getDate()).padStart(2,'0')}-${String(dt.getMonth()+1).padStart(2,'0')}-${dt.getFullYear()}`;
    };
    const safeSheet = (raw) => (raw || 'Unknown').replace(/[\\\/\?\*\[\]:]/g,' ').substring(0,31).trim();

    if (activities.length === 0) {
      const ws = workbook.addWorksheet('Workshop Summary');
      ws.columns = [{ header: 'Note', key: 'note', width: 60 }];
      ws.getRow(1).eachCell(cell => Object.assign(cell, HEADER_STYLE));
      ws.addRow({ note: 'No workshop/activity records found for the selected filters.' });

    } else {
      // ── 1. One sheet per activity ──────────────────────────────────────────
      const usedNames = new Map();
      // studentParticipation: rollNumber → { name, activitiesAttended }
      const studentParticipation = new Map();

      for (const activity of activities) {
        let base = safeSheet(activity.title);
        usedNames.set(base, (usedNames.get(base) || 0) + 1);
        const n = usedNames.get(base);
        const sheetName = n === 1 ? base : `${base.substring(0,27)} (${n})`;

        const ws = workbook.addWorksheet(sheetName);
        ws.columns = [
          { header: 'Roll No',    key: 'roll',    width: 16 },
          { header: 'Name',       key: 'name',    width: 26 },
          { header: 'Attended',   key: 'attended',width: 12 },
          { header: 'Registered', key: 'regDate', width: 16 },
          { header: 'Certificate',key: 'cert',    width: 30 },
        ];
        ws.getRow(1).eachCell(cell => Object.assign(cell, HEADER_STYLE));

        const participants = activity.participants || [];
        for (const p of participants) {
          const stu = p.student;
          if (!stu) continue;

          // Track for Student Summary
          const roll = stu.rollNumber || String(stu._id);
          if (!studentParticipation.has(roll)) {
            studentParticipation.set(roll, { name: stu.name || '', attended: 0, total: 0 });
          }
          const sp = studentParticipation.get(roll);
          sp.total    += 1;
          if (p.attended) sp.attended += 1;

          const row = ws.addRow({
            roll:     stu.rollNumber || '',
            name:     stu.name       || '',
            attended: p.attended ? 'Yes' : 'No',
            regDate:  fmtDate(p.registeredAt),
            cert:     p.certificateUrl || '',
          });
          row.getCell('attended').font = {
            bold: true,
            color: { argb: p.attended ? 'FF16A34A' : 'FFDC2626' },
          };
        }

        if (participants.length === 0) {
          ws.addRow({ roll: '', name: 'No participants registered for this activity.', attended: '', regDate: '', cert: '' });
        }
      }

      // ── 2. Student Summary ─────────────────────────────────────────────────
      const wsStu = workbook.addWorksheet('Student Summary');
      wsStu.columns = [
        { header: 'Roll No',           key: 'roll',     width: 16 },
        { header: 'Name',              key: 'name',     width: 26 },
        { header: 'Total Activities',  key: 'total',    width: 18 },
        { header: 'Attended',          key: 'attended', width: 12 },
        { header: 'Not Attended',      key: 'missed',   width: 14 },
        { header: 'Attendance %',      key: 'pct',      width: 16 },
      ];
      wsStu.getRow(1).eachCell(cell => Object.assign(cell, HEADER_STYLE));
      for (const [roll, sp] of studentParticipation) {
        const pct = sp.total > 0 ? ((sp.attended / sp.total) * 100).toFixed(2) + '%' : '0%';
        const row = wsStu.addRow({
          roll, name: sp.name,
          total: sp.total, attended: sp.attended,
          missed: sp.total - sp.attended, pct,
        });
        row.getCell('pct').font = {
          bold: true,
          color: { argb: sp.total > 0 && (sp.attended/sp.total) >= 0.75 ? 'FF16A34A' : 'FFDC2626' },
        };
      }

      // ── 3. Workshop Summary ────────────────────────────────────────────────
      const wsSum = workbook.addWorksheet('Workshop Summary');
      wsSum.columns = [
        { header: 'Title',          key: 'title',    width: 30 },
        { header: 'Type',           key: 'type',     width: 14 },
        { header: 'Start Date',     key: 'start',    width: 14 },
        { header: 'End Date',       key: 'end',      width: 14 },
        { header: 'Mode',           key: 'mode',     width: 12 },
        { header: 'Status',         key: 'status',   width: 14 },
        { header: 'Venue',          key: 'venue',    width: 20 },
        { header: 'Organizer',      key: 'organizer',width: 22 },
        { header: 'Total Reg.',     key: 'total',    width: 12 },
        { header: 'Attended',       key: 'attended', width: 12 },
        { header: 'Attendance %',   key: 'pct',      width: 16 },
      ];
      wsSum.getRow(1).eachCell(cell => Object.assign(cell, HEADER_STYLE));
      for (const activity of activities) {
        const parts    = activity.participants || [];
        const attended = parts.filter(p => p.attended).length;
        const pct      = parts.length > 0 ? ((attended / parts.length) * 100).toFixed(2) + '%' : '0%';
        wsSum.addRow({
          title:     activity.title,
          type:      activity.type,
          start:     fmtDate(activity.startDate),
          end:       fmtDate(activity.endDate),
          mode:      activity.mode,
          status:    activity.status,
          venue:     activity.venue     || '',
          organizer: activity.organizer || '',
          total:     parts.length,
          attended,
          pct,
        });
      }
    }

  } else {
    return sendBadRequest(res, `Unknown report type: ${type}. Use attendance|assessments|eligibility|workshops`);
  }


  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  await workbook.xlsx.write(res);
  res.end();
};

// ─── Unified PDF dispatcher — GET /api/reports/export/pdf?type=... ─────────────
const exportPdf = async (req, res) => {
  const { type, batch, department, semester, startDate, endDate } = req.query;

  const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=${type}_report.pdf`);
  doc.pipe(res);

  // ── title ──
  doc.fontSize(16).fillColor('#2563EB').text(
    `${type ? type.charAt(0).toUpperCase() + type.slice(1) : ''} Report`,
    { align: 'center' }
  );
  doc.fontSize(10).fillColor('#64748B').text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
  doc.moveDown();

  const drawTable = (headers, colWidths, rows) => {
    let x = 40, y = doc.y;
    doc.fillColor('#2563EB');
    headers.forEach((h, i) => {
      const cx = x + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
      doc.rect(cx, y, colWidths[i], 20).fill();
      doc.fillColor('white').fontSize(8).text(h, cx + 3, y + 5, { width: colWidths[i] - 6, lineBreak: false });
    });
    y += 20;
    rows.forEach((row, idx) => {
      if (y > 520) { doc.addPage({ layout: 'landscape' }); y = 40; }
      const bg = idx % 2 === 0 ? '#F8FAFC' : '#FFFFFF';
      const totalW = colWidths.reduce((a, b) => a + b, 0);
      doc.fillColor(bg).rect(40, y, totalW, 18).fill();
      row.forEach((d, i) => {
        const cx = x + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
        doc.fillColor('#1E293B').fontSize(8).text(String(d ?? ''), cx + 3, y + 4, { width: colWidths[i] - 6, lineBreak: false });
      });
      y += 18;
    });
  };

  if (type === 'attendance') {
    const match = {};
    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = new Date(startDate);
      if (endDate)   match.date.$lte = new Date(endDate);
    }
    let records = await Attendance.find(match)
      .populate({ path: 'student', select: 'name rollNumber batch department semester' })
      .populate('session', 'title')
      .sort({ date: -1 });
    if (batch)      records = records.filter(r => r.student?.batch === batch);
    if (department) records = records.filter(r => r.student?.department === department);
    if (semester)   records = records.filter(r => String(r.student?.semester) === String(semester));

    drawTable(
      ['Roll No', 'Name', 'Session', 'Date', 'Status'],
      [80, 160, 200, 90, 90],
      records.map(r => [
        r.student?.rollNumber, r.student?.name,
        r.session?.title, r.date?.toISOString().split('T')[0], r.status,
      ])
    );

  } else if (type === 'assessments') {
    let records = await Assessment.find({})
      .populate({ path: 'student', select: 'name rollNumber batch department semester' })
      .populate('session', 'title')
      .sort({ date: -1 });
    if (batch)      records = records.filter(r => r.student?.batch === batch);
    if (department) records = records.filter(r => r.student?.department === department);
    if (semester)   records = records.filter(r => String(r.student?.semester) === String(semester));
    if (startDate)  records = records.filter(r => !r.date || new Date(r.date) >= new Date(startDate));
    if (endDate)    records = records.filter(r => !r.date || new Date(r.date) <= new Date(endDate));

    drawTable(
      ['Roll No', 'Name', 'Assessment', 'Category', 'Marks', 'Pct'],
      [70, 140, 170, 100, 70, 70],
      records.map(r => [
        r.student?.rollNumber, r.student?.name,
        r.title, r.category, r.marksObtained, `${r.percentage}%`,
      ])
    );

  } else if (type === 'eligibility') {
    const filter = { isArchived: false };
    if (batch)      filter.batch = batch;
    if (department) filter.department = department;
    if (semester)   filter.semester = Number(semester);
    const students = await Student.find(filter).select(
      'name rollNumber batch department cgpa backlogs isPlacementEligible placementStatus'
    );
    drawTable(
      ['Roll No', 'Name', 'Batch', 'Department', 'CGPA', 'Eligible', 'Status'],
      [70, 140, 80, 120, 55, 65, 90],
      students.map(s => [
        s.rollNumber, s.name, s.batch, s.department,
        s.cgpa, s.isPlacementEligible ? 'Yes' : 'No', s.placementStatus,
      ])
    );

  } else if (type === 'workshops') {
    const activities = await getWorkshopReportData({ startDate, endDate });
    drawTable(
      ['Title', 'Type', 'Date', 'Venue', 'Total', 'Attended'],
      [170, 80, 80, 120, 60, 70],
      activities.map(a => [
        a.title, a.type,
        a.date ? new Date(a.date).toISOString().split('T')[0] : '',
        a.venue || '',
        (a.participants || []).length,
        (a.participants || []).filter(p => p.attended).length,
      ])
    );
  }

  doc.end();
};

// GET /api/reports/students/excel
const exportStudentsExcel = async (req, res) => {
  const filters = {};
  if (req.query.batch) filters.batch = req.query.batch;
  if (req.query.department) filters.department = req.query.department;

  const students = await getStudentReportData(filters);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Placement Portal';
  const ws = workbook.addWorksheet('Students');
  buildStudentSheet(ws, students);

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=students_report.xlsx');
  await workbook.xlsx.write(res);
  res.end();
};

// GET /api/reports/attendance/excel
const exportAttendanceExcel = async (req, res) => {
  const records = await getAttendanceReportData(req.query);
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Attendance');
  buildAttendanceSheet(ws, records);

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=attendance_report.xlsx');
  await workbook.xlsx.write(res);
  res.end();
};

// GET /api/reports/assessments/excel
const exportAssessmentsExcel = async (req, res) => {
  const records = await getAssessmentReportData(req.query);
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Assessments');
  buildAssessmentSheet(ws, records);

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=assessments_report.xlsx');
  await workbook.xlsx.write(res);
  res.end();
};

// GET /api/reports/eligibility/excel
const exportEligibilityExcel = async (req, res) => {
  const students = await getStudentReportData(req.query);
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Eligibility');

  ws.columns = [
    { header: 'Roll No', key: 'roll', width: 14 },
    { header: 'Name', key: 'name', width: 24 },
    { header: 'Batch', key: 'batch', width: 12 },
    { header: 'Department', key: 'dept', width: 18 },
    { header: 'Eligible', key: 'eligible', width: 12 },
    { header: 'Status', key: 'status', width: 18 },
    { header: 'Reasons (if not eligible)', key: 'reasons', width: 50 },
  ];
  ws.getRow(1).eachCell((cell) => Object.assign(cell, HEADER_STYLE));

  students.forEach((s) => {
    const row = ws.addRow({
      roll: s.rollNumber, name: s.name, batch: s.batch,
      dept: s.department,
      eligible: s.isPlacementEligible ? 'Yes' : 'No',
      status: s.placementStatus,
      reasons: (s.eligibilityReasons || []).join('; '),
    });
    if (!s.isPlacementEligible) {
      row.getCell('eligible').font = { color: { argb: 'FFEF4444' } };
    } else {
      row.getCell('eligible').font = { color: { argb: 'FF22C55E' } };
    }
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=eligibility_report.xlsx');
  await workbook.xlsx.write(res);
  res.end();
};

// GET /api/reports/students/pdf
const exportStudentsPDF = async (req, res) => {
  const students = await getStudentReportData(req.query);
  const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=students_report.pdf');
  doc.pipe(res);

  doc.fontSize(16).fillColor('#2563EB').text('Student Report', { align: 'center' });
  doc.fontSize(10).fillColor('#64748B').text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
  doc.moveDown();

  const headers = ['Roll No', 'Name', 'Batch', 'Dept', 'CGPA', 'Eligible'];
  const colWidths = [80, 150, 70, 100, 60, 60];
  let x = 40, y = doc.y;

  doc.fillColor('#2563EB');
  headers.forEach((h, i) => {
    doc.rect(x + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y, colWidths[i], 20).fill();
    doc.fillColor('white').fontSize(9).text(h, x + colWidths.slice(0, i).reduce((a, b) => a + b, 0) + 4, y + 5, { width: colWidths[i] - 8 });
  });

  y += 20;
  students.forEach((s, idx) => {
    if (y > 520) { doc.addPage({ layout: 'landscape' }); y = 40; }
    const bg = idx % 2 === 0 ? '#F8FAFC' : '#FFFFFF';
    const rowData = [s.rollNumber, s.name, s.batch, s.department, s.cgpa, s.isPlacementEligible ? 'Yes' : 'No'];
    doc.fillColor(bg).rect(40, y, colWidths.reduce((a, b) => a + b, 0), 18).fill();
    rowData.forEach((d, i) => {
      doc.fillColor('#1E293B').fontSize(8).text(
        String(d || ''),
        x + colWidths.slice(0, i).reduce((a, b) => a + b, 0) + 4,
        y + 4,
        { width: colWidths[i] - 8 }
      );
    });
    y += 18;
  });

  doc.end();
};

// GET /api/reports/summary
const getReportSummary = async (req, res) => {
  const [totalStudents, eligible, totalSessions] = await Promise.all([
    Student.countDocuments({ isArchived: false }),
    Student.countDocuments({ isPlacementEligible: true, isArchived: false }),
    Attendance.countDocuments(),
  ]);
  return sendSuccess(res, { totalStudents, eligible, totalSessions });
};

module.exports = {
  exportExcel, exportPdf,
  exportStudentsExcel, exportAttendanceExcel, exportAssessmentsExcel,
  exportEligibilityExcel, exportStudentsPDF, getReportSummary,
};
