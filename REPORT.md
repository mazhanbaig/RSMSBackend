## Full-Stack Debug Pass — July 23, 2026

### Immediate fix

**Status: FIXED locally, NOT YET DEPLOYED to production**

- **TDZ bug (`firebaseInitError`)**: Confirmed and fixed in `src/config/firebase.js`. The variable was assigned inside the `initializeApp()` catch block (line 35 in the broken version) before its `let firebaseInitError = null` declaration ran at module-eval time. All module-level state (`db`, `auth`, `firebaseInitialized`, `firebaseInitError`, `firebaseAuthError`) is now declared at the top of the file before any init logic.
- **Verification**: `node -e "require('./src/config/firebase.js')"` exits 0 with no TDZ crash. Production boot (`NODE_ENV=production`) initializes Firebase successfully with local `.env` (`projectId: rsms-5d122`).
- **`FIREBASE_PROJECT_ID` undefined**: Added `resolveFirebaseProjectId()` which (1) uses `FIREBASE_PROJECT_ID` if set, (2) derives it from `FIREBASE_CLIENT_EMAIL` (`@PROJECT.iam.gserviceaccount.com`), (3) throws a clear error if neither works. This mitigates the production log symptom where private key was present but projectId was undefined.
- **Commits**:
  - `main`: `0877338` — `fix(firebase): resolve TDZ error in firebaseInitError, fix undefined projectId`
  - `dev`: `887574a` — cherry-picked same fix
- **Production right now**: `curl https://zstate-backend.vercel.app/api/health` → **500 FUNCTION_INVOCATION_FAILED** (old code still deployed). **Push `main` and redeploy immediately.**

**Action required (project owner):**
1. Confirm `FIREBASE_PROJECT_ID=rsms-5d122` is set in Vercel → Project Settings → Environment Variables → **Production** (not just Preview). Even with the fallback, explicit setting is preferred.
2. Push `main` commit `0877338` and verify deploy.
3. Post-deploy smoke: `curl https://zstate-backend.vercel.app/api/health` → expect 200.

---

### Part 1 — Backend

#### 1.1 Other TDZ bugs found

**None found** after auditing `src/config/` and `src/middlewares/`:

| File | Module-level vars | Verdict |
|------|-------------------|---------|
| `src/config/firebase.js` | `db`, `auth`, `firebaseInitialized`, `firebaseInitError`, `firebaseAuthError` | **Was broken — fixed** |
| `src/config/database.js` | `let prisma` (lazy init inside `getPrisma()`) | Safe — only written inside function, never read before declaration |
| `src/index.js` | `let globalLimiter, strictLimiter, adminLimiter` | Safe — assigned in same synchronous block before any use |
| `src/middlewares/*` | No module-level mutable state | Safe |

No other "capture error into variable declared later" patterns found.

#### 1.2 Boot + smoke test

| Test | Result | Details |
|------|--------|---------|
| Module load | **PASS** | `require('./src/config/firebase.js')` — no TDZ |
| Production boot | **PASS** | `NODE_ENV=production node -e "require('./src')"` — Firebase init OK, Upstash rate limiting active |
| Jest suite | **PASS** | 18 suites, 208 tests, 0 failures |
| Local smoke (port 5000) | **PASS** | All route families return expected codes — no 500s |

Local smoke results (unauthenticated — 401 expected on protected routes):

```
200 /api/health
401 /api/clients, /api/owners, /api/properties, /api/events, /api/tasks
401 /api/analytics/overview, /api/invoices, /api/approvals, /api/activity
401 /api/community/posts, /api/chat-threads, /api/admin/system/health
404 /api/public/property-view/test-token  (invalid token — expected)
```

Production smoke: **FAIL** — `/api/health` returns 500 until TDZ fix is deployed.

Live test scripts (`scripts/live_test_*.js`) referenced in docs are **not present** in the current repo (only `scripts/backfillPostgres.js` exists). Full authenticated 112-endpoint live pass cannot be re-run without restoring those scripts or manual curl with Firebase tokens.

#### 1.3 Other ESM-risk dependencies

