# Payments Enablement Guide

**Applies to:** BackendRSMS + RSMS frontend  
**Status:** Payments are currently **DISABLED** on both backend and frontend.  
**Purpose:** This document describes every step required to safely enable production payment processing.

---

## 1. Pre-flight Checklist

Complete every item below BEFORE flipping the `PAYMENTS_ENABLED` flag.

### 1.1 Rotate JazzCash Password

The JazzCash merchant password (`JAZZCASH_PASSWORD`) was previously sent to the frontend in API responses before the fix in Phase 1 of the backend hardening. **Rotate it in the JazzCash merchant portal** — this is a manual step outside the codebase:

1. Log in to the JazzCash merchant portal
2. Generate a new API password
3. Update `JAZZCASH_PASSWORD` in the Vercel environment (and `.env.local` for local dev)
4. Verify the new password works with a sandbox test

### 1.2 Confirm Easypaisa Credentials are Provisioned

Easypaisa integration was written in Phase 4 but requires these environment variables to be set:

| Variable | Where to get it |
|----------|----------------|
| `EASYPAISA_MERCHANT_ID` | Easypaisa merchant dashboard |
| `EASYPAISA_PASSWORD` | Easypaisa merchant dashboard |
| `EASYPAISA_INTEGRITY_SALT` | Easypaisa merchant dashboard |
| `EASYPAISA_STORE_ID` | Easypaisa merchant dashboard (default: "1") |

Add these to Vercel environment settings AND `.env.local` for local testing.

### 1.3 Register Webhook URLs in Merchant Dashboards

Both gateways need to know where to send payment callbacks. The backend webhook endpoints are:

| Gateway | Endpoint |
|---------|----------|
| JazzCash | `POST https://your-backend.vercel.app/api/payment/webhook/jazzcash` |
| Easypaisa | `POST https://your-backend.vercel.app/api/payment/webhook/easypaisa` |

Register these URLs in each merchant's dashboard. The gateways will POST callback data to these endpoints after a transaction completes.

### 1.4 Confirm Upstash Redis Rate Limiting is Live

The rate limiter falls back to in-memory storage when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are not set. **Rate limiting is ineffective across Vercel serverless instances without a shared store.**

Before enabling payments:
1. Create a free Upstash Redis instance at https://upstash.com
2. Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to Vercel environment settings
3. Verify: deploy a commit and check Vercel logs for `"Rate limiting: Using Upstash Redis (shared store for serverless)"`

### 1.5 Confirm Error Monitoring is Live

There is currently no error monitoring (Sentry, etc.) — production errors are fully blind. Set up at minimum:
1. Vercel Logs: ensure Logs are enabled in the Vercel dashboard
2. Consider adding Sentry free tier: `npm install @sentry/node` and configure with `SENTRY_DSN` env var
3. Verify: trigger an intentional error in staging and confirm it appears in the monitoring tool

---

## 2. Environment Variables

Every environment variable involved in payments:

### Backend (Vercel Environment Variables)

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `PAYMENTS_ENABLED` | Yes | `false` | Flip to `"true"` to enable |
| `JAZZCASH_MERCHANT_ID` | Yes | `merchant123` | From JazzCash portal |
| `JAZZCASH_PASSWORD` | Yes | *(rotated)* | Rotated before going live |
| `JAZZCASH_INTEGRITY_SALT` | Yes | `salt123` | From JazzCash portal |
| `EASYPAISA_MERCHANT_ID` | Yes | `merchant456` | From Easypaisa portal |
| `EASYPAISA_PASSWORD` | Yes | `easypassword` | From Easypaisa portal |
| `EASYPAISA_INTEGRITY_SALT` | Yes | `easysalt` | From Easypaisa portal |
| `EASYPAISA_STORE_ID` | No | `1` | Defaults to "1" if omitted |
| `BASE_URL` | Yes | `https://your-frontend.vercel.app` | Used for return URLs |
| `UPSTASH_REDIS_REST_URL` | Recommended | `https://...upstash.io` | Required for serverless rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Recommended | `token...` | Required for serverless rate limiting |

### Frontend (Next.js Environment Variables)

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `NEXT_PUBLIC_PAYMENTS_ENABLED` | Yes | `false` | Flip to `"true"` to show payment UI |
| `NEXT_PUBLIC_BACKEND_URL` | Yes | `https://your-backend.vercel.app` | API base URL |

### Environment Separation

Three environments, each with their own variable values:

| Environment | Backend URL | Frontend URL | Payment Status |
|-------------|------------|--------------|----------------|
| **Development** | `http://localhost:5000` | `http://localhost:3000` | Disabled (sandbox) |
| **Staging** | `https://staging-backend.vercel.app` | `https://staging.vercel.app` | Enabled (sandbox credentials) |
| **Production** | `https://api.production.com` | `https://production.com` | Enabled (live credentials) |

---

## 3. The Actual Flip

Steps to enable payments — **backend first, then frontend** — to prevent showing a payment UI the backend would reject.

### Step 1: Backend — Deploy with `PAYMENTS_ENABLED=true`

1. Set `PAYMENTS_ENABLED=true` in Vercel production environment
2. Ensure all other payment env vars are set (see Section 2)
3. Deploy the latest `dev` branch to production
4. **Verify webhook reachability** before proceeding:
   ```bash
   curl -X POST https://your-backend.vercel.app/api/payment/webhook/jazzcash \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   # Expected: 200 with "Payments disabled, callback ignored"
   ```
   (Note: even with PAYMENTS_ENABLED=true, a test payload with no txnRef will return proper error)

### Step 2: Frontend — Enable Payment UI

5. Set `NEXT_PUBLIC_PAYMENTS_ENABLED=true` in Vercel production environment
6. Deploy the frontend

