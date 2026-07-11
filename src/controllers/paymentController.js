const ResponseObj = require("../utils/ResponseObj");
const paymentService = require("../services/paymentService");
const { storeTxnRefIndex } = require("../services/paymentWebhookService");

/**
 * POST /api/payment/create-payment — Create a JazzCash/Easypaisa payment payload
 * and persist a pending transaction record to Firebase.
 */
async function createPayment(req, res) {
    try {
        const { amount, email, selectedPayment } = req.body;

        // Backend-side PAYMENTS_ENABLED gate
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

        // Persist a pending transaction record server-side BEFORE returning to client
        await paymentService.persistTransaction({
            uid: req.user.uid,
            txnRef,
            amount,
            paymentMethod: selectedPayment,
            status: "pending",
            description: "Ultimate Package",
        });

        // Store reverse index for webhook uid resolution
        await storeTxnRefIndex(txnRef, req.user.uid);

        res.json(ResponseObj(true, "Payment data created", { ...clientData, pp_SecureHash: secureHash }, null));
    } catch (err) {
        console.error(err);
        res.status(500).json(ResponseObj(false, "Payment creation failed", null, err.message));
    }
}

module.exports = { createPayment };
