# Authentication & Security

## Identity Provider
**Firebase Authentication** is the sole identity provider. There is no local password hashing or session store.

- **Firebase Admin SDK** (backend) — verifies ID tokens, creates/deletes users, manages custom claims.
- **Firebase Client SDK** (frontend) — handles sign‑in, token refresh, token storage.

## Authentication Flow

```
1. User submits email + password to POST /api/auth/login
2. Backend validates with Firebase Auth REST API (via Admin SDK)
3. Backend returns a Firebase ID token (JWT)
4. Frontend stores token (in-memory, httpOnly cookie, or localStorage)
5. Subsequent requests include token in Authorization header
6. Backend auth middleware decodes & verifies token, attaches req.user
```

## Backend Auth Middleware (`middlewares/auth.js`)
- Extracts token from `Authorization: Bearer <token>`
- Calls `admin.auth().verifyIdToken(token)`
- Looks up the corresponding `User` record by `firebaseUid`
- Attaches `req.user = { id, firebaseUid, email, role, firstName, lastName }`
- Returns 401 if token missing, expired, or user not found

## Role‑Based Access Control (RBAC)
- **Admin**: Full access to all endpoints
- **Manager**: Can create/update properties, leases, maintenance; cannot delete users or payments
- **Tenant**: Can view own lease/payment/maintenance records; cannot access admin endpoints

Role checks are applied per‑route (e.g., `middlewares/adminOnly.js`, inline checks in controllers).

## Security Middleware Stack (in order)

| Middleware | What it does |
|-----------|-------------|
| **CORS** | Restricts origins to configured frontend domain |
| **Helmet** | Sets security headers: CSP, X‑Frame‑Options, X‑Content‑Type‑Options, HSTS |
| **Rate Limiter** | `express-rate-limit` — 100 requests per IP per 15 min window |
| **JSON Body Parser** | 10 MB limit (prevents oversized payloads) |
| **Auth Middleware** | Token verification (applied per route group, not globally) |
| **Error Handler** | Catches all errors; prevents stack traces in production |

## Rate Limiting
- **Window**: 15 minutes
- **Max**: 100 requests per IP
- **Key**: Client IP (custom generator handles IPv6 loopback `::1` vs `127.0.0.1`)
- **Response**: 429 with `Retry-After` header

## CORS Configuration
- Origin: `process.env.CORS_ORIGIN` (defaults to `http://localhost:3000`)
- Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
- Headers: Content-Type, Authorization, X-Requested-With

## Input Validation
- Custom validators in `src/validators/` for email format, password strength, required fields
- Some controllers have inline validation; not all endpoints are consistently validated

## Environment Variables (Security‑Relevant)
| Variable | Purpose |
|----------|---------|
| `FIREBASE_PROJECT_ID` | Firebase project |
| `FIREBASE_CLIENT_EMAIL` | Service account email |
| `FIREBASE_PRIVATE_KEY` | Service account private key |
| `DATABASE_URL` | PostgreSQL connection string |
| `CORS_ORIGIN` | Allowed origin |
| `JWT_SECRET` | Reserved for future JWT use |
| `ENCRYPTION_KEY` | Reserved for future encryption |

## Hardening Notes
- Firebase private key is base64‑encoded in the environment variable and decoded at runtime
- No secrets are logged or exposed in error responses
- `trust proxy` is enabled for Vercel deployments (correct client IP detection behind proxy)
