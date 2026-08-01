const sgMail = require("@sendgrid/mail");
const ActionLog = require("../models/ActionLog");
const Workspace = require("../models/Workspace");
const Task = require("../models/Task");
const Meeting = require("../models/Meeting");
const StructuredNote = require("../models/StructuredNote");
const ChatMessage = require("../models/ChatMessage");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL;
if (!FROM_EMAIL) {
  throw new Error("SENDGRID_FROM_EMAIL is not set in the environment.");
}

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || "http://localhost:8000";

async function callAgent(req, res) {
  try {
    const { query, agentType } = req.body;

    if (!query) {
      return res.status(400).json({ error: "query is required" });
    }

    const workspace = await Workspace.findById(req.workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: "Workspace not found" });
    }

    // Load recent conversation history (most recent N, restored to
    // chronological order for the prompt)
    const recentMessages = await ChatMessage.find({
      workspace: req.workspaceId,
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .then((msgs) => msgs.reverse());

    const history = recentMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Load previously structured notes
    const structuredNotes = await StructuredNote.find({
      workspace: req.workspaceId,
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .select("key_points action_items mentioned_dates");

    const payload = {
      query,
      namespace: workspace.pineconeNamespace,
      agentType,
      history,
      structuredNotes,
    };

    const agentRes = await fetch(`${AGENT_SERVICE_URL}/agents/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!agentRes.ok) {
      return res.status(502).json({ error: "Agent service failed to respond" });
    }

    const result = await agentRes.json();

    // Save structured notes if produced
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

    // Audit log created FIRST so its _id can be stamped onto the
    // assistant's ChatMessage below - this is what lets an approval
    // card be reconstructed after a reload.
    const log = await ActionLog.create({
      workspace: req.workspaceId,
      agentType: result.agentType,
      summary: result.result.slice(0, 200),
      status: result.requiresApproval ? "needs_review" : "success",
      requiresApproval: result.requiresApproval,
      toolCalls: result.toolCalls,
    });

    // Save chat history
    await ChatMessage.create({
      workspace: req.workspaceId,
      role: "user",
      content: query,
    });

    await ChatMessage.create({
      workspace: req.workspaceId,
      role: "assistant",
      content: result.result,
      agentType: result.agentType,
      requiresApproval: result.requiresApproval,
      toolCalls: result.toolCalls,
      logId: log._id,
      decision: result.requiresApproval ? "pending" : null,
    });

    res.json({
      ...result,
      logId: log._id,
    });
  } catch (err) {
    console.error("[callAgent] error:", err);
    res.status(500).json({
      error: "Failed to reach agent service",
    });
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
    // (set by requireAuth + requireWorkspaceMembership), never from req.body.
    const result = await executor(parameters, req.workspaceId, req.userId);

    if (logId) {
      await ActionLog.findByIdAndUpdate(logId, {
        status: "success",
        approvedBy: req.userId,
      });
      await ChatMessage.findOneAndUpdate({ logId }, { decision: "approved" });
    }

    res.json({ success: true, ...result });
  } catch (err) {
    if (req.body.logId) {
      await ActionLog.findByIdAndUpdate(req.body.logId, { status: "failed" }).catch(() => {});
      await ChatMessage.findOneAndUpdate(
        { logId: req.body.logId },
        { decision: "failed" }
      ).catch(() => {});
    }
    res.status(400).json({ success: false, error: err.message });
  }
}

async function declineAction(req, res) {
  try {
    const { logId } = req.body;
    if (!logId) {
      return res.status(400).json({ error: "logId is required" });
    }

    const log = await ActionLog.findOneAndUpdate(
      { _id: logId, workspace: req.workspaceId },
      { status: "failed", approvedBy: req.userId },
      { new: true }
    );
    if (!log) {
      return res.status(404).json({ error: "Action not found" });
    }

    await ChatMessage.findOneAndUpdate({ logId }, { decision: "declined" });

    res.json({ success: true });
  } catch (err) {
    console.error("[declineAction] error:", err);
    res.status(500).json({ success: false, error: "Failed to decline action" });
  }
}

async function getMessages(req, res) {
  try {
    // Most recent 100, restored to chronological order - matches the
    // pattern used for agent history above. The previous ascending
    // sort + limit(100) silently kept only the OLDEST 100 messages in
    // the workspace, dropping everything after them.
    const messages = await ChatMessage.find({ workspace: req.workspaceId })
      .sort({ createdAt: -1 })
      .limit(100)
      .then((msgs) => msgs.reverse());

    res.json({
      messages: messages.map((m) => ({
        _id: m._id,
        role: m.role,
        text: m.content,
        agentType: m.agentType,
        requiresApproval: m.requiresApproval,
        toolCalls: m.toolCalls,
        logId: m.logId,
        decision: m.decision,
      })),
    });
  } catch (err) {
    console.error("[getMessages] error:", err);
    res.status(500).json({ error: "Failed to load messages" });
  }
}

async function declineAction(req, res) {
  try {
    const { logId } = req.body;
    if (!logId) {
      return res.status(400).json({ error: "logId is required" });
    }

    const log = await ActionLog.findOneAndUpdate(
      { _id: logId, workspace: req.workspaceId },
      { status: "failed", approvedBy: req.userId },
      { new: true }
    );
    if (!log) {
      return res.status(404).json({ error: "Action not found" });
    }

    await ChatMessage.findOneAndUpdate({ logId }, { decision: "declined" });

    res.json({ success: true });
  } catch (err) {
    console.error("[declineAction] error:", err);
    res.status(500).json({ success: false, error: "Failed to decline action" });
  }
}

module.exports = { callAgent, approveAction, declineAction, getMessages ,declineAction};