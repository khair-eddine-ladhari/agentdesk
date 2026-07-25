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
  const { query, agentType } = req.body;
  const workspace = await Workspace.findById(req.workspaceId);

  const recentMessages = await ChatMessage.find({ workspace: req.workspaceId })
    .sort({ createdAt: -1 })
    .limit(10) // last 10 turns — tune based on token budget
    .then(msgs => msgs.reverse());

  const history = recentMessages.map(m => ({ role: m.role, content: m.content }));

  const { data } = await axios.post(`${AI_SERVICE_URL}/agents/run`, {
    query,
    namespace: workspace.pineconeNamespace,
    agentType, // undefined for normal chat, set for forced routes like /structure
    history,
  });

  await ChatMessage.create({ workspace: req.workspaceId, role: "user", content: query });
  await ChatMessage.create({
    workspace: req.workspaceId,
    role: "assistant",
    content: data.result,
    agentType: data.agentType,
  });

  // ...existing ActionLog.create(...) stays as-is
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