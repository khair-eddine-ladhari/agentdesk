import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireWorkspaceMembership } from "../middleware/tenantScope";
import { callAgent } from "../controllers/agent.controller";

const router = Router();

// e.g. POST /api/workspaces/:workspaceId/agent/run
router.post("/:workspaceId/agent/run", requireAuth, requireWorkspaceMembership, callAgent);

export default router;