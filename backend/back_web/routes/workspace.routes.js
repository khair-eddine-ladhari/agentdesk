const { Router } = require("express");
const { requireAuth } = require("../middleware/auth");
const { requireWorkspaceMembership } = require("../middleware/tenantScope");
const {
  createWorkspace,
  listMyWorkspaces,
  getSettings,
  updateName,
  inviteMember,
  removeMember,
} = require("../controllers/workspace.controller");

const router = Router();

router.use(requireAuth);

// Not scoped to a specific workspace - no requireWorkspaceMembership needed,
// req.userId alone is enough (create doesn't need membership, list only
// returns workspaces this user already belongs to).
router.post("/", createWorkspace);
router.get("/", listMyWorkspaces);

// Scoped to one workspace - requireWorkspaceMembership checks req.userId
// actually belongs to :workspaceId before any of these run.
router.get("/:workspaceId/settings", requireWorkspaceMembership, getSettings);
router.patch("/:workspaceId", requireWorkspaceMembership, updateName);
router.post("/:workspaceId/members", requireWorkspaceMembership, inviteMember);
router.delete("/:workspaceId/members/:userId", requireWorkspaceMembership, removeMember);

module.exports = router;