import { Response } from "express";
import ActionLog from "../models/ActionLog";
import { TenantRequest } from "../middleware/tenantScope";
import Workspace from "../models/Workspace";
import { AgentRequest, AgentResponse, AgentType } from "../types/agent.types";

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || "http://localhost:8000";

export async function callAgent(req: TenantRequest, res: Response) {
  try {
    const { agentType, query } = req.body as { agentType: AgentType; query: string };
    if (!agentType || !query) {
      return res.status(400).json({ error: "agentType and query are required" });
    }

    const workspace = await Workspace.findById(req.workspaceId);
    if (!workspace) return res.status(404).json({ error: "Workspace not found" });

    const payload: AgentRequest = {
      workspaceId: req.workspaceId as string,
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

    const result = (await agentRes.json()) as AgentResponse;

    // Every agent run gets logged — this is the owner-facing audit trail.
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