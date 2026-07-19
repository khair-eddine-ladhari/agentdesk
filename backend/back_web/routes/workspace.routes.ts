import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { createWorkspace, listMyWorkspaces } from "../controllers/workspace.controller";

const router = Router();

router.use(requireAuth);
router.post("/", createWorkspace);
router.get("/", listMyWorkspaces);

export default router;