| Package | `"type": "module"` | CJS `require()` works? | Risk |
|---------|-------------------|------------------------|------|
| `otplib@13.0.1` | Yes | **Yes** (`dist/index.cjs`) | Low — pinned, verified |
| `jwks-rsa@3.2.2` | — | **Yes** | Low — pinned via `overrides` after prior outage |
| `express-rate-limit@8.5.2` | Yes | **Yes** (`dist/index.cjs`) | Low — dual export |
| `@otplib/*` (transitive) | Yes | Via otplib CJS entry | Low |
| `@prisma/*`, `hono`, `fast-xml-parser` (transitive) | Yes | Not directly `require()`'d by app code | Low |

No new ESM-only packages added since the otplib/jwks-rsa fixes that lack a CJS export path. Recent dependency changes (from git log): `otplib@13.0.1` pin, `jwks-rsa@3.2.2` override, Prisma v7 adapters.

#### 1.4 Env var audit

**Could not verify Vercel Production env vars directly** — Vercel CLI authenticated but project is not linked locally. Audit below is code-side; owner must cross-check Vercel Production settings.

| Variable | Required for | In `.env.example` | Production concern |
|----------|-------------|-------------------|-------------------|
| `DATABASE_URL` | Prisma/Postgres | Yes | Must be set in Production |
| `FIREBASE_PROJECT_ID` | Firebase Admin | Yes | **Was undefined in prod logs** — set explicitly; fallback from `FIREBASE_CLIENT_EMAIL` added |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin | Yes | Present in prod (per logs) |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin | Yes | Needed for projectId fallback |
| `FIREBASE_DATABASE_URL` | Firebase RTDB | Yes | Must match project |
| `UPSTASH_REDIS_REST_URL` | Rate limiting | Yes | Set locally; prod likely set (no in-memory fallback warning in local prod boot) |
| `UPSTASH_REDIS_REST_TOKEN` | Rate limiting | Yes | Pair with URL above |
| `CLOUD_NAME`, `CLOUD_API_KEY`, `CLOUD_API_SECRET` | Image uploads | Yes | Only needed if `/api/images` used |
| `TOTP_ENCRYPTION_KEY` | Admin MFA | Yes | **Warns and uses dev default if unset** — must be set in Production |
| `PAYMENTS_ENABLED` | Payment routes | Yes | Defaults off (`false`) — safe |
| `JAZZCASH_*`, `EASYPAISA_*`, `BASE_URL` | Payments | Yes | Only if payments enabled |
| `FIREBASE_WEB_API_KEY` | Test scripts only | Yes | Not needed at runtime |
| `LIVE_TEST` | Dev rate-limit bypass | Yes | Ignored when `NODE_ENV=production` |
| `SENTRY_DSN` | Monitoring | In `.env.example` | Removed from codebase — can delete from Vercel if still set |

**Gap fixed in code**: `FIREBASE_PROJECT_ID` derivation fallback.
**Gap requiring Vercel action**: Explicitly set `FIREBASE_PROJECT_ID=rsms-5d122` in Production environment.

#### 1.5 Error handling recommendation

**Flagged for later — not implemented in this pass.**

Current behavior: Firebase init failure is caught and logged, but `authMiddleware` returns 500 "Server configuration error" per-request. However, if module load itself throws (as the TDZ bug did), the entire Vercel serverless function crashes at cold start — **every route returns 500**.

Recommendations:
1. **Startup health gate**: Extend `/api/health` to report `firebaseInitialized`, `firebaseInitError`, and DB connectivity. Vercel can use this for deploy verification.
2. **Never throw at module top-level**: The dev branch previously had `throw err` in the Firebase catch block — this was replaced with graceful capture during the cherry-pick. Ensure no init path re-introduces top-level throws.
3. **503 vs crash**: Consider wrapping `server.js` exports in a try/catch that serves 503 for all routes when critical deps (Firebase, Prisma) are unavailable, rather than crashing the function. Trade-off: masks misconfiguration until first request.
4. **Deploy smoke test in CI**: Add a post-deploy curl of `/api/health` that fails the deploy if response ≠ 200.

---

### Part 2 — Frontend (RSMS @ Desktop/RSMS)

#### 2.1 Current state vs plan

**Branch**: `dev` (ahead of origin by 3 commits + uncommitted WIP)

**Implemented pages** (all route files present):

