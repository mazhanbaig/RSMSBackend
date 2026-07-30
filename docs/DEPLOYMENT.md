# Deployment — BackendRSMS

## Platform
**Vercel** — serverless functions deployment. The entire Express app is exported as a single serverless function from `api/index.js`.

## Deployment Configuration (`vercel.json`)

```json
{
  "version": 2,
  "builds": [
    { "src": "api/index.js", "use": "@vercel/node" }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "api/index.js" }
  ]
}
```

All requests to `/api/*` are routed to the Express serverless function.

## Environment Variables (managed on Vercel Dashboard)

| Variable | Source | Notes |
|----------|--------|-------|
| `DATABASE_URL` | PostgreSQL provider (e.g. Neon, Supabase, AWS RDS) | Connection string with credentials |
| `FIREBASE_PROJECT_ID` | Firebase Console → Service Account | |
| `FIREBASE_CLIENT_EMAIL` | Firebase Console → Service Account | |
| `FIREBASE_PRIVATE_KEY` | Firebase Console → Service Account | Base64‑encoded, decoded at runtime |
| `CORS_ORIGIN` | Frontend URL | `https://rsms.vercel.app` in production |
| `NODE_VERSION` | Node.js 18+ | LTS recommended |

## Build Settings (Vercel)

| Setting | Value |
|---------|-------|
| **Build Command** | `npm install` (Vercel auto‑detects) |
| **Output Directory** | `.vercel/output` |
| **Node.js Version** | 18.x (set via `NODE_VERSION` env) |
| **Function Region** | `iad1` (default, configurable) |

## Prisma and Database

Migrations must be applied outside the Vercel deployment (no SSH access):
```bash
npx prisma migrate deploy    # Apply pending migrations
npx prisma generate          # Regenerate Prisma client
```

**Important:** Prisma client must be generated during build. The build command should include:
```bash
npx prisma generate && npm run build
```

## Deployment Steps

1. Push to the `main` branch (or merge a PR to main).
2. Vercel auto‑deploys from the GitHub integration.
3. Verify: `https://<project>.vercel.app/api/health` (if a health endpoint exists).

## Local Development
```bash
npm install
cp .env.example .env          # Fill in environment variables
npx prisma migrate dev        # Apply migrations locally
npm run dev                   # Starts on http://localhost:5000
```

## Production Considerations
- **Cold starts**: Serverless functions may take 1–3 s to boot after inactivity. Consider a keep‑warm cron job.
- **Database connection pooling**: Use a connection pooler (e.g., PgBouncer via Supabase/Neon) to avoid exhausting connections under concurrent invocations.
- **Memory**: Default Vercel serverless memory is 1024 MB; can be increased via `vercel.json` if needed.
- **Timeout**: Vercel Hobby plan has a 10 s function timeout. Pro plan allows up to 60 s (or 900 s for background functions).
