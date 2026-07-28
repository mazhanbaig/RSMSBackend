const express = require('express');
const router = express.Router();
const { sanitizeBody } = require('../middlewares/sanitize');
const verifyUser = require('../middlewares/authMiddleware');
const toolsController = require('../controllers/toolsController');

router.use(sanitizeBody);

router.post('/installment-calculator', verifyUser, toolsController.installmentCalculator);

module.exports = router;
