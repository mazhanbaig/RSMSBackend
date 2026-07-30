# Database Schema

**ORM:** Prisma 5/7  
**Database:** PostgreSQL (Neon serverless)  
**Migration Tool:** `prisma migrate`

## Model Overview (18 models)

```
Organization (1) ──── (N) User (1) ──── { Client, Owner, Property, Event, Task, Transaction, Invoice }
  │                           │
  │                           ├── (N) ActivityLog
  │                           ├── (N) AdminAuditLog
  │                           ├── (N) UserSuspension
  │                           ├── (N) ApprovalRequest (as requester or reviewer)
  │                           ├── (N) CommunityPost
  │                           ├── (N) PropertyShareLink
  │                           └── (N) ChatThread (as agent)
  │
  ├── (N) CommunityPost
  │
  Client (1) ──── { Property, Event, Task, Invoice, ApprovalRequest (sender/target), PropertyVisitor }
  Owner  (1) ──── (N) Property
  Property (1) ── { Event, Task, Invoice, PropertyShareLink }
  PropertyShareLink (1) ── (N) PropertyVisitor (1) ── (1) ChatThread
```

## Models

### Organization
| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | PK |
| `name` | String | |
| `createdAt` | DateTime | |

Relations: `User[]`, `CommunityPost[]`

### User
| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | PK |
| `uid` | String | Unique — Firebase Auth UID |
| `name` | String? | |
| `email` | String | Unique |
| `orgId` | String | FK → Organization |
| `subscriptionStatus` | String? | |
| `subscriptionExpiry` | DateTime? | |
| `photoURL` | String? | |
| `provider` | String? | Auth provider (google, password) |
| `role` | String | Default `"agent"`. Values: `agent`, `owner`, `super admin` |
| `isSuperAdmin` | Boolean | |
| `totpSecret` | String? | MFA TOTP secret |
| `totpEnabled` | Boolean | MFA status |
| `createdAt` | DateTime | |

Indexes: `orgId`, `uid`

### AdminAuditLog
| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | PK |
| `adminUserId` | String | FK → User |
| `action` | String | e.g. "SUSPEND_USER", "VIEW_SECURITY" |
| `targetType` | String? | |
| `targetId` | String? | |
| `details` | Json? | |
| `ipAddress` | String? | |
| `createdAt` | DateTime | |

Indexes: `adminUserId`, `createdAt`

### UserSuspension
| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | PK |
| `userId` | String | FK → User |
| `reason` | String | |
| `suspendedBy` | String | Admin user ID |
| `suspendedAt` | DateTime | |
| `liftedAt` | DateTime? | |
| `liftedBy` | String? | |

Index: `userId`

### Client
| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | PK |
| `uid` | String | Firebase UID (owner) |
| `orgId` | String | |
| `name` | String | |
| `email` | String? | |
| `phone` | String? | |
| `budgetMin` | Decimal? | |
| `budgetMax` | Decimal? | |
| `preferences` | String? | |
| `notes` | String? | |
| `status` | String? | |
| `pipelineStage` | String? | Sales pipeline stage |
| `userId` | String | FK → User |
| `createdAt` / `updatedAt` | DateTime | |

Indexes: `uid`, `orgId`, `userId`

### Owner
| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | PK |
| `uid` | String | |
| `orgId` | String | |
| `name` | String | |
| `email` | String? | |
| `phone` | String? | |
| `notes` | String? | |
| `userId` | String | FK → User |
| `createdAt` / `updatedAt` | DateTime | |

Relations: `Property[]`

### Property
| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | PK |
| `uid` | String | |
| `orgId` | String | |
| `title` | String | |
| `description` | String? | |
| `price` | Decimal? | |
| `status` | String? | |
| `address` | String? | |
| `city` | String? | |
| `propertyType` | String? | |
| `bedrooms` | Int? | |
| `bathrooms` | Int? | |
| `featured` | Boolean | |
| `images` | String? | Comma-separated URLs |
| `customFields` | Json? | |
| `ownerId` | String? | FK → Owner |
| `clientId` | String? | FK → Client |
| `userId` | String | FK → User |
| `createdAt` / `updatedAt` | DateTime | |

Indexes: `uid`, `orgId`, `userId`, `ownerId`, `clientId`, `city`, `price`, `featured`

### Event
| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | PK |
| `uid` | String | |
| `orgId` | String | |
| `title` | String | |
| `description` | String? | |
| `startTime` | DateTime | |
| `clientId` | String? | FK → Client |
| `propertyId` | String? | FK → Property |
| `userId` | String | FK → User |
| `createdAt` / `updatedAt` | DateTime | |

