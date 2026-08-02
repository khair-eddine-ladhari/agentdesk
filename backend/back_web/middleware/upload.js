const multer = require("multer");
const path = require("path");
const fs = require("fs");

const UPLOAD_DIR = path.join(__dirname, "../../uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Extension AND MIME type must both match — checking only one is spoofable
// (e.g. renaming malware.exe to malware.pdf passes an extension-only check).
const ALLOWED_TYPES = {
  ".txt": ["text/plain"],
  ".md": ["text/markdown", "text/plain"], // some browsers send .md as text/plain
  ".pdf": ["application/pdf"],
  ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    // Filename is fully generated — the original filename is never used
    // beyond its extension, so there's no path traversal or injection risk.
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname).toLowerCase()}`);
  },
});

function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedMimes = ALLOWED_TYPES[ext];

  if (!allowedMimes) {
    return cb(new Error(`UNSUPPORTED_EXTENSION:${ext}`));
  }

  if (!allowedMimes.includes(file.mimetype)) {
    return cb(new Error(`MIME_MISMATCH:${file.mimetype}`));
  }

  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB cap
    files: 1, // one file per request, matching your sequential upload flow
  },
});

module.exports = { upload };