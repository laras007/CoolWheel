const express = require('express');
const router = express.Router();
const parkingController = require('../controllers/parkingController');
const authenticateToken = require('../middleware/authMiddleware');

// POST /api/parking/toggle
router.post('/toggle', authenticateToken, parkingController.toggleParking);
router.post('/theft', authenticateToken, parkingController.trackLocation); // POST /api/tracking
module.exports = router;
