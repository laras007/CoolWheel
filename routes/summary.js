const express = require("express");
const router = express.Router();
const summaryController = require("../controllers/summaryController");
const authenticateToken = require("../middleware/authMiddleware");

router.get("/:ride_id", authenticateToken, summaryController.getRideSummary);
router.get("/", authenticateToken, summaryController.getLastRideSummary);

module.exports = router;
