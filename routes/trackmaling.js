const express = require('express');
const router = express.Router();
const trackingController = require('../controllers/trackmalingController');

router.post('/', trackingController.trackLocation); // POST /api/tracking

module.exports = router;