### Task
| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | PK |
| `uid` | String | |
| `orgId` | String | |
| `title` | String | |
| `description` | String? | |
| `priority` | String | |
| `completed` | Boolean | |
| `dueDate` | DateTime? | |
| `clientId` | String? | FK → Client |
| `propertyId` | String? | FK → Property |
| `userId` | String | FK → User |
| `createdAt` / `updatedAt` | DateTime | |

Index: `completed`

### Transaction
| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | PK |
| `uid` | String | |
| `orgId` | String | |
| `txnRef` | String | Unique |
| `amount` | Decimal | |
| `status` | String | Default `"pending"` |
| `gateway` | String | |
| `description` | String? | |
| `gatewayResponse` | String? | |
| `gatewayMessage` | String? | |
| `settledAt` | DateTime? | |
| `userId` | String | FK → User |
| `createdAt` / `updatedAt` | DateTime | |

Indexes: `txnRef`, `status`

### Invoice
| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | PK |
| `invoiceNo` | String | Unique |
| `title` | String | |
| `amount` | Decimal | |
| `commission` | Decimal | |
| `tax` | Decimal | Default 0 |
| `total` | Decimal | |
| `status` | String | Default `"draft"` |
| `dueDate` | DateTime? | |
| `paidAt` | DateTime? | |
| `notes` | String? | |
| `userId` | String | FK → User |
| `clientId` | String? | FK → Client |
| `propertyId` | String? | FK → Property |
| `createdAt` / `updatedAt` | DateTime | |

Indexes: `userId`, `clientId`, `propertyId`, `status`

### ApprovalRequest
| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | PK |
| `title` | String | |
| `description` | String? | |
| `targetType` | String | |
| `targetId` | String? | |
| `action` | String | |
| `payload` | Json? | |
| `status` | String | Default `"pending"` |
| `notes` | String? | |
| `requesterId` | String | FK → User (requester) |
| `reviewerId` | String? | FK → User (reviewer) |
| `senderClientId` / `targetClientId` | String? | FK → Client |
| `createdAt` / `updatedAt` | DateTime | |

### ActivityLog
| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | PK |
| `userId` | String | FK → User |
| `action` | String | |
| `entityType` | String | |
| `entityId` | String | |
| `details` | Json? | |
| `createdAt` | DateTime | |

### CommunityPost
| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | PK |
| `authorId` | String | FK → User |
| `scope` | String | `"org"` or `"global"` |
| `orgId` | String? | FK → Organization |
| `title` | String | |
| `content` | String | |
| `hidden` | Boolean | |
| `hiddenBy` / `hiddenReason` | String? | |
| `createdAt` / `updatedAt` | DateTime | |

### CommunityComment
| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | PK |
| `postId` | String | FK → CommunityPost |
| `authorId` | String | FK → User |
| `content` | String | |
| `hidden` | Boolean | |
| `createdAt` | DateTime | |

### PropertyShareLink
| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | PK |
| `token` | String | Unique |
| `propertyId` | String | FK → Property |
| `createdById` | String | FK → User |
| `active` | Boolean | |
| `viewCount` | Int | |
| `sharedWithName` | String? | |
| `createdAt` | DateTime | |

### PropertyVisitor
| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | PK |
| `shareLinkId` | String | FK → PropertyShareLink |
| `name` | String | |
| `phone` | String | |
| `convertedToClientId` | String? | FK → Client |
| `createdAt` | DateTime | |

### ChatThread
| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | PK |
| `shareLinkId` | String | FK → PropertyShareLink |
| `visitorId` | String | Unique, FK → PropertyVisitor |
| `agentUserId` | String | FK → User |
| `status` | String | Default `"active"` |
| `createdAt` | DateTime | |

## Enums
The schema uses string fields (not native Prisma enums) for status and type values. Common values found in the codebase:

| Field Pattern | Common Values |
|---------------|--------------|
| `User.role` | `agent`, `owner`, `super admin` |
| `Property.status` | `available`, `sold`, `rented`, `under-offer` |
| `Property.propertyType` | `house`, `apartment`, `condo`, `commercial`, `land` |
| `Task.priority` | `low`, `medium`, `high`, `urgent` |
| `Transaction.status` | `pending`, `success`, `failed`, `refunded` |
| `Invoice.status` | `draft`, `sent`, `paid`, `overdue`, `cancelled` |
| `ApprovalRequest.status` | `pending`, `approved`, `rejected` |
| `ChatThread.status` | `active`, `closed` |

## Migration Status
Migrations exist in `prisma/migrations/`. The schema uses `cuid()` for IDs, `@default(now())` for timestamps, and cascade deletes for user-scoped records.
