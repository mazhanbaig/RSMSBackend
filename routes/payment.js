const express = require('express')
const crypto = require('crypto')
const ResponseObj = require('../utils/ResponseObj')
const router = express.Router();

router.post("/create-payment", (req, res) => {
    try {
        const { amount, email, selectedPayment } = req.body;

        const merchantId = process.env.JAZZCASH_MERCHANT_ID;
        const password = process.env.JAZZCASH_PASSWORD;
        const integritySalt = process.env.JAZZCASH_INTEGRITY_SALT;

        const txnRef = "TXN_" + Date.now();
        const txnDateTime = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);

        const data = {
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

        // Create secure hash
        const sortedString = integritySalt + "&" + Object.values(data).join("&");
        const secureHash = crypto
            .createHmac("sha256", integritySalt)
            .update(sortedString)
            .digest("hex");

        // Send everything to frontend
        res.json(ResponseObj(true, "Payment data created", { ...data, pp_SecureHash: secureHash }, null));
    } catch (err) {
        console.error(err);
        res.status(500).json(ResponseObj(false, "Payment creation failed", null, err));
    }
});

module.exports = router