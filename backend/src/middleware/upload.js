const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ─── Ensure upload directories exist ─────────────────────────────────────────
const UPLOAD_BASE = path.join(__dirname, '../../uploads');
const DIRS = {
  resumes: path.join(UPLOAD_BASE, 'resumes'),
  images: path.join(UPLOAD_BASE, 'images'),
  imports: path.join(UPLOAD_BASE, 'imports'),
};

Object.values(DIRS).forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ─── Storage configurations ───────────────────────────────────────────────────
const resumeStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, DIRS.resumes),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `resume-${unique}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, DIRS.images),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `img-${unique}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const excelStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, DIRS.imports),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `import-${unique}${path.extname(file.originalname).toLowerCase()}`);
  },
});

// ─── File filters ─────────────────────────────────────────────────────────────
const resumeFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) return cb(null, true);
  cb(new Error('Only PDF, DOC, and DOCX files are allowed for resumes.'));
};

const imageFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(new Error('Only JPEG, PNG, and WebP images are allowed.'));
};

const excelFilter = (req, file, cb) => {
  const allowed = ['.xlsx', '.xls', '.csv'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) return cb(null, true);
  cb(new Error('Only Excel (.xlsx, .xls) and CSV files are allowed.'));
};

// ─── Exportable upload middleware ─────────────────────────────────────────────
const uploadResume = multer({
  storage: resumeStorage,
  fileFilter: resumeFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

const uploadImage = multer({
  storage: imageStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
});

const uploadExcel = multer({
  storage: excelStorage,
  fileFilter: excelFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

/**
 * Build a local file URL from the stored filename.
 * NOTE: When Cloudinary is integrated, replace this function
 * with a Cloudinary upload call and return the CDN URL instead.
 * No other code needs to change.
 *
 * @param {string} filename - Stored filename (from req.file.filename)
 * @param {'resumes'|'images'} folder - Sub-folder
 * @returns {string} Accessible URL
 */
const getFileUrl = (filename, folder = 'resumes') => {
  return `/uploads/${folder}/${filename}`;
};

module.exports = { uploadResume, uploadImage, uploadExcel, getFileUrl, DIRS };
