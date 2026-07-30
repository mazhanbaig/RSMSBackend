# Database Schema

**ORM:** Prisma 5.x  
**Database:** PostgreSQL  
**Migration Tool:** `prisma migrate`

## Model Overview

```
User (1) ──── (N) Property (1) ──── (N) Unit (1) ──── (N) Lease
  │                                                       │
  │                                                       ├── (N) Payment
  │                                                       ├── (N) MaintenanceRequest
  │                                                       └── (N) Document
  │
  ├── (N) Notification
  ├── (N) AuditLog
  └── (N) Message
```

## Models

### User
| Field | Type | Notes |
|-------|------|-------|
| `id` | String (UUID) | Primary key |
| `firebaseUid` | String? | Firebase Auth UID (nullable for invitees) |
| `email` | String | Unique |
| `firstName` / `lastName` | String | |
| `phone` | String? | |
| `role` | Enum: `ADMIN`, `MANAGER`, `TENANT` | Default `TENANT` |
| `isActive` | Boolean | Soft deactivation |
| `emailVerified` | Boolean | |
| `avatarUrl` | String? | |
| `createdAt` / `updatedAt` | DateTime | Auto‑managed |

### Property
| Field | Type | Notes |
|-------|------|-------|
| `id` | String (UUID) | Primary key |
| `name` | String | |
| `address` / `city` / `state` / `zipCode` | String | Location |
| `type` | Enum: `APARTMENT`, `CONDO`, `HOUSE`, `COMMERCIAL` | |
| `totalUnits` | Int | |
| `amenities` | JSON | List of amenity strings |
| `images` | JSON | List of image URLs |
| `isPublished` | Boolean | Public visibility |
| `ownerId` | String | FK → User |
| `createdAt` / `updatedAt` | DateTime | |

### Unit
| Field | Type | Notes |
|-------|------|-------|
| `id` | String (UUID) | Primary key |
| `unitNumber` | String | |
| `bedrooms` / `bathrooms` | Int | |
| `squareFootage` | Int? | |
| `rentAmount` | Float | Current rent |
| `depositAmount` | Float? | |
| `status` | Enum: `VACANT`, `OCCUPIED`, `MAINTENANCE`, `RESERVED` | |
| `propertyId` | String | FK → Property |
| `createdAt` / `updatedAt` | DateTime | |

### Lease
| Field | Type | Notes |
|-------|------|-------|
| `id` | String (UUID) | Primary key |
| `startDate` / `endDate` | DateTime | Lease term |
| `rentAmount` | Float | |
| `depositAmount` | Float? | |
| `status` | Enum: `ACTIVE`, `EXPIRED`, `TERMINATED`, `PENDING` | |
| `terms` | JSON | Custom terms |
| `unitId` | String | FK → Unit |
| `tenantId` | String | FK → User |
| `createdAt` / `updatedAt` | DateTime | |

### Payment
| Field | Type | Notes |
|-------|------|-------|
| `id` | String (UUID) | Primary key |
| `amount` | Float | |
| `type` | Enum: `RENT`, `DEPOSIT`, `FEE`, `REFUND` | |
| `status` | Enum: `PENDING`, `PAID`, `FAILED`, `REFUNDED` | |
| `method` | Enum: `CASH`, `CHECK`, `BANK_TRANSFER`, `CREDIT_CARD` | |
| `dueDate` / `paidDate` | DateTime? | |
| `description` | String? | |
| `leaseId` | String | FK → Lease |
| `createdAt` / `updatedAt` | DateTime | |

### MaintenanceRequest
| Field | Type | Notes |
|-------|------|-------|
| `id` | String (UUID) | Primary key |
| `title` / `description` | String | |
| `priority` | Enum: `LOW`, `MEDIUM`, `HIGH`, `EMERGENCY` | |
| `status` | Enum: `PENDING`, `IN_PROGRESS`, `RESOLVED`, `CLOSED` | |
| `leaseId` | String? | FK → Lease |
| `assignedToId` | String? | FK → User (manager/maintenance staff) |
| `createdAt` / `updatedAt` | DateTime | |

### Document
| Field | Type | Notes |
|-------|------|-------|
| `id` | String (UUID) | Primary key |
| `name` | String | |
| `type` | Enum: `LEASE`, `INSPECTION`, `NOTICE`, `OTHER` | |
| `fileUrl` | String | |
| `leaseId` | String | FK → Lease |
| `uploadedById` | String | FK → User |

### Notification
| Field | Type | Notes |
|-------|------|-------|
| `id` | String (UUID) | Primary key |
| `type` / `message` | String | |
| `isRead` | Boolean | |
| `userId` | String | FK → User |
| `createdAt` | DateTime | |

### AuditLog
| Field | Type | Notes |
|-------|------|-------|
| `id` | String (UUID) | Primary key |
| `action` | String | e.g. "LOGIN", "CREATE_LEASE" |
| `entityType` / `entityId` | String? | |
| `metadata` | JSON | |
| `userId` | String? | FK → User |
| `ipAddress` / `userAgent` | String? | |
| `createdAt` | DateTime | |

### Message (Communication)
| Field | Type | Notes |
|-------|------|-------|
| `id` | String (UUID) | Primary key |
| `subject` / `body` | String | |
| `senderId` | String | FK → User |
| `receiverId` | String | FK → User |
| `isRead` | Boolean | |
| `createdAt` / `updatedAt` | DateTime | |

## Enums

| Enum | Values |
|------|--------|
| `UserRole` | `ADMIN`, `MANAGER`, `TENANT` |
| `PropertyType` | `APARTMENT`, `CONDO`, `HOUSE`, `COMMERCIAL` |
| `UnitStatus` | `VACANT`, `OCCUPIED`, `MAINTENANCE`, `RESERVED` |
| `LeaseStatus` | `ACTIVE`, `EXPIRED`, `TERMINATED`, `PENDING` |
| `PaymentType` | `RENT`, `DEPOSIT`, `FEE`, `REFUND` |
| `PaymentStatus` | `PENDING`, `PAID`, `FAILED`, `REFUNDED` |
| `PaymentMethod` | `CASH`, `CHECK`, `BANK_TRANSFER`, `CREDIT_CARD` |
| `MaintenancePriority` | `LOW`, `MEDIUM`, `HIGH`, `EMERGENCY` |
| `MaintenanceStatus` | `PENDING`, `IN_PROGRESS`, `RESOLVED`, `CLOSED` |
| `DocumentType` | `LEASE`, `INSPECTION`, `NOTICE`, `OTHER` |

## Indexes
- `User.email` — unique
- `User.firebaseUid` — unique
- `Lease.status`
- `Payment.leaseId`
- `MaintenanceRequest.status`
- `Notification.userId` + `isRead`

## Migration Status
Migrations exist in `prisma/migrations/` and have been applied to the production and staging databases. Current migration count: ~12 migrations. The schema is in a stable state.
