const express = require('express');
const router = express.Router();
const statsController = require('../controllers/heartrateController');
const authenticateToken = require('../middleware/authMiddleware');

router.post('/', authenticateToken, statsController.saveHeartrate);
router.get('/hr', authenticateToken, statsController.getLastHeartrate);
router.get('/gethr', authenticateToken, statsController.getHeartrateByRideId);
module.exports = router;