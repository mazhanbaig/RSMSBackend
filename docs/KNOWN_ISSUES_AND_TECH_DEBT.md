# Known Issues & Technical Debt

## Known Issues

### 1. Rate Limiter IPv6 Key Failure (FIXED)
- **File:** `src/middlewares/rateLimiter.js`
- **Problem:** `express-rate-limit` v7+ validates IP addresses. IPv6 loopback `::1` is rejected when the key is generated as a raw string via the default `keyGenerator`.
- **Fix Applied:** A custom `ipKeyGenerator` function extracts the IP from `req.ip` and passes it as `{ ip: req.ip }` to the memory store.
- **Status:** Resolved in current deployment.

### 2. Firebase Admin `cert()` Import (FIXED)
- **File:** `src/config/firebase.js`
- **Problem:** `admin.credential.cert()` was called as `admin.cert()` which does not exist (`admin.cert is not a function`).
- **Fix Applied:** Changed import to destructure `cert` from `firebase-admin/app` and call it directly: `cert(JSON.parse(decodedKey))`.
- **Status:** Resolved in current deployment.

### 3. `requestId` Module Import (FIXED)
- **File:** `src/middlewares/errorHandler.js`
- **Problem:** The `requestId` module exported a function (not an object), but was imported via destructuring `const { generateRequestId } = require(...)`.
- **Fix Applied:** Changed to `const requestId = require(...)` and called as `requestId()`.
- **Status:** Resolved in current deployment.

### 4. `MemoryCache` Import Path (FIXED)
- **File:** `src/utils/apiCache.js`
- **Problem:** `const { MemoryCache } = require('memory-cache')` — `memory-cache` does not export named exports.
- **Fix Applied:** Changed to `const cache = require('memory-cache')` and used `cache.put()` / `cache.get()`.
- **Status:** Resolved in current deployment.

## Technical Debt

### 1. No Centralized Service Layer
Controllers call Prisma directly rather than through a dedicated service layer. This makes unit testing harder and duplicates query logic across controllers.

### 2. Inconsistent Input Validation
Some endpoints have full Joi/Zod validation; others use simple inline checks or no validation at all. Attack surface for malformed requests.

### 3. No Background Job Queue
Notifications, email sending, and document processing happen synchronously in request handlers. Under load, this increases response latency.

### 4. Hardcoded Cache TTLs
Cache expiry times (TTLs) are scattered across controllers as magic numbers (`cache.put(key, data, 60000)` — 60 seconds). Should be centralized in a config.

### 5. Prisma Query Performance
Some dashboard queries do not use pagination or selective field projection. Could lead to slow responses as dataset grows.

### 6. Missing Indexes
- No composite index on `Payment(leaseId, status)` for payment reconciliation queries.
- No index on `AuditLog(userId, createdAt)` for audit trail lookups.

### 7. Error Response Inconsistency
- Some errors return `{ error: "msg" }` instead of `{ success: false, message: "msg" }`.
- Frontend must handle both shapes.

### 8. Mixed Module Systems
- The codebase uses CommonJS (`require`) in most files but has some ESM (`import`) patterns. Mixed usage can cause confusion and import failures.

### 9. No API Versioning
All routes are under `/api/` with no version prefix (e.g., `/v1/`). Breaking changes will affect all clients simultaneously.

### 10. Limited Test Coverage
~40% line coverage. No integration tests that hit a real database. No e2e tests.

## TODO Markers Found in Code
- `// TODO: add pagination` — dashboard stats endpoint
- `// TODO: validate input` — property update controller
- `// FIXME: rate limit this endpoint` — login/signup POST handlers
- `// HACK: workaround for Prisma enum issue` — lease status comparison
