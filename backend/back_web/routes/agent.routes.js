const { Router } = require("express");
const { requireAuth } = require("../middleware/auth");
const { requireWorkspaceMembership } = require("../middleware/tenantScope");

const { callAgent, approveAction, getMessages } = require("../controllers/agent.controller");
const router = Router();



router.get("/:workspaceId/messages", requireAuth, requireWorkspaceMembership, getMessages);
router.post("/:workspaceId/agent/run", requireAuth, requireWorkspaceMembership, callAgent);
router.post("/:workspaceId/agent/approve", requireAuth, requireWorkspaceMembership, approveAction);

module.exports = router;