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
        const integritySalt = process.env.JAZZCASH_INTEGRITY_SALT;

        const txnRef = "TXN_" + Date.now();
        const txnDateTime = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);

        const paymentData = {
            pp_Version: "1.1",
            pp_TxnType: "MWALLET",
            pp_Language: "EN",
            pp_MerchantID: merchantId,
            pp_TxnRefNo: txnRef,
            pp_Amount: amount + "00",
            pp_TxnCurrency: "PKR",
            pp_TxnDateTime: txnDateTime,
            pp_BillReference: "BillRef",
            pp_Description: "Ultimate Package",
            pp_ReturnURL: `${process.env.BASE_URL}/payment-callback?paymentMethod=${selectedPayment}`};

        // Create secure hash (integrity salt used server-side only; password never sent to client)
        const sortedString = integritySalt + "&" + Object.values(paymentData).join("&");
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