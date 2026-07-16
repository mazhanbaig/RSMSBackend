const express = require('express');
const router = express.Router();
const verifyUser = require('../middlewares/authMiddleware');
const controller = require('../controllers/shareController');

// Authenticated routes (agent only)
router.post('/properties/:id/share', verifyUser, controller.createLink);
router.post('/properties/:id/share/:linkId/deactivate', verifyUser, controller.deactivateLink);
router.get('/properties/:id/links', verifyUser, controller.listForProperty);

// Public routes (NO auth — visitor-facing)
router.get('/public/property-view/:token', controller.getPublicPropertyView);
router.post('/public/property-view/:token/visitor', controller.registerPublicVisitor);

module.exports = router;
