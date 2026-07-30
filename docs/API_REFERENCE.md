# API Reference

**Base URL (development):** `http://localhost:5000`  
**Base URL (production):** Vercel serverless function (e.g. `https://backendrsms.vercel.app`)

**Auth:** Most endpoints require a Firebase ID token in the `Authorization` header:  
`Authorization: Bearer <token>`

**Response envelope:**
```json
{ "success": true, "data": { ... }, "message": "ok" }
{ "success": false, "message": "Error description", "data": null, "error": null }
```

---

## Authentication (`/api/auth`)

### POST /api/auth/signup
Register. **Body:** `{ email, password, name?, orgName? }`

### POST /api/auth/login
**Body:** `{ email, password }` **Response:** `{ user, token }`

### POST /api/auth/logout
**Headers:** Bearer token.

### POST /api/auth/forgot-password
**Body:** `{ email }`

### POST /api/auth/verify-otp
**Body:** `{ email, otp }` **Response:** `{ resetToken }`

### POST /api/auth/reset-password
**Body:** `{ resetToken, newPassword }`

### GET /api/auth/profile
**Auth.** Returns current user profile.

### PUT /api/auth/profile
**Auth.** Update profile. **Body:** `{ name?, photoURL?, phone? }`

### POST /api/auth/refresh-token
**Auth.** Returns refreshed token.

---

## Clients (`/api/clients`) — Strict rate limit

### GET /api/clients
List. **Query:** `?page=&limit=&search=&pipelineStage=`

### GET /api/clients/:id
Get one.

### POST /api/clients
Create. **Body:** `{ name, email?, phone?, budgetMin?, budgetMax?, preferences?, pipelineStage? }`

### PUT /api/clients/:id
Update.

### DELETE /api/clients/:id
Remove.

### PATCH /api/clients/:id/pipeline
Update pipeline stage. **Body:** `{ pipelineStage }`

---

## Owners (`/api/owners`) — Strict rate limit

### GET /api/owners
**Query:** `?page=&limit=&search=`

### GET /api/owners/:id

### POST /api/owners
**Body:** `{ name, email?, phone?, notes? }`

### PUT /api/owners/:id

### DELETE /api/owners/:id

---

## Properties (`/api/properties`) — Strict rate limit

### GET /api/properties
**Query:** `?page=&limit=&city=&status=&propertyType=&featured=&search=`

### GET /api/properties/:id

### POST /api/properties
**Body:** `{ title, description?, price?, status?, address?, city?, propertyType?, bedrooms?, bathrooms?, images?, ownerId?, clientId? }`

### PUT /api/properties/:id

### DELETE /api/properties/:id

### PATCH /api/properties/:id/feature
Toggle featured. **Body:** `{ featured: boolean }`

### PATCH /api/properties/:id/custom-fields
Update custom fields. **Body:** `{ customFields: { ... } }`

---

## Events (`/api/events`) — Strict rate limit

### GET /api/events
**Query:** `?page=&limit=&startDate=&endDate=`

### GET /api/events/:id

### POST /api/events
**Body:** `{ title, description?, startTime, clientId?, propertyId? }`

### PUT /api/events/:id

### DELETE /api/events/:id

---

## Tasks (`/api/tasks`) — Strict rate limit

### GET /api/tasks
**Query:** `?page=&limit=&completed=&priority=`

### GET /api/tasks/:id

### POST /api/tasks
**Body:** `{ title, description?, priority, dueDate?, clientId?, propertyId? }`

### PUT /api/tasks/:id

### DELETE /api/tasks/:id

---

## Tools (`/api/tools`)

### GET /api/tools/emi-calculator
**Query:** `?amount=&rate=&term=` — Calculate EMI.

---

## Analytics (`/api/analytics`)

### GET /api/analytics/overview
Dashboard stats (properties, clients, events, tasks counts).

### GET /api/analytics/clients-by-stage
Pipeline stage distribution.

