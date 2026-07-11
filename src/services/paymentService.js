const crypto = require('crypto');

/**
 * Generate a unique transaction reference with idempotency.
 * Uses a hash of user+amount+timestamp to prevent exact duplicates.
 * @param {string} uid - Firebase Auth UID
 * @param {number} amount - Transaction amount
 * @returns {string} Unique transaction reference
 */
function generateTxnRef(uid, amount) {
    const raw = `${uid}-${amount}-${Date.now()}`;
    const hash = crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
    return `TXN_${hash}`;
}

/**
 * Format a timestamp into JazzCash's expected datetime format (YYYYMMDDHHMMSS).
 * @returns {string}
 */
function formatTxnDateTime() {
    return new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
}

/**
 * Build the JazzCash payment payload and compute the secure hash.
 * The raw password is included in the HMAC input (required by gateway)
 * but the returned clientData excludes it.
 *
 * @param {number} amount - Transaction amount in PKR
 * @param {string} selectedPayment - Payment method ("jazzcash" or "easypaisa")
 * @param {string} returnBaseUrl - Base URL for the return/callback
 * @returns {{ clientData: object, secureHash: string, txnRef: string }}
 */
function buildJazzCashPayment(amount, selectedPayment, returnBaseUrl) {
    const merchantId = process.env.JAZZCASH_MERCHANT_ID;
    const password = process.env.JAZZCASH_PASSWORD;
    const integritySalt = process.env.JAZZCASH_INTEGRITY_SALT;

    const txnRef = generateTxnRef("system", amount);
    const txnDateTime = formatTxnDateTime();

    // Full payload including password — used ONLY for HMAC calculation
    const hashInput = {
        pp_Version: "1.1",
        pp_TxnType: "MWALLET",
        pp_Language: "EN",
        pp_MerchantID: merchantId,
        pp_Password: password,
        pp_TxnRefNo: txnRef,
        pp_Amount: amount + "00", // amount in paisa (original behavior — will be fixed in Phase 4)
        pp_TxnCurrency: "PKR",
        pp_TxnDateTime: txnDateTime,
        pp_BillReference: "BillRef",
        pp_Description: "Ultimate Package",
        pp_ReturnURL: `${returnBaseUrl}/payment-callback?paymentMethod=${selectedPayment}`,
    };

    // Compute secure hash from ALL fields including password
    const sortedString = integritySalt + "&" + Object.values(hashInput).join("&");
    const secureHash = crypto
        .createHmac("sha256", integritySalt)
        .update(sortedString)
        .digest("hex");

    // Client-facing payload — same without the password
    const { pp_Password: _, ...clientData } = hashInput;

    return { clientData, secureHash, txnRef };
}

module.exports = { generateTxnRef, buildJazzCashPayment };
