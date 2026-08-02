const multer = require("multer");
const path = require("path");

// Extension AND MIME type must both match — checking only one is spoofable
// (e.g. renaming malware.exe to malware.pdf passes an extension-only check).
const ALLOWED_TYPES = {
  ".txt": ["text/plain"],
  ".md": ["text/markdown", "text/plain"], // some browsers send .md as text/plain
  ".pdf": ["application/pdf"],
  ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
};

// Memory storage instead of disk: Cloudinary's upload_stream needs a buffer
// (req.file.buffer), not a path on disk. This also means there's no local
// file to orphan on failure anymore — nothing to fs.unlink().
const storage = multer.memoryStorage();

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