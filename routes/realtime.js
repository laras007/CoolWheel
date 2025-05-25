const express = require('express');
const router = express.Router();
const { getRealtimeStats } = require('../controllers/realtimeStatsController');
const authenticate = require('../middleware/authenticate');

router.get('/', authenticate, getRealtimeStats);

module.exports = router;
