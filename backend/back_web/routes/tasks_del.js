const { Router } = require("express");
const { requireAuth } = require("../middleware/auth");
const { requireWorkspaceMembership } = require("../middleware/tenantScope");

const { getTasks, deleteTask } = require("../controllers/task.controller");
const router = Router();

router.get("/:workspaceId/tasks", requireAuth, requireWorkspaceMembership, getTasks);

router.delete(
  "/:workspaceId/tasks/:taskId",
  requireAuth,
  requireWorkspaceMembership,
  deleteTask
);

module.exports = router;