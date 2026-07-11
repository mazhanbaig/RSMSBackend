const crypto = require('crypto');
const { db } = require('../config/firebase');

// ─── Helpers ─────────────────────────────────────────────────────────

function generateTxnRef(uid, amount) {
    const raw = `${uid}-${amount}-${Date.now()}`;
    const hash = crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
    return `TXN_${hash}`;
}

function amountToPaisa(amount) {
    return String(Math.round(amount * 100));
}

function formatTxnDateTime() {
    return new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
}

function computeSecureHash(integritySalt, sortedString) {
    return crypto.createHmac('sha256', integritySalt).update(sortedString).digest('hex');
}

// ─── Persistence ─────────────────────────────────────────────────────

async function persistTransaction({ uid, txnRef, amount, paymentMethod, status, description }) {
    const txnRecord = {
        txnRef,
        amount,
        paymentMethod,
        status,
        description: description || 'Ultimate Package',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    await db.ref(`transactions/${uid}/${txnRef}`).set(txnRecord);
    return txnRecord;
}

async function updateTransaction(uid, txnRef, updates) {
    const payload = { ...updates, updatedAt: new Date().toISOString() };
    await db.ref(`transactions/${uid}/${txnRef}`).update(payload);
}

async function activateSubscription(uid, plan, durationDays) {
    const now = new Date();
    const expiryDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    await db.ref(`users/${uid}/subscription`).set({
        status: 'active',
        plan,
        activatedAt: now.toISOString(),
        expiryDate: expiryDate.toISOString(),
    });
}

// ─── JazzCash ────────────────────────────────────────────────────────

/**
 * Build JazzCash payment payload and compute secure hash.
 * @param {number} amount
 * @param {string} selectedPayment - "jazzcash"
 * @param {string} returnBaseUrl
 * @param {string} uid - User UID (embedded in ReturnURL for webhook resolution)
 * @returns {{ clientData: object, secureHash: string, txnRef: string }}
 */
function buildJazzCashPayment(amount, selectedPayment, returnBaseUrl, uid) {
    const merchantId = process.env.JAZZCASH_MERCHANT_ID;
    const password = process.env.JAZZCASH_PASSWORD;
    const integritySalt = process.env.JAZZCASH_INTEGRITY_SALT;

    const txnRef = generateTxnRef(uid, amount);
    const txnDateTime = formatTxnDateTime();

    // The EXACT set of fields used for HMAC — must match what the gateway uses
    const hashInput = {
        pp_Version: '1.1',
        pp_TxnType: 'MWALLET',
        pp_Language: 'EN',
        pp_MerchantID: merchantId,
        pp_Password: password,
        pp_TxnRefNo: txnRef,
        pp_Amount: amountToPaisa(amount),
        pp_TxnCurrency: 'PKR',
        pp_TxnDateTime: txnDateTime,
        pp_BillReference: 'BillRef',
        pp_Description: 'Ultimate Package',
        pp_ReturnURL: `${returnBaseUrl}/payment-callback?paymentMethod=${selectedPayment}&uid=${uid}`,
    };

    const sortedString = integritySalt + '&' + Object.values(hashInput).join('&');
    const secureHash = computeSecureHash(integritySalt, sortedString);

    const { pp_Password: _, ...clientData } = hashInput;

    return { clientData, secureHash, txnRef };
}

/**
 * Verify a JazzCash callback HMAC using ONLY the fields that were in the original hashInput.
 * Gateway-added response fields (pp_ResponseCode, pp_ResponseMessage, etc.) are ignored.
 * @param {object} callbackParams
 * @param {string} uid - User UID (extracted from ReturnURL query)
 * @returns {boolean}
 */
function verifyJazzCashCallback(callbackParams, uid) {
    const integritySalt = process.env.JAZZCASH_INTEGRITY_SALT;
    const returnedHash = callbackParams.pp_SecureHash;
    if (!returnedHash) return false;

    // Reconstruct using the SAME fields as the original hashInput (excluding pp_Password
    // since the gateway doesn't return it, and using the values the gateway echoes back)
    const hashFields = {
        pp_Version: callbackParams.pp_Version || '1.1',
        pp_TxnType: callbackParams.pp_TxnType || 'MWALLET',
        pp_Language: callbackParams.pp_Language || 'EN',
        pp_MerchantID: callbackParams.pp_MerchantID,
        pp_Password: process.env.JAZZCASH_PASSWORD, // use server-side value
        pp_TxnRefNo: callbackParams.pp_TxnRefNo,
        pp_Amount: callbackParams.pp_Amount,
        pp_TxnCurrency: callbackParams.pp_TxnCurrency || 'PKR',
        pp_TxnDateTime: callbackParams.pp_TxnDateTime,
        pp_BillReference: callbackParams.pp_BillReference || 'BillRef',
        pp_Description: callbackParams.pp_Description || 'Ultimate Package',
        pp_ReturnURL: `${process.env.BASE_URL}/payment-callback?paymentMethod=jazzcash&uid=${uid}`,
    };

    // Ensure all required fields are present
    if (!hashFields.pp_MerchantID || !hashFields.pp_TxnRefNo || !hashFields.pp_Amount) {
        return false;
    }

    const sortedString = integritySalt + '&' + Object.values(hashFields).join('&');
    const computedHash = computeSecureHash(integritySalt, sortedString);

    return computedHash === returnedHash;
}

// ─── Easypaisa ───────────────────────────────────────────────────────

/**
 * Build Easypaisa payment payload.
 * @param {number} amount
 * @param {string} selectedPayment - "easypaisa"
 * @param {string} returnBaseUrl
 * @param {string} uid
 * @returns {{ clientData: object, secureHash: string, txnRef: string }}
 */
function buildEasypaisaPayment(amount, selectedPayment, returnBaseUrl, uid) {
    const merchantId = process.env.EASYPAISA_MERCHANT_ID;
    const password = process.env.EASYPAISA_PASSWORD;
    const integritySalt = process.env.EASYPAISA_INTEGRITY_SALT;
    const storeId = process.env.EASYPAISA_STORE_ID || '1';

    const txnRef = generateTxnRef(uid, amount);
    const txnDateTime = formatTxnDateTime();

    const hashInput = {
        pp_Version: '2.0',
        pp_TxnType: 'MWALLET',
        pp_Language: 'EN',
        pp_MerchantID: merchantId,
        pp_Password: password,
        pp_TxnRefNo: txnRef,
        pp_Amount: amountToPaisa(amount),
        pp_TxnCurrency: 'PKR',
        pp_TxnDateTime: txnDateTime,
        pp_BillReference: 'BillRef',
        pp_Description: 'Ultimate Package',
        pp_StoreId: storeId,
        pp_ReturnURL: `${returnBaseUrl}/payment-callback?paymentMethod=${selectedPayment}&uid=${uid}`,
    };

    const sortedString = integritySalt + '&' + Object.values(hashInput).join('&');
    const secureHash = computeSecureHash(integritySalt, sortedString);

    const { pp_Password: _, ...clientData } = hashInput;

    return { clientData, secureHash, txnRef };
}

/**
 * Verify an Easypaisa callback HMAC.
 * @param {object} callbackParams
 * @param {string} uid
 * @returns {boolean}
 */
function verifyEasypaisaCallback(callbackParams, uid) {
    const integritySalt = process.env.EASYPAISA_INTEGRITY_SALT;
    const returnedHash = callbackParams.pp_SecureHash;
    if (!returnedHash) return false;

    const hashFields = {
        pp_Version: callbackParams.pp_Version || '2.0',
        pp_TxnType: callbackParams.pp_TxnType || 'MWALLET',
        pp_Language: callbackParams.pp_Language || 'EN',
        pp_MerchantID: callbackParams.pp_MerchantID,
        pp_Password: process.env.EASYPAISA_PASSWORD,
        pp_TxnRefNo: callbackParams.pp_TxnRefNo,
        pp_Amount: callbackParams.pp_Amount,
        pp_TxnCurrency: callbackParams.pp_TxnCurrency || 'PKR',
        pp_TxnDateTime: callbackParams.pp_TxnDateTime,
        pp_BillReference: callbackParams.pp_BillReference || 'BillRef',
        pp_Description: callbackParams.pp_Description || 'Ultimate Package',
        pp_StoreId: callbackParams.pp_StoreId || process.env.EASYPAISA_STORE_ID || '1',
        pp_ReturnURL: `${process.env.BASE_URL}/payment-callback?paymentMethod=easypaisa&uid=${uid}`,
    };

    if (!hashFields.pp_MerchantID || !hashFields.pp_TxnRefNo || !hashFields.pp_Amount) {
        return false;
    }

    const sortedString = integritySalt + '&' + Object.values(hashFields).join('&');
    const computedHash = computeSecureHash(integritySalt, sortedString);

    return computedHash === returnedHash;
}

// ─── Router ──────────────────────────────────────────────────────────

function buildPayment(amount, selectedPayment, returnBaseUrl, uid) {
    if (selectedPayment === 'easypaisa') {
        return buildEasypaisaPayment(amount, selectedPayment, returnBaseUrl, uid);
    }
    return buildJazzCashPayment(amount, selectedPayment, returnBaseUrl, uid);
}

module.exports = {
    generateTxnRef,
    buildPayment,
    buildJazzCashPayment,
    buildEasypaisaPayment,
    verifyJazzCashCallback,
    verifyEasypaisaCallback,
    persistTransaction,
    updateTransaction,
    activateSubscription,
};
