# Testing — BackendRSMS

## Test Framework
**Vitest** (v1.x) — configured via `vitest.config.js`.

## Running Tests
```bash
npm test             # Run all tests once
npm run test:watch   # Watch mode for development
npm run test:coverage # Run with coverage report
```

## Test Structure
```
tests/
├── auth.test.js       # Authentication endpoints (signup, login, profile)
├── property.test.js   # Property CRUD
├── lease.test.js      # Lease agreement endpoints
├── payment.test.js    # Payment recording and listing
├── maintenance.test.js# Maintenance request flow
├── users.test.js      # User management
├── dashboard.test.js  # Dashboard stats
├── middleware.test.js  # Auth middleware, rate limiter, error handler
├── validators.test.js # Input validation logic
└── integration/       # Cross‑domain integration tests (planned, not yet populated)
```

## Testing Patterns
- **Unit tests** — Individual controller and service functions with mocked Prisma.
- **Integration tests** — End‑to‑end request/response via `supertest` (Express app instance).
- **Mocking** — Prisma client is mocked via `vitest.mock('prisma')`. Firebase Admin SDK is mocked (verifyIdToken, createUser, etc.).

## Coverage Targets
- **Current**: ~40% line coverage
- **Target**: 70%+ (as tracked in project goals)

## What is Not Tested
- Real database interactions (no test database is configured — all Prisma calls are mocked).
- External services (Firebase Auth REST, email delivery).
- Rate limiter behavior under concurrency.
- CORS headers in production configurations.

## CI Integration
Tests are configured to run on push to any branch via GitHub Actions (`.github/workflows/test.yml`). The workflow:
1. Installs dependencies
2. Generates Prisma client
3. Runs `npm test`
4. Fails the build if any tests fail or coverage drops below threshold

## Adding Tests
Follow the convention in `tests/property.test.js`:
```javascript
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../api/index.js';

describe('GET /api/property', () => {
  it('returns a list of published properties', async () => {
    const res = await request(app).get('/api/property/public');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
```
