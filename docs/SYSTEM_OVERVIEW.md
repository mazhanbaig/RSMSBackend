# System Overview — RSMS (Real Estate Management System)

## Purpose
RSMS is a full-stack web application for managing real estate properties, tenants, leases, maintenance requests, and financial transactions. It serves property managers, landlords, and tenants through role-based dashboards.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript |
| **Backend** | Node.js, Express.js (serverless on Vercel) |
| **Database** | PostgreSQL via Prisma ORM |
| **Authentication** | Firebase Authentication (Admin SDK on backend, Client SDK on frontend) |
| **Caching** | In-memory cache (`memory-cache`) |
| **Rate Limiting** | `express-rate-limit` |
| **Security** | Helmet, CORS, input validation |
| **Hosting** | Both frontend and backend deployed as serverless functions on Vercel |
| **Testing** | Vitest (backend only) |

## Repositories
- **RSMS** — Frontend Next.js application (`github.com/mazhanbaig/RSMS`)
- **BackendRSMS** — Backend Express API (`github.com/mazhanbaig/RSMSBackend`)

## Key Features
- Role‑based access (Admin, Manager, Tenant)
- Property and unit management
- Tenant onboarding and lease agreement generation
- Maintenance request tracking
- Payment processing and invoice management
- Dashboard with real‑time analytics
- Email notifications via Firebase
- Document upload and management

## High‑Level Architecture

```
Browser
   │
   ▼
Vercel Edge / Serverless
   │
   ├── Next.js App (RSMS)
   │     └── Pages / API Routes (client-side calls)
   │
   └── Express App (BackendRSMS)
         ├── Middleware chain (CORS → Helmet → Rate Limiter → Auth → Router)
         ├── Routers → Controllers → Prisma Service
         └── Firebase Admin SDK ← → Firebase Auth
                     │
                     ▼
               PostgreSQL (via Prisma)
```

## Deployment URLs
- **Frontend**: `https://rsms.vercel.app` (production), preview deploys per branch
- **Backend**: Serverless functions deployed under the BackendRSMS Vercel project
