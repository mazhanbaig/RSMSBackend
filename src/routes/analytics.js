const express = require('express');
const router = express.Router();
const verifyUser = require('../middlewares/authMiddleware');
const analyticsController = require('../controllers/analyticsController');

router.get('/overview', verifyUser, analyticsController.overview);
router.get('/clients-by-stage', verifyUser, analyticsController.clientsByStage);
router.get('/properties-timeline', verifyUser, analyticsController.propertiesTimeline);

module.exports = router;
