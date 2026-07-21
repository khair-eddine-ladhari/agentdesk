const { Router } = require("express");
const { requireAuth } = require("../middleware/auth");
const { createWorkspace, listMyWorkspaces } = require("../controllers/workspace.controller");

const router = Router();

router.use(requireAuth);
router.post("/", createWorkspace);
router.get("/", listMyWorkspaces);

module.exports = router;