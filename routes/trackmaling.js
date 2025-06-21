const express = require('express');
const router = express.Router();
const trackingController = require('../controllers/trackimalingController');

router.post('/', trackingController.trackLocation); // POST /api/tracking

module.exports = router;