### Step 3: Verify Live

7. Execute the smoke test sequence (Section 4)

---

## 4. Smoke Test Sequence

Run these tests in order with a low-value amount (e.g., PKR 10).

### 4.1 JazzCash — End-to-End

1. Call create-payment:
   ```bash
   curl -X POST https://your-backend.vercel.app/api/payment/create-payment \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <valid-firebase-token>" \
     -d '{"amount": 10, "email": "test@example.com", "selectedPayment": "jazzcash"}'
   ```
2. Confirm response contains: `pp_SecureHash`, `pp_MerchantID`, `pp_TxnRefNo`, `pp_Amount`
3. Confirm `pp_Password` is **NOT** in the response
4. Confirm a transaction record was created at `transactions/{uid}/{txnRef}` in Firebase with `status: "pending"`
5. Confirm a reverse index was created at `txnRefIndex/{txnRef}` → uid
6. Simulate a webhook callback:
   ```bash
   curl -X POST https://your-backend.vercel.app/api/payment/webhook/jazzcash \
     -H "Content-Type: application/json" \
     -d '{"pp_TxnRefNo": "<txnRef from step 2>", "pp_ResponseCode": "000", "pp_SecureHash": "<computed-hash>"}'
   ```
   (Note: the HMAC will fail with a simulated payload unless you compute the exact hash — this is expected)

### 4.2 Easypaisa — End-to-End

Same sequence as JazzCash, but:
- `selectedPayment: "easypaisa"`
- Target webhook: `/api/payment/webhook/easypaisa`

### 4.3 Test Deliberate Failure Paths

| Test | Expected Result |
|------|----------------|
| Call create-payment without auth token | **401** Unauthorized |
| Call create-payment with negative amount | **400** Validation error |
| Call create-payment with unknown selectedPayment | **400** Validation error |
| Call webhook with invalid HMAC | **400** HMAC verification failed |
| Call webhook with missing txnRef | **400** Missing txnRef |
| Send request body exceeding 1MB | **413** Payload Too Large |

---

## 5. Rollback Plan

If something goes wrong post-launch, follow these steps in order:

### Immediate (60 seconds)

1. **Set frontend flag to false**: `NEXT_PUBLIC_PAYMENTS_ENABLED=false` → deploy
2. **Set backend flag to false**: `PAYMENTS_ENABLED=false` → deploy

The frontend payment UI disappears within 1 deploy cycle. The backend rejects new payment creation within 1 deploy cycle. Webhook endpoints stay reachable but do no processing.

### Cleanup (within 24 hours)

3. **Audit in-flight transactions**: Query Firebase `transactions/{uid}/` for any records with `status: "pending"` that were created between the rollback and the deploy. These were created but never completed.
4. **Notify affected users**: If any pending transactions existed, reach out to those users explaining the situation and offering to manually activate their subscription.
5. **Restore after RCA**: Only re-enable after the root cause is identified and fixed. Do not flip the flag back without a new deploy with the fix.

---

## 6. Where the Logic Lives (File Map)

```
src/
├── routes/
│   ├── payment.js              — POST /api/payment/create-payment (thin: verifyUser + validatePaymentData + controller)
│   └── paymentWebhook.js       — POST /api/payment/webhook/jazzcash, /easypaisa (NOT gated by PAYMENTS_ENABLED)
├── controllers/
│   ├── paymentController.js    — createPayment: calls paymentService.buildPayment + persistTransaction + storeTxnRefIndex
│   └── paymentWebhookController.js — jazzcashWebhook, easypaisaWebhook: safe no-op when disabled, process when enabled
├── services/
│   ├── paymentService.js       — buildJazzCashPayment, buildEasypaisaPayment, verifyJazzCashCallback,
│   │                              verifyEasypaisaCallback, persistTransaction, updateTransaction,
│   │                              activateSubscription
│   └── paymentWebhookService.js — processWebhookCallback (HMAC verify + update txn + activate sub),
│                                   resolveUidFromTxnRef, storeTxnRefIndex, handleDisabledCallback
└── middlewares/
    ├── authMiddleware.js        — verifyUser (Firebase ID token verification)
    ├── subscription.middleware.js — verifySubscription (active subscription check)
    └── validate.js              — validatePaymentData (amount, email, selectedPayment)
```

### Firebase RTDB Paths

| Path | Purpose |
|------|---------|
| `transactions/{uid}/{txnRef}` | Transaction records (pending → completed/failed) |
| `txnRefIndex/{txnRef}` → uid | Reverse lookup for webhook uid resolution |
| `users/{uid}/subscription` | Subscription status (set by activateSubscription) |

---

## Important Design Decisions

1. **Webhooks are NOT blocked by PAYMENTS_ENABLED.** They must stay reachable to log/reject stray callbacks from gateways that may fire after the flag is turned off. Gateways retry on non-200 responses — returning 200 with "ignored" prevents retry storms.

2. **Transaction ID uses SHA-256 hash** of uid+amount+timestamp, not Date.now() alone. This provides better entropy and helps prevent txnRef collisions under high throughput.

3. **Amount is converted to paisa** using `Math.round(amount * 100)` rather than string concatenation (`amount + "00"`). This correctly handles decimal amounts (e.g., 500.50 → 50050, not 500.5000).

4. **Reverse index (txnRefIndex)** is stored separately from the transaction record so the webhook can resolve uid without scanning all transactions. This is a Firebase RTDB limitation — it doesn't support nested queries across paths.

5. **The HMAC is calculated server-side with the full set of fields** including pp_Password. The password is NOT sent to the frontend but IS included in the HMAC input that the gateway verifies. The callback verification function reconstructs the hash using only the original fields, ignoring any gateway-added response fields.
