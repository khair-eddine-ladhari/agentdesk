const { Router } = require("express");
const { requireAuth } = require("../middleware/auth");
const { requireWorkspaceMembership } = require("../middleware/tenantScope");
const { callAgent } = require("../controllers/agent.controller");

const router = Router();

// e.g. POST /api/workspaces/:workspaceId/agent/run
router.post("/:workspaceId/agent/run", requireAuth, requireWorkspaceMembership, callAgent);

module.exports = router;