// routes/actions.js
const express = require("express");
const router = express.Router();
const ActionLog = require("../models/ActionLog");
const Task = require("../models/Task");
const Meeting = require("../models/Meeting");
const { requireAuth } = require("../middleware/auth");
const { requireWorkspaceMembership } = require("../middleware/tenantScope");

router.get(
  "/:workspaceId/actions",
  requireAuth,
  requireWorkspaceMembership,
  async (req, res, next) => {
    try {
      const actions = await ActionLog.find({
        workspace: req.workspaceId,
        status: "needs_review",
        requiresApproval: true,
      }).sort({ createdAt: -1 });
      res.json(actions);
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  "/:workspaceId/actions/:actionId",
  requireAuth,
  requireWorkspaceMembership,
  async (req, res, next) => {
    try {
      const { decision } = req.body;
      if (!["approved", "rejected"].includes(decision)) {
        return res.status(400).json({ error: "decision must be 'approved' or 'rejected'" });
      }

      const action = await ActionLog.findOne({
        _id: req.params.actionId,
        workspace: req.workspaceId,
      });
      if (!action) return res.status(404).json({ error: "Action not found" });

      if (decision === "rejected") {
        action.status = "failed";
        action.error = null;
        await action.save();
        return res.json(action);
      }

      action.approvedBy = req.userId;

      try {
        if (action.agentType === "task_agent") {
          const { tasks } = action.toolCalls || {};
          if (!Array.isArray(tasks) || tasks.length === 0) {
            throw new Error("No tasks found on action.toolCalls.tasks");
          }
          await Task.insertMany(
            tasks.map((title) => ({
              title,
              workspace: action.workspace,
              createdBy: req.userId,
              status: "open",
            }))
          );
          action.status = "success";
          action.error = null;
        } else if (action.agentType === "meeting_agent") {
          const { title, attendees, time } = action.toolCalls || {};
          await Meeting.create({
            title: title || action.summary,
            attendees: Array.isArray(attendees) ? attendees : [],
            time: time || null,
            workspace: action.workspace,
            createdBy: req.userId,
          });
          action.status = "success";
          action.error = null;
        } else if (action.agentType === "email_agent") {
          // TODO: hook up real email sending
          action.status = "success";
          action.error = null;
        } else if (action.agentType === "crm_agent") {
          // TODO: hook up real CRM update
          action.status = "success";
          action.error = null;
        } else {
          action.status = "failed";
          action.error = `Unknown agentType: ${action.agentType}`;
        }
      } catch (err) {
        console.error("Action execution failed:", err);
        action.status = "failed";
        action.error = err.message;
      }

      await action.save();

      // Make failure explicit in the HTTP layer so clients that
      // only check res.ok won't be fooled into thinking it worked.
      if (action.status === "failed") {
        return res.status(422).json(action);
      }
      res.json(action);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;