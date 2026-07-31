const express = require("express");
const router = express.Router();
const Meeting = require("../models/Meeting");
const { requireAuth } = require("../middleware/auth");
const { requireWorkspaceMembership } = require("../middleware/tenantScope");

// GET /api/workspaces/:workspaceId/meetings
router.get(
  "/:workspaceId/meetings",
  requireAuth,
  requireWorkspaceMembership,
  async (req, res) => {
    const meetings = await Meeting.find({ workspace: req.workspaceId }).sort({ createdAt: -1 });
    res.json(meetings);
  }
);

module.exports = router;