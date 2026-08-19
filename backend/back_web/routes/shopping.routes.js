const express = require("express");
const router = express.Router({ mergeParams: true });
const auth = require("../middleware/auth");
const tenantScope = require("../middleware/tenantScope");
const { runShoppingSearch } = require("../controllers/shopping.controller");

router.post("/run", auth, tenantScope, runShoppingSearch);

module.exports = router;