| Area | Routes | Status |
|------|--------|--------|
| Auth | `/login`, `/signup` | Implemented |
| Dashboard | `/realstate/[name]` | Implemented |
| CRM | clients, owners, properties (+ add/view) | Implemented |
| Operations | events, tasks, invoices, approvals | Implemented |
| New features | activity, analytics, share-links, emi-calculator, community, chat | Implemented |
| Admin | `/admin/*` (users, orgs, security, MFA, audit-log) | Implemented |
| Public | `/public-property/[propertyid]` | Implemented |
| Payments | `/payment-callback`, `/payment-result`, `/pricing` | Implemented (feature-flagged) |

**In-progress WIP (uncommitted on dev)**:
- Loading skeletons (`loading.tsx`) for all major realstate routes
- SWR hooks (`hooks/useSWR.ts`, `lib/swr-config.ts`)
- Chat pages (`app/realstate/[name]/chat/`)
- Skeleton UI component
- SWR migration on several list pages (clients, properties, invoices, etc.)

**API alignment**: Frontend calls backend at `process.env.NEXT_PUBLIC_BACKEND_URL || "https://zstate-backend.vercel.app"` (`lib/firebase/api.ts`). Next.js proxy at `/api/proxy/[...path]` also hardcodes `https://zstate-backend.vercel.app`. **No stale endpoints found** — both paths point to the correct production backend.

#### 2.2 Console/network errors found

**Not fully sweepable in this session** — browser-based click-through requires authenticated Firebase session. Code review findings:

| Issue | Severity | Status |
|-------|----------|--------|
| Backend production 500 | **Critical** | Blocked on deploy of firebase fix |
| Frontend direct-to-backend calls bypass Next.js proxy | Low | Works if CORS allows `zstate.vercel.app` (configured in backend) |
| `TOTP_ENCRYPTION_KEY` dev fallback on backend | Medium | Flag — ensure set in prod |
| Middleware deprecation warning in build | Low | Next.js 16 warns to migrate middleware → proxy |

#### 2.3 Build health

**PASS** — `npm run build` completed with zero errors.

Warnings (non-blocking):
- `baseline-browser-mapping` data over two months old (4× during build)
- `"middleware" file convention is deprecated` — migrate to proxy convention

Build output: 19 static pages, all realstate routes dynamic (ƒ). No unexpectedly large route bundles flagged by Next.js.

---

### Part 3 — Integration

| Flow | Local status | Notes |
|------|-------------|-------|
| Backend health | **PASS** locally | 200 on `/api/health` |
| Auth-protected routes | **PASS** locally | 401 without token (not 500) |
| Frontend → backend URL | **Aligned** | Both `api.ts` and proxy point to `zstate-backend.vercel.app` |
| CORS | **Configured** | Backend allows `https://zstate.vercel.app` + localhost |
| Login → clients → property → share link → public view | **Not tested end-to-end** | Requires browser session + production backend online |
| Response shape | **Aligned in code** | `unwrap()` / `toIdMap()` normalize `{ success, message, data }` and array→map |

Production integration is **blocked** until backend deploy succeeds.

---

### Overall: is production stable now?

**No — not until the firebase fix is deployed.**

Three consecutive outages share a pattern: each fix addressed the immediate symptom without a full pass. This pass found:

1. **Root cause of current outage**: TDZ bug introduced during the Firebase error-capture fix — **fixed, committed, verified locally**.
2. **Contributing factor**: `FIREBASE_PROJECT_ID` missing in Vercel Production — **mitigated with fallback**, but must be set explicitly.
3. **Latent risks identified**: No other TDZ bugs; ESM deps are pinned and CJS-safe; env var gaps documented; startup crash architecture flagged.
4. **Test coverage**: 208 Jest tests pass; local smoke pass; production smoke fail (pre-deploy).

**Confidence after deploy + env fix**: High that the TDZ crash won't recur. Medium overall — the startup architecture still allows any future module-level throw to take down all routes. Recommend deploy verification smoke test and `/api/health` enhancement as follow-ups.

**Immediate next steps:**
1. Push `main` (`0877338`) → deploy → verify `/api/health` = 200
2. Set `FIREBASE_PROJECT_ID=rsms-5d122` in Vercel Production if not already
3. Confirm `TOTP_ENCRYPTION_KEY` is set in Production
4. Re-run production smoke after deploy
