const Sentry = require('@sentry/node');
const ResponseObj = require("../utils/ResponseObj");
const paymentService = require("../services/paymentService");

/**
 * POST /api/payment/create-payment — Create a JazzCash/Easypaisa payment payload
 * and persist a pending transaction record.
 */
async function createPayment(req, res) {
    try {
        const { amount, email, selectedPayment } = req.body;

        if (process.env.PAYMENTS_ENABLED !== "true") {
            return res
                .status(403)
                .json(ResponseObj(false, "Payments are currently disabled", null, "PAYMENTS_ENABLED is not set to true"));
        }

        const { clientData, secureHash, txnRef } = paymentService.buildPayment(
            amount,
            selectedPayment,
            process.env.BASE_URL,
            req.user.uid
        );

        await paymentService.persistTransaction({
            uid: req.user.uid,
            txnRef,
            amount,
            paymentMethod: selectedPayment,
            status: "pending",
            description: "Ultimate Package",
        });

        await paymentService.storeTxnRefIndex(txnRef, req.user.uid);

        res.json(ResponseObj(true, "Payment data created", { ...clientData, pp_SecureHash: secureHash }, null));
    } catch (err) {
        Sentry.captureException(err);
        console.error(err);
        res.status(500).json(ResponseObj(false, "Payment creation failed", null, err.message));
    }
}

module.exports = { createPayment };
