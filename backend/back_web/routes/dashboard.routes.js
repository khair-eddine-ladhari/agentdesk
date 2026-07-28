const { Router } = require("express");
const { requireAuth } = require("../middleware/auth");
const { getDashboardStats } = require("../controllers/dashboard.controller");

const router = Router();

router.use(requireAuth);

// e.g. GET /api/dashboard/stats
router.get("/dashboard/stats", getDashboardStats);

module.exports = router;