### GET /api/analytics/properties-timeline
Properties added over time.

---

## Invoices (`/api/invoices`) — Strict rate limit

### GET /api/invoices
**Query:** `?page=&limit=&status=&clientId=`

### GET /api/invoices/:id

### POST /api/invoices
**Body:** `{ title, amount, commission, tax?, total, status?, dueDate?, clientId?, propertyId?, notes? }`

### PUT /api/invoices/:id

### DELETE /api/invoices/:id

---

## Approvals (`/api/approvals`) — Strict rate limit

### GET /api/approvals
List approval requests. **Query:** `?status=pending&page=&limit=`

### POST /api/approvals
Create a request. **Body:** `{ title, description?, targetType, targetId?, action, payload?, reviewerId? }`

### PUT /api/approvals/:id/review
Review (approve/reject). **Body:** `{ status: "approved"|"rejected", notes? }`

---

## Payment (`/api/payment`)

### POST /api/payment/jazzcash
Initiate JazzCash payment.

### POST /api/payment/jazzcash/webhook
JazzCash webhook callback.

### POST /api/payment/easypaisa
Initiate EasyPaisa payment.

---

## Admin (`/api/admin`) — Admin only, strict rate limit (10/min)

### POST /api/admin/mfa/enroll
Enroll admin MFA.

### POST /api/admin/mfa/verify-enrollment
Verify MFA enrollment.

### GET /api/admin/mfa/status
Check MFA status.

### GET /api/admin/users
List all users. **Query:** `?page=&limit=`

### GET /api/admin/users/:uid
Get user by UID.

### POST /api/admin/users/:uid/suspend
Suspend user. **Body:** `{ reason }`

### POST /api/admin/users/:uid/unsuspend
Unsuspend user.

### GET /api/admin/users/:uid/mfa-status
Get user MFA status.

### GET /api/admin/organizations
List orgs.

### GET /api/admin/security/overview
Security dashboard overview.

### GET /api/admin/security/audit-log
Audit log entries.

### GET /api/admin/security/vulnerabilities
Security vulnerabilities report.

### GET /api/admin/system/health
System health check.

### GET /api/admin/community/posts
List all community posts.

### POST /api/admin/community/posts/:id/hide
Hide a post.

### POST /api/admin/community/posts/:id/unhide
Unhide a post.

### GET /api/admin/property-shares/overview
Share links overview.

### GET /api/admin/chat-threads/overview
Chat threads overview.

---

## Activity (`/api/activity`) — Strict rate limit

### GET /api/activity
Recent activity log. **Query:** `?page=&limit=&entityType=`

---

## Community (`/api/community`) — Strict rate limit

### GET /api/community/posts
List community posts.

### POST /api/community/posts
Create a post. **Body:** `{ title, content, scope: "org"|"global" }`

### GET /api/community/posts/:id
Get post with comments.

### POST /api/community/posts/:id/comments
Add comment. **Body:** `{ content }`

### DELETE /api/community/posts/:id
Delete own post.

---

## Share Links (`/api/share`)

### POST /api/share/property
Create property share link. **Body:** `{ propertyId, sharedWithName? }`

### GET /api/share/property/:token
Access shared property (public, no auth).

### POST /api/share/property/:token/visit
Record visitor. **Body:** `{ name, phone }`

---

## Chat (`/api/chat`)

### GET /api/chat/threads
List agent's chat threads.

### GET /api/chat/threads/:id
Get a thread (with messages).

### POST /api/chat/threads/:id/message
Send message. **Body:** `{ content }`

### PATCH /api/chat/threads/:id/status
Update status. **Body:** `{ status: "active"|"closed" }`

---

## Images (`/api/images`)

### POST /api/images/upload
Upload image. Returns Cloudinary URL.

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
| 409 | Conflict (duplicate) |
| 413 | Payload Too Large (>1 MB) |
| 429 | Rate Limited |
| 500 | Internal Server Error |
