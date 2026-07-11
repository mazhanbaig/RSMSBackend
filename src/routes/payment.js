const express = require('express')
const crypto = require('crypto')
const ResponseObj = require('../utils/ResponseObj')
const verifyUser = require('../middlewares/authMiddleware')
const { validatePaymentData } = require('../middlewares/validate')
const router = express.Router();

router.post("/create-payment", verifyUser, validatePaymentData, (req, res) => {
    try {
        const { amount, email, selectedPayment } = req.body;

        // Backend-side PAYMENTS_ENABLED gate
        if (process.env.PAYMENTS_ENABLED !== "true") {
            return res
                .status(403)
                .json(ResponseObj(false, "Payments are currently disabled", null, "PAYMENTS_ENABLED is not set to true"));
        }

        const merchantId = process.env.JAZZCASH_MERCHANT_ID;
        const password = process.env.JAZZCASH_PASSWORD;
        const integritySalt = process.env.JAZZCASH_INTEGRITY_SALT;

        const txnRef = "TXN_" + Date.now();
        const txnDateTime = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);

        // Build full payment data including password for HMAC calculation (server-side only)
        const hashInput = {
            pp_Version: "1.1",
            pp_TxnType: "MWALLET",
            pp_Language: "EN",
            pp_MerchantID: merchantId,
            pp_Password: password,
            pp_TxnRefNo: txnRef,
            pp_Amount: amount + "00",
            pp_TxnCurrency: "PKR",
            pp_TxnDateTime: txnDateTime,
            pp_BillReference: "BillRef",
            pp_Description: "Ultimate Package",
            pp_ReturnURL: `${process.env.BASE_URL}/payment-callback?paymentMethod=${selectedPayment}`};

        // Client-facing payload — same fields EXCEPT the raw password
        const { pp_Password: _, ...paymentData } = hashInput;

        // Create secure hash (includes password for gateway verification, but password is NOT in paymentData sent to client)
        const sortedString = integritySalt + "&" + Object.values(hashInput).join("&");
        const secureHash = crypto
            .createHmac("sha256", integritySalt)
            .update(sortedString)
            .digest("hex");

        // Send payment data to frontend WITHOUT the raw password
        res.json(ResponseObj(true, "Payment data created", { ...paymentData, pp_SecureHash: secureHash }, null));
    } catch (err) {
        console.error(err);
        res.status(500).json(ResponseObj(false, "Payment creation failed", null, err.message));
    }
});

module.exports = router