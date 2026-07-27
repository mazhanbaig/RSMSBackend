# BackendRSMS — Real Estate Management API

Express 5 / Prisma 7 / PostgreSQL (Neon) backend for [RSMS](https://github.com/anomalyco/RSMS).

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Express 5
- **ORM:** Prisma 7 (PostgreSQL via Neon)
- **Auth:** Firebase Admin SDK (token verification)
- **Rate Limiting:** Upstash Redis (Vercel-compatible)
- **File Uploads:** Cloudinary (multer + sharp)
- **Payments:** JazzCash integration
- **Logging:** Pino
- **Compression:** compression (gzip)

## Getting Started

```bash
cp .env.example .env   # Fill in your DB, Firebase, Redis, Cloudinary keys
npm install
npm start              # Runs on port 5000
```

## API Endpoints

| Resource   | Endpoints                                          |
|------------|----------------------------------------------------|
| Auth       | POST /api/auth, DELETE /api/auth/account           |
| Clients    | CRUD + PATCH /:id/pipeline                         |
| Owners     | CRUD                                               |
| Properties | CRUD + PATCH /:id/feature, PATCH /:id/custom-fields|
| Events     | CRUD                                               |
| Tasks      | CRUD                                               |
| Invoices   | CRUD                                               |
| Activity   | GET /api/activity (paginated)                      |
| Analytics  | GET /overview, /clients-by-stage, /properties-timeline |
| Community  | Posts CRUD + comments (org/public scopes)          |
| Chat       | Thread management + public chat initiation         |
| Approvals  | List / review                                      |
| Images     | Upload to Cloudinary, delete                       |
| Share      | Generate property share links + public view        |
| Payments   | JazzCash payment creation                          |

All list endpoints support `?page=&limit=&search=` for pagination and search.

## Architecture

```
src/
  config/     — Prisma client, Firebase admin, Redis
  controllers/— Request handlers
  services/   — Business logic
  middlewares/— Auth, validation, uploads
  utils/      — Response helper
  routes/     — Express routers
```
