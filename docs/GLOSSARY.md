# Glossary

## Domain Terms

| Term | Definition |
|------|-----------|
| **Admin** | User role with full system access (create/edit/delete all records, manage users) |
| **Audit Log** | Immutable record of user actions (login, data changes) for security review |
| **Deposit** | Security deposit held against property damage (linked to a lease) |
| **Document** | Uploaded file (lease PDF, inspection report, notice) attached to a lease |
| **Lease Agreement** | Legal contract between landlord (via property manager) and tenant |
| **Maintenance Request** | Tenant‑ or manager‑submitted work order with priority and status tracking |
| **Manager** | User role that manages properties, leases, and maintenance (no admin‑level delete) |
| **Message** | Internal communication between users (tenant ↔ manager) |
| **Notification** | System‑generated alert for upcoming rent, lease expiry, maintenance updates |
| **Payment** | Financial transaction (rent, deposit, fee, or refund) tied to a lease |
| **Property** | A building or complex containing one or more rental units |
| **Tenant** | User role representing a leaseholder (limited to own records) |
| **Unit** | Individual rentable space within a property (apartment, office, etc.) |

## Technical Terms

| Term | Definition |
|------|-----------|
| **CORS** | Cross‑Origin Resource Sharing — browser security mechanism that the backend configures to allow frontend requests |
| **Firebase Admin SDK** | Server‑side library that verifies tokens and manages Firebase Auth users |
| **Firebase Client SDK** | Browser‑side library for sign‑in, token storage, and auth state observation |
| **Helmet** | Express middleware that sets secure HTTP headers (CSP, HSTS, etc.) |
| **ID Token** | Firebase‑issued JWT proving a user's identity; sent in the `Authorization` header |
| **JWT** | JSON Web Token — the format Firebase ID tokens use |
| **Prisma** | ORM (Object‑Relational Mapper) for Node.js that generates a type‑safe client from the schema |
| **RBAC** | Role‑Based Access Control — authorization strategy based on user roles |
| **Serverless Function** | Single‑purpose, ephemeral cloud function that scales automatically |
| **SWR** | React hook (stale‑while‑revalidate) for data fetching with caching — used on the frontend |
| **Vercel** | Cloud platform that hosts both the frontend Next.js app and the backend serverless function |
