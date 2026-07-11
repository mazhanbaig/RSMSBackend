const { db } = require('../config/firebase');
const paymentService = require('./paymentService');

const SUBSCRIPTION_DURATION_DAYS = 30;

/**
 * Resolve a user UID from the transaction record stored at transactions/{uid}/{txnRef}.
 * Since the webhook callback doesn't include uid in its params, we look it up
 * by scanning the transactions index.
 *
 * @param {string} txnRef - Transaction reference to look up
 * @returns {Promise<string|null>} The uid if found, null otherwise
 */
async function resolveUidFromTxnRef(txnRef) {
    // The transactions path is transactions/{uid}/{txnRef}. We query by txnRef
    // using Firebase's orderByChild. Since RTDB doesn't support nested wildcard
    // queries directly, we store a reverse index: txnRefIndex/{txnRef} -> uid
    const indexSnapshot = await db.ref(`txnRefIndex/${txnRef}`).get();
    if (indexSnapshot.exists()) {
        return indexSnapshot.val();
    }
    return null;
}

/**
 * Store a reverse index mapping txnRef → uid for webhook resolution.
 * @param {string} txnRef
 * @param {string} uid
 * @returns {Promise<void>}
 */
async function storeTxnRefIndex(txnRef, uid) {
    await db.ref(`txnRefIndex/${txnRef}`).set(uid);
}

/**
 * Process a payment gateway callback/webhook notification.
 *
 * Steps:
 * 1. Extract txnRef from callback params.
 * 2. Resolve uid from the txnRefIndex in Firebase.
 * 3. Verify the HMAC signature.
 * 4. On verified success: mark transaction completed, activate subscription.
 * 5. On failure: mark transaction failed.
 *
 * @param {object} callbackParams - Raw callback params from the gateway
 * @param {string} gateway - "jazzcash" | "easypaisa"
 * @returns {Promise<{ status: string, message: string }>}
 */
async function processWebhookCallback(callbackParams, gateway) {
    const txnRef = callbackParams.pp_TxnRefNo;
    if (!txnRef) {
        console.error(`[Webhook] ${gateway}: No txnRef in callback`);
        return { status: 'rejected', message: 'Missing txnRef in callback' };
    }

    // 1. Resolve uid from the txnRefIndex
    const uid = await resolveUidFromTxnRef(txnRef);
    if (!uid) {
        console.error(`[Webhook] ${gateway}: No transaction found for txnRef=${txnRef}`);
        return { status: 'rejected', message: 'Transaction not found' };
    }

    // 2. Verify HMAC signature
    let isValid = false;
    if (gateway === 'easypaisa') {
        isValid = paymentService.verifyEasypaisaCallback(callbackParams, uid);
    } else {
        isValid = paymentService.verifyJazzCashCallback(callbackParams, uid);
    }

    if (!isValid) {
        console.error(`[Webhook] ${gateway}: HMAC verification FAILED for txn ${txnRef}`);
        await paymentService.updateTransaction(uid, txnRef, {
            status: 'failed',
            gatewayResponse: 'HMAC_FAILED',
            gatewayMessage: 'Signature verification failed',
        }).catch(e => console.error(`[Webhook] Failed to update txn record: ${e.message}`));
        return { status: 'rejected', message: 'HMAC verification failed' };
    }

    // 3. Update transaction record
    const txnStatus = callbackParams.pp_ResponseCode === '000' ? 'completed' : 'failed';

    await paymentService.updateTransaction(uid, txnRef, {
        status: txnStatus,
        gatewayResponse: callbackParams.pp_ResponseCode || '',
        gatewayMessage: callbackParams.pp_ResponseMessage || '',
        settledAt: new Date().toISOString(),
    });

    // 4. On success, activate user's subscription
    if (txnStatus === 'completed') {
        await paymentService.activateSubscription(uid, 'Ultimate Package', SUBSCRIPTION_DURATION_DAYS);
        console.log(`[Webhook] ${gateway}: Subscription activated for uid=${uid}, txn=${txnRef}`);
        return { status: 'completed', message: 'Payment verified, subscription activated' };
    }

    console.warn(`[Webhook] ${gateway}: Payment failed for txn=${txnRef}, code=${callbackParams.pp_ResponseCode}`);
    return { status: 'failed', message: `Gateway returned code ${callbackParams.pp_ResponseCode}` };
}

/**
 * Handle a disabled-payments callback safely — log and return 200 without processing.
 */
function handleDisabledCallback() {
    console.log('[Webhook] Received callback while payments are disabled — safe no-op (returning 200 to avoid gateway retries)');
    return { status: 'ignored', message: 'Payments disabled, callback ignored' };
}

module.exports = { processWebhookCallback, handleDisabledCallback, storeTxnRefIndex };
