# Frontend (RSMS / Z-State) — Agent Context

## What this frontend connects to

Backend API: `https://zstate-backend.vercel.app`

All API routes are prefixed `/api/`. Full route list:

| Prefix | Purpose |
|---|---|
| `/api/auth` | Login, register, profile |
| `/api/clients` | Client CRUD |
| `/api/owners` | Owner CRUD |
| `/api/properties` | Property CRUD |
| `/api/events` | Event CRUD |
| `/api/tasks` | Task CRUD |
| `/api/analytics` | Dashboard analytics |
| `/api/invoices` | Invoice management |
| `/api/approvals` | Approval workflows |
| `/api/admin` | Super-admin operations |
| `/api/activity` | Activity log |
| `/api/community` | Community posts |
| `/api/images` | Image upload (Cloudinary) |
| `/api/tools` | Installment calculator |
| `/api/payment` | Payment initiation (gated off) |
| `/api/health` | Health check (unauthenticated) |

## Authentication

Every protected route requires a Firebase ID token in the Authorization header:

```
Authorization: Bearer <firebase_id_token>
```

- Auth provider: Firebase Authentication (Google sign-in)
- Get the token: `await firebase.auth().currentUser.getIdToken()`
- Token expires every 1 hour — always call `getIdToken()` fresh per request, never cache it

## API response shape

All responses follow this envelope:

```json
{
  "success": true | false,
  "message": "human readable string",
  "data": { ... } | [ ... ] | null,
  "error": "error detail (dev only)" | null
}
```

## CORS

Allowed origins: `http://localhost:3000`, `http://localhost:3001`, `http://localhost:3002`, `https://zstate.vercel.app`

If the frontend is deployed to a different domain, that domain must be added to the backend CORS config.

## Migration note

The old `/api/data?path=...` generic endpoint no longer exists. All data access is through the per-entity REST routes listed above. See `FRONTEND_MIGRATION_GUIDE.md` in the backend repo for the full mapping if needed.

## Payments

Payment UI should remain hidden/disabled. `PAYMENTS_ENABLED=false` on the backend — payment endpoints exist but are gated off intentionally.

## Current known issue (July 22, 2026)

Backend is live and returning correct responses. If you see 401 on authenticated routes:
1. Confirm the Firebase ID token is being sent correctly in the `Authorization: Bearer <token>` header
2. Confirm `getIdToken()` is called fresh (tokens expire after 1 hour)
3. The backend was recently redeployed — if the frontend cached a stale token, refresh it
