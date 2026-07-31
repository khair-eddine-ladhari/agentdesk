const { Router } = require("express");
const { requireAuth } = require("../middleware/auth");
const { requireWorkspaceMembership } = require("../middleware/tenantScope");

const { listStructuredNotes } = require("../controllers/note.controller");

const router = Router();

router.use(requireAuth);

// GET /api/workspaces/:workspaceId/notes
router.get("/:workspaceId/notes", requireWorkspaceMembership, listStructuredNotes);

module.exports = router;