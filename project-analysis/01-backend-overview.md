# Backend Overview

## Repository Identification
- **Actual path**: e:\programme\nextstepBackend
- **Actual purpose**: Backend/API service handling all data processing, database operations, and API endpoints
- **Technology**: Node.js, Express, PostgreSQL, Prisma, Redis, JWT, Multer

## Technology Stack
- **Runtime**: Node.js (v16+) with Bun
- **Framework**: Express.js (v5.x)
- **Language**: TypeScript (strict)
- **ORM**: Prisma (v7.x) for PostgreSQL
- **Authentication**: JWT with HttpOnly cookies
- **Security**: bcryptjs, jsonwebtoken, helmet, cookie-parser
- **Configuration**: dotenv
- **File Uploads**: Multer
- **Rate Limiting**: rate-limiter-flexible + Redis
- **Build**: tsup, bun
- **Caching**: ioredis
- **Email**: nodemailer

## Architecture
- Layered: middleware -> controller -> service -> data access
- Modular: src/module/{auth,user,document,payment,requests,services}
- Each module: route.ts -> controller.ts -> service.ts
- Prisma $transaction for critical operations
- RESTful API design
- JWT in HttpOnly cookies
- globalRateLimiter middleware
- /uploads/* served publicly via express.static

## Project Structure
`
nextstepBackend/
+- src/
|  +- app.ts              # Main Express application entry point
|  +- server.ts           # Server startup, super admin seeding
|  +- routes/
|  |  +- mainRoutes.ts   # Central route aggregation
|  +- module/
|  |  +- auth/           # Authentication
|  |  +- user/           # User management
|  |  +- document/       # Document management
|  |  +- payment/        # Payment processing
|  |  +- requests/       # Service request tracking
|  |  +- services/       # Service catalog
|  +- middleware/         # checkAuth, globalRateLimiter, error handling
|  +- config/             # env.config, redis.config
|  +- types/              # TypeScript type definitions
|  +- utils/              # JWT helpers, email helpers
+- package.json
`

## Modules
- **auth**: Registration, login, logout, refresh token, OTP password reset, change password
- **user**: Profile, staff creation, status toggling
- **requests**: Service request lifecycle (create, assign, claim, start, complete, deliver, cancel, track)
- **document**: Upload to local disk, list, delete with file cleanup
- **payment**: Submit (guest allowed), verify/reject (admin), list, analytics
- **services**: Service catalog, categories, admin CRUD, toggle status
- **redis**: Caching, OTP storage, rate limiting storage

## API Inventory

### Auth
| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| POST | /api/v1/auth/register | No | - | User registration |
| POST | /api/v1/auth/login | No | - | User login, returns JWT in cookies |
| POST | /api/v1/auth/logout | Yes | All | Clear auth cookies |
| POST | /api/v1/auth/refresh-token | No | - | Refresh access token from cookie |
| POST | /api/v1/auth/forgot-password | No | - | Send OTP to email |
| POST | /api/v1/auth/reset-password | Yes | All | Reset password with OTP |
| POST | /api/v1/auth/change-password | Yes | All | Change password while logged in |
| POST | /api/v1/auth/change-initial-password | Yes | USER,MANAGER,ADMIN | First-time password change |

### User
| Method | Endpoint | Auth | Roles |
|--------|----------|------|-------|
| GET | /api/v1/user/me | Yes | All |
| PATCH | /api/v1/user/update-profile | Yes | All |
| GET | /api/v1/user | Yes | ADMIN,SUPER_ADMIN |
| GET | /api/v1/user/:id | Yes | ADMIN,SUPER_ADMIN |
| POST | /api/v1/user/create-staff | Yes | ADMIN,SUPER_ADMIN |
| PATCH | /api/v1/user/toggle-status/:id | Yes | ADMIN,SUPER_ADMIN |

### Service
| Method | Endpoint | Auth | Roles |
|--------|----------|------|-------|
| GET | /api/v1/services | No | - |
| GET | /api/v1/services/:slug | No | - |
| GET | /api/v1/services/service-category | No | - |
| POST | /api/v1/services/create | Yes | ADMIN,SUPER_ADMIN |
| POST | /api/v1/services/category-create | Yes | ADMIN,SUPER_ADMIN |
| PATCH | /api/v1/services/:id | Yes | ADMIN,SUPER_ADMIN |
| PATCH | /api/v1/services/:id/toggle-status | Yes | ADMIN,SUPER_ADMIN |

### Request
| Method | Endpoint | Auth | Roles |
|--------|----------|------|-------|
| GET | /api/v1/requests | Yes | ADMIN,SUPER_ADMIN,MANAGER |
| GET | /api/v1/requests/:id | Yes | ADMIN,SUPER_ADMIN,MANAGER |
| GET | /api/v1/requests/track | No | - |
| POST | /api/v1/requests/create | No* | - |
| PATCH | /api/v1/requests/assign/:id | Yes | ADMIN,SUPER_ADMIN |
| PATCH | /api/v1/requests/quotation/:id | Yes | ADMIN,SUPER_ADMIN |
| PATCH | /api/v1/requests/claim-request/:id | Yes | MANAGER,ADMIN,SUPER_ADMIN |
| PATCH | /api/v1/requests/start-work/:id | Yes | MANAGER,ADMIN,SUPER_ADMIN |
| PATCH | /api/v1/requests/mark-completed/:id | Yes | MANAGER,ADMIN,SUPER_ADMIN |
| PATCH | /api/v1/requests/cancel/:id | Yes | ADMIN,SUPER_ADMIN |
| PATCH | /api/v1/requests/:id/deliver | Yes | MANAGER,ADMIN,SUPER_ADMIN |
| GET | /api/v1/requests/analytics | Yes | ADMIN,SUPER_ADMIN |

### Document
| Method | Endpoint | Auth | Roles |
|--------|----------|------|-------|
| POST | /api/v1/document/upload/:requestId | Yes | MANAGER,ADMIN,SUPER_ADMIN |
| GET | /api/v1/document/request/:requestId | Yes | MANAGER,ADMIN,SUPER_ADMIN |
| DELETE | /api/v1/document/:id | Yes | ADMIN,SUPER_ADMIN |

### Payment
| Method | Endpoint | Auth | Roles |
|--------|----------|------|-------|
| POST | /api/v1/payment/submit | No* | - |
| PATCH | /api/v1/payment/verify/:id | Yes | ADMIN,SUPER_ADMIN |
| PATCH | /api/v1/payment/reject/:id | Yes | ADMIN,SUPER_ADMIN |
| GET | /api/v1/payment | Yes | SUPER_ADMIN,ADMIN,MANAGER |
| GET | /api/v1/payment/:id | Yes | SUPER_ADMIN,ADMIN,MANAGER |
| GET | /api/v1/payment/analytics | Yes | SUPER_ADMIN,ADMIN,MANAGER |

*Note: /requests/create and /payment/submit do not require auth but accept optional user context.

## Authentication
- **Login**: POST /auth/login validates credentials via Prisma. Sets HttpOnly cookies: accessToken (1h) and refreshToken (7d). Both contain user id, email, role.
- **Logout**: POST /auth/logout clears both cookies.
- **Token Refresh**: POST /auth/refresh-token reads refreshToken cookie, issues new accessToken.
- **Registration**: POST /auth/register hashes password (bcrypt 10 rounds), sets isVerified=true.
- **Password Reset**: 6-digit OTP via Redis, 5-minute TTL, key pattern orgot-password:{email}.
- **Auth Middleware**: checkAuth.ts reads Bearer token first, falls back to accessToken cookie. Validates user exists, isActive, isVerified.
- **Tokens**: JWT via createJwtToken. Access 1h, Refresh 7d.

## Authorization
- **Roles**: USER, MANAGER, ADMIN, SUPER_ADMIN
- **Enforced via**: authCheck middleware
- **Route-level**:
  - getAllRequests: ADMIN|SUPER_ADMIN|MANAGER
  - assignManager: ADMIN|SUPER_ADMIN
  - claimRequest: MANAGER|ADMIN|SUPER_ADMIN
  - /user (except /me, /update-profile): ADMIN|SUPER_ADMIN
  - payment verify/reject: ADMIN|SUPER_ADMIN

## Validation
- **Zod Schemas** for all mutations (auth.validation.ts, request.validation.ts, user.validation.ts)
- **requestZodValidator** middleware applies Zod parse with detailed errors
- **XSS Protection**: xss library in dependencies

## Database Model
**User**: id, email (unique), passwordHash, role (enum), isActive, isVerified, mustChangePassword. 1:1 with UserDetails.

**UserDetails**: id, name, phone (unique), avatarUrl, address, userId (unique FK). 1:M with ServiceRequest.

**ServiceRequest**: id, requestNo (unique, NSX-YYYY-NNNNNN), userId, serviceId, assignedToId, isGuest, guestName/Email/Phone/Address/Source, status (RequestStatus enum, default SUBMITTED), formData (JSON), quotedPrice, finalPrice, currency. Relations: UserDetails (requester), UserDetails (manager), Service, Payment (1:1), RequestDocument (1:M), RequestStatusHistory (1:M).

**RequestDocument**: id, requestId, uploadedById, uploadedByRole, name, originalName, url, key, mimeType, size, description.

**Payment**: id, requestId (unique FK), amount, currency, method (PaymentMethod), transactionId, senderNumber, screenshotUrl/Key, status (PaymentStatus, SUBMITTED), verifiedById, verifiedAt, rejectionReason, adminNote.

**Service**: id, categoryId, name, slug (unique), description, features, deliverables, turnaround, price, requiresQuotation, formSchema, isActive.

**ServiceCategory**: id, name, slug, description, icon, isActive, sortOrder.

**RequestStatusHistory**: id, requestId, changedById, action, fromStatus, toStatus, note.

**AuditLog**: id, performedById, requestId, action, entityType, entityId, oldValue, newValue, ipAddress, userAgent.

**Notification**: id, userId, requestId, type, title, body, isRead, readAt, metadata.

## Redis
- **Purpose**: Rate limiting, OTP storage, caching
- **Implementation**: ioredis (config/redis.config.ts)
- **Connection**: rediss:// (Upstash)
- **OTP Key**: orgot-password:{email} with 5-min TTL

## Rate Limiting
- globalRateLimiter middleware using rate-limiter-flexible + Redis
- Specific limits: NOT INSPECTED

## Request Workflow
1. Guest/User submits POST /api/v1/requests/create with formData, serviceId, files, optional paymentData
2. Backend generates unique requestNo (NSX-YYYY-NNNNNN format)
3. If paymentData included, creates Payment record with status SUBMITTED
4. Request status set to SUBMITTED
5. RequestStatusHistory entry created
6. Manager/Admin can claim via PATCH /claim-request/:id
7. Admin can assign via PATCH /assign/:id
8. Admin sets quotation via PATCH /quotation/:id
9. Manager starts work via PATCH /start-work/:id (status -> IN_PROGRESS)
10. Manager marks complete via PATCH /mark-completed/:id (status -> COMPLETED)
11. Manager delivers via PATCH /:id/deliver (status -> DELIVERED)
12. Admin can cancel via PATCH /cancel/:id (status -> CANCELLED)

## Document Workflow
1. POST /api/v1/document/upload/:requestId accepts multipart/form-data with files (up to 20)
2. Files stored via Multer to local uploads/requests/ directory
3. Database record created in RequestDocument with url=/uploads/requests/{filename}
4. GET /api/v1/document/request/:requestId returns all documents (auth required)
5. DELETE /api/v1/document/:id removes record and physical file (ADMIN|SUPER_ADMIN)

## Payment Workflow
1. User/Guest submits POST /api/v1/payment/submit with requestId, method, transactionId, senderNumber
2. Payment created with status=SUBMITTED
3. Request status updated to PAYMENT_SUBMITTED
4. Admin verifies via PATCH /api/v1/payment/verify/:id -> status -> VERIFIED; request -> PAYMENT_VERIFIED
5. Admin rejects via PATCH /api/v1/payment/reject/:id with rejectionReason -> status -> REJECTED

## User Workflow
1. POST /api/v1/auth/register creates user + UserDetails
2. POST /api/v1/auth/login returns tokens in HttpOnly cookies
3. User creates requests via /requests/create (guest or authenticated)
4. User tracks requests via /requests/track?requestNo=&email= (public, no auth)
5. Admin creates staff via POST /api/v1/user/create-staff
6. Admin toggles user status via PATCH /api/v1/user/toggle-status/:id

## Environment Configuration
- **PORT**: 5000
- **DATABASE_URL**: PostgreSQL (Neon)
- **REDIS_URL**: Upstash Redis (rediss://)
- **JWT_ACCESS_SECRET**: Access token signing (1h)
- **JWT_REFRESH_SECRET**: Refresh token signing (7d)
- **FRONTEND_URL**: http://localhost:3000 (CORS origin)
- **FRONTEND_ADMIN_DASHBOARD_URL**: http://localhost:3001 (CORS origin)
- **CORS**: Credentials=true, two frontend URLs allowed
- **Secrets detected**: JWT secrets, DB credentials, Redis credentials in .env

## Strengths
- **Modular Architecture**: Clean separation between routes, controllers, services, and data access
- **Comprehensive Validation**: Zod schemas validate all API inputs
- **JWT + Cookie Auth**: Access (1h) and refresh (7d) tokens in HttpOnly cookies
- **Role-Based Access Control**: Middleware-level enforcement on all protected routes
- **Database Transactions**: Critical operations use Prisma $transaction for atomicity
- **Audit Trail**: AuditLog, RequestStatusHistory, and Notification models
- **OTP-based Password Reset**: Redis-backed 6-digit OTP with 5-min TTL
- **Document Management**: File upload with cleanup on delete
- **Detailed Enums**: Well-defined enums for roles, request statuses, payment methods, notification types

## Weaknesses
- **Inconsistent Document Upload Path**: Document service stores to local uploads/ directory, but RequestDocument model comment references S3 URL
- **Guest Request Flow Unclear**: createServiceRequest references userId and role but these may be undefined for guests; document attachment during request creation is commented out
- **Dashboard API Mismatch**: Dashboard paymentsApi.ts uses /payment? and /payments/ paths, but backend routes are /payment/ (singular). getPaymentById uses /payments/ instead of /payment/
- **Payment Submit Endpoint Missing Auth**: POST /payment/submit does not require authentication
- **Token Storage Inconsistency**: Backend uses HttpOnly cookies; Dynamicwebsitewithadminpanelwithcf uses Supabase (separate auth)
- **Commented-Out Code**: Large sections of createServiceRequest are commented out
- **Duplicate Route**: /requests/analytics appears twice in requests.route.ts

## Unknown Areas
- **S3 vs Local Storage**: Backend references AWS SDK v3 but document service stores to local uploads/. Actual storage mechanism not confirmed.
- **Dashboard Endpoints**: Dashboard API calls /dashboard/stats, /dashboard/revenue, /dashboard/user-growth, /dashboard/request-trends - backend has none of these
- **Document Download**: No auth check on /uploads static serving
- **Notification System**: Backend has Notification model but no notification controller/route found in mainRoutes.ts
- **Guest vs Authenticated User Flow**: isGuest flag and guest* fields suggest split workflow, but frontend integration unclear
- **Super Admin Seeding**: server.ts calls seedSuperAdmin() at startup; implementation not inspected

## Important Findings
1. **Backend is the single source of truth** for all data in nextstepBackend/nextstepDashboard pair
2. **Dynamicwebsitewithadminpanelwithcf uses Supabase**, not the nextstepBackend API - it is a completely separate system
3. **Dashboard API Path Mismatch**: Dashboard paymentsApi uses /payments/ (plural) but backend uses /payment/ (singular)
4. **Static File Exposure**: Uploaded documents served at /uploads/* without authentication check
5. **Missing Auth on Payment Submit**: /payment/submit is publicly accessible without user verification
6. **Multiple duplicate routes**: /requests/analytics appears twice in requests.route.ts
7. **Backend tracks state via RequestStatusHistory** but no notification controller exists to deliver these events
8. **The system supports both authenticated and guest flows** via isGuest + guest* fields, but the unauthenticated endpoints (create, submit, track) are entirely public with no rate-limiting beyond the global limiter
