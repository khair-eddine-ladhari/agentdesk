const ActionLog = require("../models/ActionLog");
const Workspace = require("../models/Workspace");

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

    const agentRes = await fetch(`${AGENT_SERVICE_URL}/agent/run`, {
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
    });

    res.json({ ...result, logId: log._id });
  } catch (err) {
    res.status(500).json({ error: "Failed to reach agent service" });
  }
}

module.exports = { callAgent };