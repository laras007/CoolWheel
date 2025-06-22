const express = require('express');
const router = express.Router();
const parkingController = require('../controllers/parkingController');

// POST /api/parking/toggle
router.post('/toggle', parkingController.toggleParking);
router.post('/theft', parkingController.trackLocation); // POST /api/tracking
module.exports = router;
