const webhookService = require('../services/paymentWebhookService');

/**
 * POST /api/payment/webhook/jazzcash — Receive JazzCash callback/confirmation.
 * Not hard-blocked by PAYMENTS_ENABLED — safe no-op when disabled.
 */
async function jazzcashWebhook(req, res) {
    try {
        const callbackParams = req.body || req.query || {};

        if (process.env.PAYMENTS_ENABLED !== 'true') {
            const result = await webhookService.handleDisabledCallback();
            return res.status(200).json(result);
        }

        const result = await webhookService.processWebhookCallback(callbackParams, 'jazzcash');
        const httpStatus = result.status === 'rejected' ? 400 : 200;
        return res.status(httpStatus).json(result);
    } catch (err) {
        console.error('[Webhook] jazzcash error:', err);
        return res.status(500).json({ status: 'error', message: 'Internal server error processing webhook' });
    }
}

/**
 * POST /api/payment/webhook/easypaisa — Receive Easypaisa callback/confirmation.
 * Not hard-blocked by PAYMENTS_ENABLED — safe no-op when disabled.
 */
async function easypaisaWebhook(req, res) {
    try {
        const callbackParams = req.body || req.query || {};

        if (process.env.PAYMENTS_ENABLED !== 'true') {
            const result = await webhookService.handleDisabledCallback();
            return res.status(200).json(result);
        }

        const result = await webhookService.processWebhookCallback(callbackParams, 'easypaisa');
        const httpStatus = result.status === 'rejected' ? 400 : 200;
        return res.status(httpStatus).json(result);
    } catch (err) {
        console.error('[Webhook] easypaisa error:', err);
        return res.status(500).json({ status: 'error', message: 'Internal server error processing webhook' });
    }
}

module.exports = { jazzcashWebhook, easypaisaWebhook };
