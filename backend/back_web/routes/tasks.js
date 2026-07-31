const express = require("express");
const router = express.Router();
const Task = require("../models/Task");
const { requireAuth } = require("../middleware/auth");
const { requireWorkspaceMembership } = require("../middleware/tenantScope");

// GET /api/workspaces/:workspaceId/tasks
router.get(
  "/:workspaceId/tasks",
  requireAuth,
  requireWorkspaceMembership,
  async (req, res) => {
    const tasks = await Task.find({ workspace: req.workspaceId }).sort({ createdAt: -1 });
    res.json(tasks);
  }
);

// PATCH /api/workspaces/:workspaceId/tasks/:taskId  body: { status: "open" | "in_progress" | "done" }
router.patch(
  "/:workspaceId/tasks/:taskId",
  requireAuth,
  requireWorkspaceMembership,
  async (req, res) => {
    const { status } = req.body;
    if (!["open", "in_progress", "done"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const task = await Task.findOneAndUpdate(
      { _id: req.params.taskId, workspace: req.workspaceId },
      { status },
      { new: true }
    );
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.json(task);
  }
);

module.exports = router;