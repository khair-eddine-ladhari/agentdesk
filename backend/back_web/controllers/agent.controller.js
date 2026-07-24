const sgMail = require("@sendgrid/mail");
const ActionLog = require("../models/ActionLog");
const Workspace = require("../models/Workspace");
const Task = require("../models/Task");
const Meeting = require("../models/Meeting");
const StructuredNote = require("../models/StructuredNote");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@yourapp.com";

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



    if (result.agentType === "structuring") {
  const structured = JSON.parse(result.result);
  await StructuredNote.create({
    workspace: req.workspaceId,
    createdBy: req.userId,
    rawQuery: query,
    key_points: structured.key_points || [],
    action_items: structured.action_items || [],
    mentioned_dates: structured.mentioned_dates || [],
    parseError: structured._parse_error || null,
  });
}

    // Every agent run gets logged - this is the owner-facing audit trail.
    // Action-type results default to requiresApproval=true (draft mode),
    // so nothing external fires without a human confirming first.
    const log = await ActionLog.create({
  workspace: req.workspaceId,
  agentType: result.agentType,
  summary: result.result.slice(0, 200),
  status: result.requiresApproval ? "needs_review" : "success",
  requiresApproval: result.requiresApproval,
  toolCalls: result.toolCalls,
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
    const required = ["to", "subject", "body"];
    const missing = required.filter((field) => !parameters[field]);
    if (missing.length) {
      throw new Error(`Missing required field(s): ${missing.join(", ")}`);
    }

    const message = {
      to: parameters.to,
      from: FROM_EMAIL,
      subject: parameters.subject,
      text: parameters.body,
    };

    try {
      const [response] = await sgMail.send(message);
      return { statusCode: response.statusCode };
    } catch (err) {
      // Same principle as the old Python version - don't let a raw
      // SendGrid exception bubble up unformatted; surface a clean message.
      const detail = err.response?.body?.errors?.[0]?.message || err.message;
      throw new Error(`SendGrid error: ${detail}`);
    }
  },

  async schedule_meeting(parameters, workspaceId, userId) {
    if (!parameters.title) {
      throw new Error("Missing required field: title");
    }
    const meeting = await Meeting.create({
      title: parameters.title,
      attendees: parameters.attendees ?? [],
      time: parameters.time ?? null,
      workspace: workspaceId,
      createdBy: userId,
    });
    // No real calendar integration yet - this just persists the meeting
    // as a record. Swap in a real Google Calendar API call here later
    // without changing anything upstream (agent, approve route, etc.).
    return { meetingId: meeting._id };
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
      await ActionLog.findByIdAndUpdate(logId, {
        status: "success",
        approvedBy: req.userId,
      });
    }

    res.json({ success: true, ...result });
  } catch (err) {
    if (req.body.logId) {
      await ActionLog.findByIdAndUpdate(req.body.logId, { status: "failed" }).catch(() => {});
    }
    res.status(400).json({ success: false, error: err.message });
  }
}

module.exports = { callAgent, approveAction };