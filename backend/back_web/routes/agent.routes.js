const { Router } = require("express");
const { requireAuth } = require("../middleware/auth");
const { requireWorkspaceMembership } = require("../middleware/tenantScope");
const { callAgent, approveAction } = require("../controllers/agent.controller");

const router = Router();

// e.g. POST /api/workspaces/:workspaceId/agent/run
router.post("/:workspaceId/agent/run", requireAuth, requireWorkspaceMembership, callAgent);

// e.g. POST /api/workspaces/:workspaceId/agent/approve
// Same auth + tenant-scoping gate as /run - this is the ONLY place any
// agent-proposed action actually gets executed and written to Mongo.
router.post("/:workspaceId/agent/approve", requireAuth, requireWorkspaceMembership, approveAction);

module.exports = router;