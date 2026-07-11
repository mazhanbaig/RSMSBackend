const ResponseObj = require("../utils/ResponseObj");
const paymentService = require("../services/paymentService");

/**
 * POST /api/payment/create-payment — Create a JazzCash/Easypaisa payment payload.
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

        const { clientData, secureHash } = paymentService.buildJazzCashPayment(
            amount,
            selectedPayment,
            process.env.BASE_URL
        );

        res.json(ResponseObj(true, "Payment data created", { ...clientData, pp_SecureHash: secureHash }, null));
    } catch (err) {
        console.error(err);
        res.status(500).json(ResponseObj(false, "Payment creation failed", null, err.message));
    }
}

module.exports = { createPayment };
