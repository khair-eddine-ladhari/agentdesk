const express = require("express");
const router = express.Router({ mergeParams: true });
const { requireAuth } = require("../middleware/auth");
const { requireWorkspaceMembership } = require("../middleware/tenantScope");
const { runShoppingSearch } = require("../controllers/shopping.controller");

router.post("/run", requireAuth, requireWorkspaceMembership, runShoppingSearch);

module.exports = router;