# 🔑 BackendRSMS — Environment Variables Reference

> All environment variables this project uses, grouped by category.
> Copy these into a `.env` file at the project root.

---

## 📋 Table of Contents

1. [🚨 Required (App WILL crash without these)](#1-required-app-will-crash-without-these)
2. [🖼️ Image Uploads (Cloudinary)](#2-image-uploads-cloudinary)
3. [🔐 Admin Security (TOTP MFA)](#3-admin-security-totp-mfa)
5. [⏱️ Rate Limiting (Upstash Redis — Recommended)](#5-rate-limiting-upstash-redis--recommended)
6. [💳 Payments — JazzCash (Disabled by default)](#6-payments--jazzcash-disabled-by-default)
7. [💳 Payments — Easypaisa (Disabled by default)](#7-payments--easypaisa-disabled-by-default)
8. [💳 Payments — General](#8-payments--general)
9. [🌍 Environment / Server Config](#9-environment--server-config)
10. [🧪 Testing / Dev Only](#10-testing--dev-only)
11. [📦 Quick Start — All at once](#11-quick-start--all-at-once)
12. [🔍 How to Find Each Key](#12-how-to-find-each-key)

---

## 1. 🚨 Required (App WILL crash without these)

| Variable | Example | Where to Get It |
|----------|---------|-----------------|
| `DATABASE_URL` | `postgresql://user:pass@ep-...neon.tech/rsms?sslmode=require` | Neon Dashboard → Connection Details |
| `FIREBASE_PROJECT_ID` | `rsms-5d122` | Firebase Console → ⚙️ Project Settings → General |
| `FIREBASE_PRIVATE_KEY` | `-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n` | Firebase Console → ⚙️ Project Settings → Service Accounts → Generate New Private Key |
| `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk-xxxxx@rsms-5d122.iam.gserviceaccount.com` | Same private key JSON file (field `client_email`) |
| `FIREBASE_DATABASE_URL` | `https://rsms-5d122-default-rtdb.firebaseio.com` | Firebase Console → Realtime Database → Data tab |
| `FIREBASE_WEB_API_KEY` | `AIzaSyD-...` | Firebase Console → ⚙️ Project Settings → General → **Web API Key** (bottom of page) |

> 💡 **`FIREBASE_PRIVATE_KEY` must use `\n` for newlines**, not actual newlines.
> In `.env` write: `FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n"`
> The code handles this: `process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')`

### Files that require these:

| Variable | File |
|----------|------|
| `DATABASE_URL` | `src/config/database.js`, `scripts/backfillPostgres.js`, `scripts/setup_live_test.js`, `scripts/setup_roles.js`, `scripts/bootstrap_live_test.js` |
| `FIREBASE_PROJECT_ID` | `src/config/firebase.js` |
| `FIREBASE_PRIVATE_KEY` | `src/config/firebase.js` |
| `FIREBASE_CLIENT_EMAIL` | `src/config/firebase.js` |
| `FIREBASE_DATABASE_URL` | `src/config/firebase.js` |
| `FIREBASE_WEB_API_KEY` | `scripts/getFirebaseToken.js`, `scripts/setup_live_test.js`, `scripts/live_test_runner.js` |

---

## 2. 🖼️ Image Uploads (Cloudinary)

Required if you use the `/api/images` endpoints.

| Variable | Example | Where to Get It |
|----------|---------|-----------------|
| `CLOUD_NAME` | `mycloud` | Cloudinary Dashboard |
| `CLOUD_API_KEY` | `123456789012345` | Cloudinary Dashboard |
| `CLOUD_API_SECRET` | `abc123def456` | Cloudinary Dashboard |

**File:** `src/services/imagesService.js`

---

## 3. 🔐 Admin Security (TOTP MFA)

| Variable | Example | Notes |
|----------|---------|-------|
| `TOTP_ENCRYPTION_KEY` | `my-super-secret-key-change-in-prod` | **Optional in dev** — falls back to a default derived key if not set. **REQUIRED in production** — set a strong random string. |

Used to encrypt TOTP secrets at rest (AES-256-GCM).

**File:** `src/utils/encryption.js`

---
---

## 5. ⏱️ Rate Limiting (Upstash Redis — Recommended)

| Variable | Example | Notes |
|----------|---------|-------|
| `UPSTASH_REDIS_REST_URL` | `https://xxxx.upstash.io` | **Recommended for production** — without these, rate limiting falls back to in-memory (doesn't work across Vercel serverless instances). A warning is logged on startup. |
| `UPSTASH_REDIS_REST_TOKEN` | `AXx...` | |

**Rate limit tiers** (when Upstash is configured):
- **Global:** 100 requests / 15 min per IP
- **Strict (auth + data mutations):** 30 requests / 15 min per IP
- **Admin:** 10 requests / 15 min per IP

**File:** `src/index.js`

---

## 6. 💳 Payments — JazzCash (Disabled by default)

> ⚠️ These are **built but gated off**. `PAYMENTS_ENABLED=false` currently.
> Do NOT change without explicit instructions.

| Variable | Example | Notes |
|----------|---------|-------|
| `JAZZCASH_MERCHANT_ID` | `merchant123` | From JazzCash merchant portal |
| `JAZZCASH_PASSWORD` | *(rotated)* | From JazzCash merchant portal |
| `JAZZCASH_INTEGRITY_SALT` | `salt123` | From JazzCash merchant portal |

**File:** `src/services/paymentService.js`

---

## 7. 💳 Payments — Easypaisa (Disabled by default)

> ⚠️ These are **built but gated off**. `PAYMENTS_ENABLED=false` currently.
> Do NOT change without explicit instructions.

| Variable | Example | Required | Default |
|----------|---------|----------|---------|
| `EASYPAISA_MERCHANT_ID` | `merchant456` | ✅ Yes | — |
| `EASYPAISA_PASSWORD` | `easypassword` | ✅ Yes | — |
| `EASYPAISA_INTEGRITY_SALT` | `easysalt` | ✅ Yes | — |
| `EASYPAISA_STORE_ID` | `1` | ❌ No | `"1"` |

**File:** `src/services/paymentService.js`

---

## 8. 💳 Payments — General

| Variable | Example | Notes |
|----------|---------|-------|
| `PAYMENTS_ENABLED` | `false` | Set to `"true"` to enable payment processing. Currently **OFF** — do not change without explicit instruction. |
| `BASE_URL` | `https://zstate.vercel.app` | Frontend base URL — used for payment return URLs and callbacks. In dev: `http://localhost:3000` |

**Files:** `src/services/paymentService.js`, `src/controllers/paymentController.js`, `src/routes/payment.js`, `src/controllers/paymentWebhookController.js`

---

## 9. 🌍 Environment / Server Config

| Variable | Example | Default | Notes |
|----------|---------|---------|-------|
| `NODE_ENV` | `development` | `development` | Controls error detail exposure (full messages in dev, generic in prod). |
| `PORT` | `5000` | `5000` | Express server port. |

---

## 10. 🧪 Testing / Dev Only

| Variable | Example | Notes |
|----------|---------|-------|
| `LIVE_TEST` | `true` | When `"true"` (and `NODE_ENV !== 'production'`), rate limit is raised to 10,000/15min for test suites. |
| `TEMP` | `C:\Users\kk\AppData\Local\Temp` | Windows temp directory — used by test scripts to save/read Firebase tokens. Falls back to `C:\Users\kk\AppData\Local\Temp` on Windows. |
| `VERCEL_GIT_COMMIT_SHA` | *(auto)* | Set by Vercel during deployment — reported in system health endpoint. |
| `GIT_COMMIT_SHA` | *(auto)* | Fallback for non-Vercel deployments. |

**Files:** `src/index.js` (LIVE_TEST), `scripts/bootstrap_live_test.js` (TEMP), `src/services/adminService.js` (VERCEL_GIT_COMMIT_SHA)

---

## 11. 📦 Quick Start — All at once

Copy this block into your `.env` file. Fill in the values marked `<YOUR_...>`.

```env
# ─── Required (app will crash) ───
DATABASE_URL=postgresql://<user>:<pass>@<host>/rsms?sslmode=require
FIREBASE_PROJECT_ID=<your-project-id>
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n<your-key>\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=<your-client-email>@<project>.iam.gserviceaccount.com
FIREBASE_DATABASE_URL=https://<project>-default-rtdb.firebaseio.com
FIREBASE_WEB_API_KEY=AIzaSy<...>

# ─── Image Uploads (optional, Cloudinary) ───
CLOUD_NAME=<your-cloud-name>
CLOUD_API_KEY=<your-api-key>
CLOUD_API_SECRET=<your-api-secret>

# ─── Admin TOTP MFA (required in production) ───
TOTP_ENCRYPTION_KEY=<your-strong-random-key>

# ─── Rate Limiting (optional, Upstash Redis) ───
UPSTASH_REDIS_REST_URL=https://<region>-<id>.upstash.io
UPSTASH_REDIS_REST_TOKEN=<token>

# ─── Payments (disabled by default — DO NOT ENABLE without instructions) ───
PAYMENTS_ENABLED=false
BASE_URL=http://localhost:3000
JAZZCASH_MERCHANT_ID=
JAZZCASH_PASSWORD=
JAZZCASH_INTEGRITY_SALT=
EASYPAISA_MERCHANT_ID=
EASYPAISA_PASSWORD=
EASYPAISA_INTEGRITY_SALT=
EASYPAISA_STORE_ID=1

# ─── Environment ───
NODE_ENV=development
PORT=5000
```

---

## 12. 🔍 How to Find Each Key

### Firebase (Console: https://console.firebase.google.com)

| Variable | Navigation |
|----------|------------|
| `FIREBASE_PROJECT_ID` | ⚙️ Project Settings → General → **Project ID** |
| `FIREBASE_WEB_API_KEY` | ⚙️ Project Settings → General → **Web API Key** (bottom of page) |
| `FIREBASE_PRIVATE_KEY` + `FIREBASE_CLIENT_EMAIL` | ⚙️ Project Settings → **Service Accounts** → Firebase Admin SDK → **Generate new private key** → downloads a JSON file with both fields |
| `FIREBASE_DATABASE_URL` | Build → **Realtime Database** → Data tab → URL is shown at the top |

### Cloudinary (Console: https://cloudinary.com/console)

| Variable | Navigation |
|----------|------------|
| `CLOUD_NAME`, `CLOUD_API_KEY`, `CLOUD_API_SECRET` | Dashboard → **Account Details** section |

### Neon Postgres (Console: https://console.neon.tech)

| Variable | Navigation |
|----------|------------|
| `DATABASE_URL` | Dashboard → Select project → **Connection Details** → Copy the connection string |


### Upstash Redis (Console: https://upstash.com)

| Variable | Navigation |
|----------|------------|
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | Create a Redis database → **REST API** section |

### JazzCash / Easypaisa

These are **merchant portal credentials** — obtained by registering as a merchant with each provider. The code is written and tested, but payments are **disabled** (`PAYMENTS_ENABLED=false`).

---

## 📊 Quick Stats

| Category | Count |
|----------|-------|
| 🔴 Required (crash without) | **6** |
| 🟡 Optional but recommended | **3** |
| 🔵 Optional / nice-to-have | **2** |
| ⚫ Payments (gated off) | **9** |
| 🟢 Environment / config | **2** |
| **Total variables** | **~24** |
