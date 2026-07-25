const { Router } = require("express");
const { requireAuth } = require("../middleware/auth");
const { requireWorkspaceMembership } = require("../middleware/tenantScope");
const { upload } = require("../middleware/upload");

const { uploadDocument, listDocuments, structureDocument } = require("../controllers/document.controller");

const router = Router();

router.use(requireAuth);




router.post("/:workspaceId/documents/:docId/structure", requireWorkspaceMembership, structureDocument);

// e.g. POST /api/workspaces/:workspaceId/documents
router.post("/:workspaceId/documents", requireWorkspaceMembership, upload.single("file"), uploadDocument);
router.get("/:workspaceId/documents", requireWorkspaceMembership, listDocuments);

module.exports = router;