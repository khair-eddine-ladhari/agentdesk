// routes/actions.js
const express = require("express");
const router = express.Router();
const ActionLog = require("../models/ActionLog");
const { requireAuth } = require("../middleware/auth");
const { requireWorkspaceMembership } = require("../middleware/tenantScope");

// GET /api/workspaces/:workspaceId/actions
// Actions waiting on a human: needs_review + requiresApproval
router.get(
  "/:workspaceId/actions",
  requireAuth,
  requireWorkspaceMembership,
  async (req, res) => {
    const actions = await ActionLog.find({
      workspace: req.workspaceId,
      status: "needs_review",
      requiresApproval: true,
    }).sort({ createdAt: -1 });

    res.json(actions);
  }
);

// PATCH /api/workspaces/:workspaceId/actions/:actionId
// body: { decision: "approved" | "rejected" }
router.patch(
  "/:workspaceId/actions/:actionId",
  requireAuth,
  requireWorkspaceMembership,
  async (req, res) => {
    const { decision } = req.body;
    if (!["approved", "rejected"].includes(decision)) {
      return res.status(400).json({ error: "decision must be 'approved' or 'rejected'" });
    }

    const action = await ActionLog.findOne({
      _id: req.params.actionId,
      workspace: req.workspaceId, // ensures the action actually belongs to this workspace
    });
    if (!action) return res.status(404).json({ error: "Action not found" });

    if (decision === "rejected") {
      action.status = "failed";
    } else {
      action.approvedBy = req.userId;
      action.status = "success";
      // TODO: actually execute based on action.agentType + action.toolCalls
      // (send email / create Task / update CRM). Not implemented yet.
    }

    await action.save();
    res.json(action);
  }
);

module.exports = router;