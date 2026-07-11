# Frontend Migration Guide — Firebase RTDB → Postgres

## Overview

The backend has migrated from a single generic `/api/data` endpoint to per-entity REST routes backed by Postgres (Neon) via Prisma. Firebase Auth is **untouched** — authentication flow (`Authorization: Bearer <token>`) is exactly the same.

**What changed:** The old path-based data API is gone. Each entity now has its own URL pattern.
**What stayed the same:** Auth (/api/auth), Images (/api/images), Payments (/api/payment).
**Firebase RTDB:** Data still exists and is readable — rollback safety net.

---

## 1. Old API — Before Migration

All data operations went through a single endpoint:

| Method | Endpoint | Body / Query | Description |
|--------|----------|-------------|-------------|
| GET | `/api/data` | `?path=clients/{uid}/{id}` | Fetch a single record by path |
| POST | `/api/data` | `{ path, data }` | Create/replace data at path |
| PUT | `/api/data` | `{ path, data }` | Update data at path |
| DELETE | `/api/data` | `{ path }` | Delete data at path |

The path included the user's Firebase UID for ownership scoping, e.g.:
- `clients/{uid}/{recordId}`
- `owners/{uid}/{recordId}`
- `properties/{uid}/{recordId}`
- `events/{uid}/{recordId}`
- `tasks/{uid}/{recordId}`

---

## 2. New API — After Migration

### Clients

| Method | Endpoint | Auth | Body | Response |
|--------|----------|------|------|----------|
| GET | `/api/clients` | Bearer token | — | Array of user's clients |
| GET | `/api/clients/:id` | Bearer token | — | Single client |
| POST | `/api/clients` | Bearer token | `{ name (required), email?, phone?, budgetMin?, budgetMax?, preferences?, notes?, status? }` | Created client |
| PUT | `/api/clients/:id` | Bearer token | Same fields as POST | Updated client |
| DELETE | `/api/clients/:id` | Bearer token | — | 200 OK |

### Owners

| Method | Endpoint | Auth | Body | Response |
|--------|----------|------|------|----------|
| GET | `/api/owners` | Bearer token | — | Array of user's owners |
| GET | `/api/owners/:id` | Bearer token | — | Single owner |
| POST | `/api/owners` | Bearer token | `{ name (required), email?, phone?, notes? }` | Created owner |
| PUT | `/api/owners/:id` | Bearer token | Same fields as POST | Updated owner |
| DELETE | `/api/owners/:id` | Bearer token | — | 200 OK |

### Properties

| Method | Endpoint | Auth | Body | Response |
|--------|----------|------|------|----------|
| GET | `/api/properties` | Bearer token | — | Array of user's properties |
| GET | `/api/properties/:id` | Bearer token | — | Single property |
| POST | `/api/properties` | Bearer token | `{ title (required), description?, price?, status?, images?, ownerId?, clientId? }` | Created property |
| PUT | `/api/properties/:id` | Bearer token | Same fields as POST | Updated property |
| DELETE | `/api/properties/:id` | Bearer token | — | 200 OK |

### Events

| Method | Endpoint | Auth | Body | Response |
|--------|----------|------|------|----------|
| GET | `/api/events` | Bearer token | — | Array of user's events |
| GET | `/api/events/:id` | Bearer token | — | Single event |
| POST | `/api/events` | Bearer token | `{ title (required), description?, startTime (ISO 8601), clientId?, propertyId? }` | Created event |
| PUT | `/api/events/:id` | Bearer token | Same fields as POST | Updated event |
| DELETE | `/api/events/:id` | Bearer token | — | 200 OK |

### Tasks

| Method | Endpoint | Auth | Body | Response |
|--------|----------|------|------|----------|
| GET | `/api/tasks` | Bearer token | — | Array of user's tasks |
| GET | `/api/tasks/:id` | Bearer token | — | Single task |
| POST | `/api/tasks` | Bearer token | `{ title (required), description?, priority? ("low"|"medium"|"high"), completed?, dueDate? (ISO 8601), clientId?, propertyId? }` | Created task |
| PUT | `/api/tasks/:id` | Bearer token | Same fields as POST | Updated task |
| DELETE | `/api/tasks/:id` | Bearer token | — | 200 OK |

---

## 3. Common Response Shape

Every endpoint returns the same `ResponseObj` format:

```json
{
  "success": true,
  "message": "Clients fetched",
  "data": [ ... ],              // null on errors
  "error": null                  // null on success, string on errors
}
```

On error (400, 403, 404, 500):
```json
{
  "success": false,
  "message": "Client not found",
  "data": null,
  "error": null
}
```

---

## 4. Key Differences from Old API

| Aspect | Old API | New API |
|--------|---------|---------|
| URL | Single `/api/data` | One per entity |
| Record IDs | Firebase-generated keys | Postgres auto-generated CUIDs |
| Ownership | Path-based (`clients/{uid}/{id}`) | Implicit (resolved from auth token) |
| List fetch | Not supported (only single record) | Supported (`GET /api/clients`) |
| Field types | Firebase native types | Postgres typed |
| `budgetMin`/`budgetMax` | Not available | Now supported on clients |
| `status` on clients | Not available | Now supported |
| Event `date` | Flexible | Must be ISO 8601 string |
| Task `priority` | Optional | Defaults to `"medium"` |
| Auth header | Same (`Bearer <token>`) | Same (`Bearer <token>`) |

---

## 5. Migration Steps (Frontend)

1. **Find all `/api/data` calls** in the frontend codebase
2. **Map each call** to the corresponding entity endpoint using the tables above
3. **Replace path-based IDs** with the new CUIDs returned by Postgres
4. **Update list views** to use `GET /api/{entity}` instead of iterating individual keys
5. **Update create/update payloads** to match the new field schemas
6. **Update event forms** to send `startTime` as ISO 8601 string (not a flexible date)
7. **Test ownership isolation** — each user should only see their own data

---

## 6. Routes That DID NOT Change

These endpoints remain exactly as before:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth` | POST | Login / save user |
| `/api/auth/logout` | POST | Force logout all devices |
| `/api/images/addimages` | POST | Upload images (multipart) |
| `/api/images/deleteimage/:public_id` | DELETE | Delete image |
| `/api/payment/create-payment` | POST | Create payment payload |
| `/api/payment/webhook/jazzcash` | POST | JazzCash callback |
| `/api/payment/webhook/easypaisa` | POST | Easypaisa callback |

---

## 7. Example: Old → New Migration

### Old (Firebase RTDB)
```js
// List all clients
const uid = decodedToken.uid;
const snap = await firebase.database().ref(`clients/${uid}`).once('value');
const clients = snap.val(); // { firebaseKey1: { name: '...' }, firebaseKey2: { ... } }

// Create a client
await firebase.database().ref(`clients/${uid}/newKey`).set({ name: 'Alice', email: 'a@b.com' });

// Delete a client
await firebase.database().ref(`clients/${uid}/firebaseKey1`).remove();
```

### New (Postgres via REST API)
```js
// List all clients
const res = await fetch('/api/clients', { headers: { Authorization: `Bearer ${token}` } });
const { data: clients } = await res.json(); // [{ id: 'cuid1', name: '...' }, { id: 'cuid2', ... }]

// Create a client
const res = await fetch('/api/clients', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Alice', email: 'a@b.com' }),
});
const { data: created } = await res.json(); // { id: 'cuid123', name: 'Alice', ... }

// Delete a client
await fetch('/api/clients/cuid123', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
```
