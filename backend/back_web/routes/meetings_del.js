const { Router } = require("express");
const { requireAuth } = require("../middleware/auth");
const { requireWorkspaceMembership } = require("../middleware/tenantScope");

const { getMeetings, deleteMeeting } = require("../controllers/meeting.controller");
const router = Router();

router.get("/:workspaceId/meetings", requireAuth, requireWorkspaceMembership, getMeetings);
router.delete("/:workspaceId/meetings/:meetingId", requireAuth, requireWorkspaceMembership, deleteMeeting);

module.exports = router;