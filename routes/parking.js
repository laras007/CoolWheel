const express = require('express');
const router = express.Router();
const parkingController = require('../controllers/parkingController');

// POST /api/parking/toggle
router.post('/toggle', parkingController.toggleParking);

module.exports = router;
