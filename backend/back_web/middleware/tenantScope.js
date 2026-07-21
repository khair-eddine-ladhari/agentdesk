const Workspace = require("../models/Workspace");

/**
 * Reads :workspaceId from the route params, checks the authenticated user
 * is actually a member of that workspace, and attaches it to req.
 * Every downstream route (documents, agent calls) trusts req.workspaceId
 * instead of trusting the client to send the right one.
 */
async function requireWorkspaceMembership(req, res, next) {
  const { workspaceId } = req.params;
  if (!workspaceId) {
    return res.status(400).json({ error: "workspaceId param is required" });
  }

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    return res.status(404).json({ error: "Workspace not found" });
  }

  const isMember =
    workspace.owner.toString() === req.userId ||
    workspace.members.some((m) => m.toString() === req.userId);

  if (!isMember) {
    return res.status(403).json({ error: "Not a member of this workspace" });
  }

  req.workspaceId = workspaceId;
  next();
}

module.exports = { requireWorkspaceMembership };