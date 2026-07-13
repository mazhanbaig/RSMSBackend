const express = require('express');
const router = express.Router();
const verifyUser = require('../middlewares/authMiddleware');
const toolsController = require('../controllers/toolsController');

router.post('/installment-calculator', verifyUser, toolsController.installmentCalculator);

module.exports = router;
