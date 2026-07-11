const crypto = require('crypto');
const { db } = require('../config/firebase');
const { getPrisma } = require('../config/database');

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
    const prisma = getPrisma();

    // Resolve Postgres user ID
    const user = await prisma.user.findUnique({ where: { uid } });
    if (!user) {
        throw new Error(`User ${uid} not found in Postgres`);
    }

    // Write to Postgres (primary)
    await prisma.transaction.create({
        data: {
            uid,
            orgId: uid,
            txnRef,
            amount,
            status,
            gateway: paymentMethod,
            description: description || 'Ultimate Package',
            userId: user.id,
        },
    });

    // Also write to Firebase RTDB as rollback safety net
    await db.ref(`transactions/${uid}/${txnRef}`).set({
        txnRef,
        amount,
        paymentMethod,
        status,
        description: description || 'Ultimate Package',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });
}

async function updateTransaction(uid, txnRef, updates) {
    const prisma = getPrisma();

    // Update Postgres
    const data = { updatedAt: new Date() };
    if (updates.status !== undefined) data.status = updates.status;
    if (updates.gatewayResponse !== undefined) data.gatewayResponse = updates.gatewayResponse;
    if (updates.gatewayMessage !== undefined) data.gatewayMessage = updates.gatewayMessage;
    if (updates.settledAt !== undefined) data.settledAt = new Date(updates.settledAt);

    await prisma.transaction.updateMany({
        where: { txnRef, uid },
        data,
    });

    // Also update Firebase RTDB
    await db.ref(`transactions/${uid}/${txnRef}`).update({
        ...updates,
        updatedAt: new Date().toISOString(),
    });
}

async function activateSubscription(uid, plan, durationDays) {
    const prisma = getPrisma();
    const now = new Date();
    const expiryDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    // Update Postgres
    await prisma.user.updateMany({
        where: { uid },
        data: {
            subscriptionStatus: 'active',
            subscriptionExpiry: expiryDate,
        },
    });

    // Update Firebase RTDB
    await db.ref(`users/${uid}/subscription`).set({
        status: 'active',
        plan,
        activatedAt: now.toISOString(),
        expiryDate: expiryDate.toISOString(),
    });
}

// ─── JazzCash ────────────────────────────────────────────────────────

function buildJazzCashPayment(amount, selectedPayment, returnBaseUrl, uid) {
    const merchantId = process.env.JAZZCASH_MERCHANT_ID;
    const password = process.env.JAZZCASH_PASSWORD;
    const integritySalt = process.env.JAZZCASH_INTEGRITY_SALT;

    const txnRef = generateTxnRef(uid, amount);
    const txnDateTime = formatTxnDateTime();

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

function verifyJazzCashCallback(callbackParams, uid) {
    const integritySalt = process.env.JAZZCASH_INTEGRITY_SALT;
    const returnedHash = callbackParams.pp_SecureHash;
    if (!returnedHash) return false;

    const hashFields = {
        pp_Version: callbackParams.pp_Version || '1.1',
        pp_TxnType: callbackParams.pp_TxnType || 'MWALLET',
        pp_Language: callbackParams.pp_Language || 'EN',
        pp_MerchantID: callbackParams.pp_MerchantID,
        pp_Password: process.env.JAZZCASH_PASSWORD,
        pp_TxnRefNo: callbackParams.pp_TxnRefNo,
        pp_Amount: callbackParams.pp_Amount,
        pp_TxnCurrency: callbackParams.pp_TxnCurrency || 'PKR',
        pp_TxnDateTime: callbackParams.pp_TxnDateTime,
        pp_BillReference: callbackParams.pp_BillReference || 'BillRef',
        pp_Description: callbackParams.pp_Description || 'Ultimate Package',
        pp_ReturnURL: `${process.env.BASE_URL}/payment-callback?paymentMethod=jazzcash&uid=${uid}`,
    };

    if (!hashFields.pp_MerchantID || !hashFields.pp_TxnRefNo || !hashFields.pp_Amount) {
        return false;
    }

    const sortedString = integritySalt + '&' + Object.values(hashFields).join('&');
    const computedHash = computeSecureHash(integritySalt, sortedString);

    return computedHash === returnedHash;
}

// ─── Easypaisa ───────────────────────────────────────────────────────

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

// ─── Webhook UID Resolution ────────────────────────────────────────────

async function resolveUidFromTxnRef(txnRef) {
    const prisma = getPrisma();
    const transaction = await prisma.transaction.findUnique({ where: { txnRef } });
    if (transaction) {
        return transaction.uid;
    }

    // Fallback: check Firebase RTDB
    const indexSnapshot = await db.ref(`txnRefIndex/${txnRef}`).get();
    if (indexSnapshot.exists()) {
        return indexSnapshot.val();
    }
    return null;
}

async function storeTxnRefIndex(txnRef, uid) {
    // Postgres already has the uid through the transaction record itself
    // This is kept as a Firebase fallback for backward compatibility
    await db.ref(`txnRefIndex/${txnRef}`).set(uid);
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
    resolveUidFromTxnRef,
    storeTxnRefIndex,
};
