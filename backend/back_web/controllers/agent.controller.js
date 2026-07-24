const ActionLog = require("../models/ActionLog");
const Workspace = require("../models/Workspace");
const Task = require("../models/Task");
// const { sendEmail } = require("../services/email"); // wire in when ready
// const { scheduleMeeting } = require("../services/calendar"); // wire in when ready

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || "http://localhost:8000";

async function callAgent(req, res) {
  try {
    const { agentType, query } = req.body;
    if (!agentType || !query) {
      return res.status(400).json({ error: "agentType and query are required" });
    }

    const workspace = await Workspace.findById(req.workspaceId);
    if (!workspace) return res.status(404).json({ error: "Workspace not found" });

    const payload = {
      workspaceId: req.workspaceId,
      pineconeNamespace: workspace.pineconeNamespace,
      agentType,
      query,
    };

    const agentRes = await fetch(`${AGENT_SERVICE_URL}/agents/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!agentRes.ok) {
      return res.status(502).json({ error: "Agent service failed to respond" });
    }

    const result = await agentRes.json();

    // Every agent run gets logged - this is the owner-facing audit trail.
    // Action-type results default to requiresApproval=true (draft mode),
    // so nothing external fires without a human confirming first.
    const log = await ActionLog.create({
      workspace: req.workspaceId,
      agentType: result.agentType,
      summary: result.result.slice(0, 200),
      status: result.requiresApproval ? "needs_review" : "success",
      requiresApproval: result.requiresApproval,
      toolCalls: result.toolCalls || null, // kept so approveAction can look this log up later
    });

    res.json({ ...result, logId: log._id });
  } catch (err) {
    res.status(500).json({ error: "Failed to reach agent service" });
  }
}

// Executors for each approvable tool. Each one takes the LLM-proposed
// parameters PLUS the trusted, auth-derived workspaceId/userId - never
// values pulled from the request body, so an approval request can never
// write into a workspace the caller doesn't belong to.
const EXECUTORS = {
  async create_task(parameters, workspaceId, userId) {
    if (!parameters.title) {
      throw new Error("Missing required field: title");
    }
    const task = await Task.create({
      title: parameters.title,
      assignee: parameters.assignee ?? null,
      dueDate: parameters.dueDate ?? null,
      workspace: workspaceId,
      createdBy: userId,
      status: "open",
    });
    return { taskId: task._id };
  },

  async send_email(parameters, workspaceId, userId) {
    // await sendEmail({ ...parameters, workspaceId, userId });
    throw new Error("send_email executor not wired up yet");
  },

  async schedule_meeting(parameters, workspaceId, userId) {
    // await scheduleMeeting({ ...parameters, workspaceId, userId });
    throw new Error("schedule_meeting executor not wired up yet");
  },
};

async function approveAction(req, res) {
  try {
    const { logId, tool, parameters } = req.body;
    if (!tool || !parameters) {
      return res.status(400).json({ error: "tool and parameters are required" });
    }

    const executor = EXECUTORS[tool];
    if (!executor) {
      return res.status(400).json({ error: `Unknown tool: ${tool}` });
    }

    // workspaceId/userId come ONLY from the authenticated request context
    // (set by requireAuth + requireWorkspaceMembership), never from req.body -
    // same principle create_task's docstring already called out.
    const result = await executor(parameters, req.workspaceId, req.userId);

    if (logId) {
      await ActionLog.findByIdAndUpdate(logId, { status: "success" });
    }

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

module.exports = { callAgent, approveAction };