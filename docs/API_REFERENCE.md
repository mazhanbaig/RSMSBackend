# API Reference

**Base URL (development):** `http://localhost:5000/api`  
**Base URL (production):** Vercel serverless function URL

**Auth:** All protected endpoints require a Firebase ID token in the `Authorization` header: `Authorization: Bearer <token>`

**Response envelope:**
```json
{ "success": true, "data": { ... } }
{ "success": false, "message": "Error description" }
```

---

## Authentication (No auth required for most)

### POST /api/auth/signup
Register a new user (creates Firebase Auth account + User record).
**Body:** `{ email, password, firstName, lastName, phone?, role? }`
**Response:** `{ user, token }`

### POST /api/auth/login
**Body:** `{ email, password }`
**Response:** `{ user, token }`

### POST /api/auth/logout
**Headers:** Bearer token required.
**Response:** `{ success: true }`

### POST /api/auth/forgot-password
**Body:** `{ email }`
**Response:** `{ success: true }`

### POST /api/auth/verify-otp
**Body:** `{ email, otp }`
**Response:** `{ success: true, resetToken }`

### POST /api/auth/reset-password
**Body:** `{ resetToken, newPassword }`
**Response:** `{ success: true }`

### GET /api/auth/profile
**Auth:** Required. Returns the authenticated user's profile.

### PUT /api/auth/profile
**Auth:** Required. Update profile. **Body:** `{ firstName?, lastName?, phone?, avatarUrl? }`

### POST /api/auth/refresh-token
**Auth:** Required. Returns a new Firebase token.

### GET /api/auth/verify-session
**Auth:** Required. Validates the current session is still active.

---

## Users (Admin only)

### GET /api/users
List all users. **Query:** `?role=TENANT&page=1&limit=20&search=`

### GET /api/users/:id
Get user by ID.

### POST /api/users
Create a user (admin). **Body:** `{ email, firstName, lastName, role, phone? }`

### PUT /api/users/:id
Update any user.

### DELETE /api/users/:id
Soft‑delete (set `isActive = false`).

---

## Properties

### GET /api/property
List properties. **Query:** `?type=APARTMENT&city=&isPublished=true&page=&limit=`
**Auth:** Optional. Public listing when `isPublished=true`.

### GET /api/property/:id
Get property with units.

### POST /api/property
**Auth:** Required (Manager+). **Body:** `{ name, address, city, state, zipCode, type, totalUnits, amenities?, images? }`

### PUT /api/property/:id
**Auth:** Required (Manager+). Update property.

### DELETE /api/property/:id
**Auth:** Required (Manager+). Soft‑delete (unlinks units).

### GET /api/property/:id/units
List units for a property.

### POST /api/property/:id/units
**Auth:** Required. Add a unit.

### GET /api/property/public
**No auth.** Public‑facing property listing for the frontend landing page.

---

## Units

### GET /api/units/:id
Get unit details including current lease.

### PUT /api/units/:id
**Auth:** Required. Update unit (rent, status, etc.).

### DELETE /api/units/:id
**Auth:** Required. Remove unit.

---

## Leases

### GET /api/lease/agreement
List leases. **Query:** `?status=ACTIVE&tenantId=&unitId=&page=&limit=`

### POST /api/lease/agreement
**Auth:** Required (Manager+). Create lease. **Body:** `{ unitId, tenantId, startDate, endDate, rentAmount, depositAmount?, terms? }`

### GET /api/lease/agreement/:id
Get lease with related payments and documents.

### PUT /api/lease/agreement/:id
Update lease. Used for renewals, term changes.

### DELETE /api/lease/agreement/:id
Terminate lease (sets status to TERMINATED).

### GET /api/lease/agreement/:id/payments
List all payments for a lease.

### GET /api/lease/agreement/:id/documents
List all documents for a lease.

---

## Payments

### GET /api/payment
**Auth:** Required. List payments. **Query:** `?status=PAID&leaseId=&type=RENT&from=&to=`

### POST /api/payment
**Auth:** Required. Record a payment. **Body:** `{ leaseId, amount, type, method, dueDate, description? }`

### GET /api/payment/:id
Get payment details.

### PUT /api/payment/:id
Update payment (e.g., mark as refunded).

### DELETE /api/payment/:id
**Auth:** Admin only. Remove a payment record.

---

## Maintenance

### GET /api/maintenance
List maintenance requests. **Query:** `?status=PENDING&priority=HIGH&leaseId=&page=&limit=`

### POST /api/maintenance
**Auth:** Required. Create request. **Body:** `{ leaseId, title, description, priority }`

### PUT /api/maintenance/:id
Update status, assign staff. **Auth:** Manager+.

### DELETE /api/maintenance/:id
**Auth:** Admin only.

### GET /api/maintenance/stats
**Auth:** Manager+. Aggregate stats (open/resolved counts, avg resolution time).

---

## Dashboard

### GET /api/dashboard/stats
**Auth:** Required. Returns role‑specific dashboard aggregates (total properties, active leases, pending payments, open maintenance requests). Uses caching.

---

## Notifications

### GET /api/notification
**Auth:** Required. List notifications for the current user. **Query:** `?isRead=false&page=&limit=`

### PUT /api/notification/:id/read
Mark single notification as read.

### PUT /api/notification/read-all
Mark all notifications as read.

### DELETE /api/notification/:id
Delete a notification.

---

## Communication (Messages)

### GET /api/communication/messages
**Auth:** Required. List conversations (threads grouped by participant).

### POST /api/communication/messages
**Auth:** Required. Send a message. **Body:** `{ receiverId, subject, body }`

### GET /api/communication/messages/:conversationId
Get message thread.

### PUT /api/communication/messages/:id/read
Mark message as read.

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient role) |
| 404 | Not Found |
| 409 | Conflict (duplicate email, etc.) |
| 429 | Rate Limited |
| 500 | Internal Server Error |
