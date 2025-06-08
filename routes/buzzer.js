const express = require('express');
const router = express.Router();
const buzzerController = require('../controllers/buzzerController');

router.get('/getcommand', buzzerController.getBuzzerCommand);
router.post('/', buzzerController.toggleBuzzer); // satu endpoint toggle

module.exports = router;
