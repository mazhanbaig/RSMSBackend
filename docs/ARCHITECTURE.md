# Backend Architecture

## Overview
The backend is an Express.js application designed to run as a serverless function on Vercel. The entry point is `api/index.js`, which exports a handler for Vercel's serverless runtime.

## Entry Point — `api/index.js`
```js
// Pseudocode flow
const app = express();
app.use(corsMiddleware);
app.use(helmet());
app.use(rateLimiter);
app.use(express.json({ limit: '10mb' }));
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/property', propertyRouter);
app.use('/api/maintenance', maintenanceRouter);
app.use('/api/lease', leaseRouter);
app.use('/api/payment', paymentRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/notification', notificationRouter);
app.use('/api/communication', communicationRouter);
app.use(errorHandler);
module.exports = app;
```

## Middleware Pipeline (order matters)

1. **CORS** — `cors({ origin: process.env.CORS_ORIGIN })`. Allows requests from the frontend domain.
2. **Helmet** — Sets security headers (X‑Frame‑Options, CSP, etc.).
3. **Rate Limiter** — `express-rate-limit` with a custom IP key generator. Limits requests per IP to prevent abuse.
4. **JSON Body Parser** — Parses `application/json` with a 10 MB limit (accommodates document uploads encoded as JSON).
5. **Firebase Auth Middleware** — Applied to protected routes. Verifies the `Authorization: Bearer <token>` header using Firebase Admin SDK. Attaches `req.user` (uid, email, role) on success.
6. **Router‑specific middleware** — Some routers (e.g., admin-only routes) apply additional role checks.

## Router / Controller / Service Pattern

```
Route file (e.g., authRoutes.js)
   │  Defines HTTP method + path + middleware + controller function
   ▼
Controller (e.g., authController.js)
   │  Validates input, calls service, formats response
   ▼
Service / Prisma (e.g., prisma.user.create)
   │  Direct Prisma queries against PostgreSQL
   ▼
Response (res.json({ success: true, data }))
```

This pattern is not strictly layered — most controllers call Prisma directly rather than through a dedicated service layer. Some business logic lives in controllers.

## Caching Layer
A wrapper module (`utils/apiCache.js`) uses `memory-cache` to cache GET response data. Cache keys are based on the request URL. Used sparingly — primarily on dashboard aggregate endpoints.

## Error Handling
A global error handler middleware catches unhandled errors and returns a consistent JSON shape:
```json
{ "success": false, "message": "Error description" }
```

Prisma errors (unique constraint violations, not‑found records) are caught and mapped to user‑friendly messages.

## File Structure

```
BackendRSMS/
├── api/index.js            # Serverless entry point
├── src/
│   ├── config/             # Firebase init, Prisma client
│   ├── routes/             # Express routers (auth, users, property, etc.)
│   ├── controllers/        # Request handlers
│   ├── middlewares/        # Auth, error handler, validators
│   ├── utils/              # Caching, helpers, email templates
│   ├── validators/         # Input validation schemas
│   └── index.js            # Legacy entry point (not used in production)
├── prisma/
│   └── schema.prisma       # Database schema
├── tests/                  # Vitest test suites
├── vercel.json             # Serverless deployment config
└── package.json
```

## Key Design Decisions
- **Monolithic Express app deployed as a single serverless function** — simpler than microservices for this scale. Cold starts are a trade‑off.
- **Firebase Auth as the sole identity provider** — no local password storage; tokens are verified on every protected request.
- **Prisma as ORM** — type‑safe queries, auto‑generated client, easy migrations.
- **No background job queue** — notifications are sent synchronously within request handlers.
