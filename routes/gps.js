const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authMiddleware');
const {
  saveGpsData,
  getGpsDataByRideId,
  getlastGpsData,
  getLiveGpsTracking,
  getGpsHistoryByRideId,
} = require("../controllers/gpsController");

// ✅ Middleware diletakkan sebagai parameter sebelum handler-nya
router.post("/", authenticateToken, saveGpsData);
router.get("/", authenticateToken, getGpsDataByRideId);
router.get("/live", authenticateToken, getlastGpsData);
router.get("/tracking/live", authenticateToken, getLiveGpsTracking);
router.get("/history/:ride_id", authenticateToken, getGpsHistoryByRideId);

module.exports = router;
