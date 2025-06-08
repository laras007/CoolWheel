const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authMiddleware');
const {
  saveGpsData,
  getGpsDataByRideId,
  getlastGpsData
} = require('../controllers/gpsController');

// ✅ Middleware diletakkan sebagai parameter sebelum handler-nya
router.post('/', authenticateToken, saveGpsData);
router.get('/', authenticateToken, getGpsDataByRideId);
router.get('/live', authenticateToken, getlastGpsData);

module.exports = router;
