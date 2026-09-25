const XLSX = require('xlsx');
const Student = require('../models/Student');
const User = require('../models/User');

/**
 * Import students from an Excel or CSV file.
 * Accepts user-friendly column headers and maps them to schema fields.
 *
 * @param {string} filePath - Absolute path to the uploaded file
 * @returns {{ created, skipped, errors }}
 */
const importStudentsFromExcel = async (filePath) => {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

  if (rows.length === 0) throw new Error('The spreadsheet is empty or has no data rows');

  let created = 0;
  let skipped = 0;
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // 1-indexed + header row

    try {
      const data = normalizeRow(row);

      const name       = str(data.name);
      const email      = str(data.email).toLowerCase();
      const rollNumber = str(data.rollNumber).toUpperCase();
      const batch      = str(data.batch);
      const department = str(data.department);

      // Collect which required fields are missing for a clear error
      const missing = [];
      if (!name)       missing.push('name (accepted: Student, Full Name)');
      if (!email)      missing.push('email (accepted: Email Address, Mail)');
      if (!rollNumber) missing.push('rollNumber (accepted: Roll No, Roll Number, Reg No)');
      if (!batch)      missing.push('batch (accepted: Year, Academic Year)');
      if (!department) missing.push('department (accepted: Dept, Branch, Course)');

      if (missing.length > 0) {
        errors.push({ row: rowNum, message: `Missing required columns: ${missing.join(' | ')}` });
        skipped++;
        continue;
      }

      // Skip duplicates silently
      const exists = await Student.findOne({ $or: [{ email }, { rollNumber }] });
      if (exists) {
        skipped++;
        continue;
      }

      // Create User account first
      // Use the password column from the sheet; fall back to 'Student@123'
      // if the column is absent (backwards-compatible with old sheets).
      const password = str(data.password) || 'Student@123';
      let user = await User.findOne({ email });
      if (!user) {
        user = await User.create({
          name,
          email,
          password,
          role: 'student',
          phone: str(data.phone) || undefined,
        });
      }

      await Student.create({
        userId:     user._id,
        name,
        email,
        rollNumber,
        batch,
        department,
        semester:   data.semester  ? Number(data.semester)           : undefined,
        section:    data.section   ? str(data.section).toUpperCase() : undefined,
        cgpa:       data.cgpa      ? parseFloat(data.cgpa)           : 0,
        backlogs:   data.backlogs  ? parseInt(data.backlogs)         : 0,
        phone:      str(data.phone) || undefined,
        gender:     data.gender    ? str(data.gender).toLowerCase()  : undefined,
      });

      created++;
    } catch (err) {
      errors.push({ row: rowNum, message: err.message });
      skipped++;
    }
  }

  // Clean up temp file
  const fs = require('fs');
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  return { created, skipped, errors };
};

// ─── Header alias map ─────────────────────────────────────────────────────────
// Keys are the normalised form of every known user-friendly column header
// (all lowercase, all spaces stripped). Values are canonical schema field names.
const HEADER_ALIASES = {
  // ── password ──
  password:           'password',
  temporarypassword:  'password',
  'temporary password': 'password',
  temppassword:       'password',
  'temp password':    'password',
  loginpassword:      'password',
  pass:               'password',

  // ── name ──
  name:               'name',
  student:            'name',
  studentname:        'name',
  fullname:           'name',
  'full name':        'name',
  studentfullname:    'name',
  firstname:          'name',   // will concatenate below if lastname also present

  // ── email ──
  email:              'email',
  emailaddress:       'email',
  'email address':    'email',
  mail:               'email',
  emailid:            'email',

  // ── rollNumber ──
  rollnumber:         'rollNumber',
  roll_number:        'rollNumber',
  rollno:             'rollNumber',
  'roll no':          'rollNumber',
  'roll number':      'rollNumber',
  roll:               'rollNumber',
  regno:              'rollNumber',
  'reg no':           'rollNumber',
  registrationno:     'rollNumber',
  enrollmentno:       'rollNumber',
  'enrollment no':    'rollNumber',
  prn:                'rollNumber',
  uid:                'rollNumber',

  // ── batch ──
  batch:              'batch',
  year:               'batch',
  academicyear:       'batch',
  'academic year':    'batch',
  batchyear:          'batch',
  passoutyear:        'batch',
  admissionyear:      'batch',

  // ── department ──
  department:         'department',
  dept:               'department',
  branch:             'department',
  stream:             'department',
  course:             'department',
  programme:          'department',
  program:            'department',

  // ── semester ──
  semester:           'semester',
  sem:                'semester',
  currentsemester:    'semester',

  // ── section ──
  section:            'section',
  div:                'section',
  division:           'section',
  class:              'section',

  // ── cgpa ──
  cgpa:               'cgpa',
  gpa:                'cgpa',
  grade:              'cgpa',
  aggregate:          'cgpa',
  percentage:         'cgpa',
  marks:              'cgpa',
  score:              'cgpa',

  // ── backlogs ──
  backlogs:           'backlogs',
  backlog:            'backlogs',
  activebacklogs:     'backlogs',
  arrears:            'backlogs',
  ktsscore:           'backlogs',

  // ── phone ──
  phone:              'phone',
  mobile:             'phone',
  contact:            'phone',
  phonenumber:        'phone',
  mobilenumber:       'phone',
  'phone number':     'phone',
  'mobile number':    'phone',
  contactnumber:      'phone',

  // ── gender ──
  gender:             'gender',
  sex:                'gender',
};

/**
 * Normalise a raw Excel row object:
 *   1. Trim + lowercase each header key
 *   2. Also try stripping all whitespace as a second attempt
 *   3. Map through HEADER_ALIASES to the canonical field name
 * Returns an object keyed by canonical schema field names.
 */
const normalizeRow = (obj) => {
  const out = {};
  Object.keys(obj).forEach((rawKey) => {
    const trimmed   = rawKey.trim();
    const lower     = trimmed.toLowerCase();
    const noSpaces  = lower.replace(/\s+/g, '');

    // Try lookup order: exact lower → spaces-stripped → fallback to noSpaces key
    const canonical =
      HEADER_ALIASES[lower] ||
      HEADER_ALIASES[noSpaces] ||
      noSpaces;

    // Don't overwrite an already-mapped field with a worse alias
    if (!(canonical in out)) {
      out[canonical] = obj[rawKey];
    }
  });
  return out;
};

/** Safe string conversion helper */
const str = (v) => (v != null ? String(v).trim() : '');

/**
 * Generate a downloadable Excel template Buffer.
 * The template has user-friendly headers AND a sample row.
 */
const generateImportTemplate = () => {
  const wb = XLSX.utils.book_new();

  const headers = [
    'name', 'email', 'password', 'rollNumber', 'batch', 'department',
    'semester', 'section', 'cgpa', 'backlogs', 'phone', 'gender',
  ];
  const sample = [
    'Alice Smith', 'alice@example.com', 'Temp@12345', 'CS24001', '2024-2028',
    'Computer Science', 1, 'A', 8.5, 0, '9876543210', 'female',
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
  ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 4, 16) }));
  XLSX.utils.book_append_sheet(wb, ws, 'Students');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

module.exports = { importStudentsFromExcel, generateImportTemplate };
