import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireWorkspaceMembership } from "../middleware/tenantScope";
import { upload } from "../middleware/upload";
import { uploadDocument, listDocuments } from "../controllers/document.controller";

const router = Router();

router.use(requireAuth);

// e.g. POST /api/workspaces/:workspaceId/documents
router.post("/:workspaceId/documents", requireWorkspaceMembership, upload.single("file"), uploadDocument);
router.get("/:workspaceId/documents", requireWorkspaceMembership, listDocuments);

export default router;