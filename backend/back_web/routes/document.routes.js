const { Router } = require("express");
const multer = require("multer");
const { requireAuth } = require("../middleware/auth");
const { requireWorkspaceMembership } = require("../middleware/tenantScope");
const { upload } = require("../middleware/upload");

const { uploadDocument, listDocuments, structureDocument } = require("../controllers/document.controller");

const router = Router();

router.use(requireAuth);

router.post("/:workspaceId/documents/:docId/structure", requireWorkspaceMembership, structureDocument);

// Wraps Multer manually instead of using upload.single("file") directly as
// middleware, so fileFilter/size-limit errors get a clean JSON response
// instead of falling through to Express's default error handler.
function handleUpload(req, res, next) {
  upload.single("file")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "File is too large. Max size is 10MB." });
      }
      return res.status(400).json({ error: "Upload failed." });
    }
    if (err) {
      if (err.message.startsWith("UNSUPPORTED_EXTENSION")) {
        return res.status(400).json({ error: "Unsupported file type. Allowed: TXT, MD, PDF, DOCX." });
      }
      if (err.message.startsWith("MIME_MISMATCH")) {
        return res.status(400).json({ error: "File content doesn't match its extension." });
      }
      return res.status(400).json({ error: "Upload failed." });
    }
    next();
  });
}

// e.g. POST /api/workspaces/:workspaceId/documents
router.post("/:workspaceId/documents", requireWorkspaceMembership, handleUpload, uploadDocument);
router.get("/:workspaceId/documents", requireWorkspaceMembership, listDocuments);

module.exports = router;