const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/paymentWebhookController');

// Payment gateway webhooks — NOT gated by PAYMENTS_ENABLED (safe no-op when disabled)
// These must stay reachable to log/reject stray callbacks even while payments are off.
router.post('/webhook/jazzcash', webhookController.jazzcashWebhook);
router.post('/webhook/easypaisa', webhookController.easypaisaWebhook);

module.exports = router;
