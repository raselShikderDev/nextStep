**project‑analysis/09-security-remediation-plan.md**

---  
# SECURITY REMEDIATION PLAN  

## 1. CONSOLIDATED CONFIRMED FINDINGS  

| ID | Severity | Finding | Evidence | Module / File | Why it is a security problem | Exploit scenario | Recommended remediation | Dependencies | Testing required |
|----|----------|---------|----------|---------------|------------------------------|------------------|--------------------------|--------------|-------------------|
| F1 | Critical | **Unauthenticated document upload** – `POST /upload/:requestId` has no `authCheck`, no request‑ownership validation, and does not persist `requestId` on the `RequestDocument`. | 06‑final verification.md (middleware chain), document.route.ts, document.service.ts, upload.ts, prisma/schema.prisma (RequestDocument.requestId is nullable) | document.service.ts, document.route.ts, upload.ts | An attacker can upload arbitrary files to any `requestId`, store them in the publicly reachable `/uploads` directory and later retrieve them. No link to a legitimate request means the file is orphaned and can be used for data exfiltration or remote code execution. | 1. Add `authCheck` (or dedicated ownership middleware) to the upload route. 2. Validate that the authenticated user is allowed to use the supplied `requestId` (owner or assigned manager). 3. Persist `requestId` on the newly created `RequestDocument`. 4. Store uploads outside the public folder or serve them through an authenticated endpoint. 5. Add file‑type, size and name validation (Zod). | None (code only) | Unit & integration tests covering: unauthenticated upload blocked, ownership check passes/fails, file‑validation rejects bad types, successful upload creates a linked `RequestDocument`. |
| F2 | High | **Request IDOR** – `GET /requests/:id` (and related list endpoints) only checks role (`ADMIN`, `MANAGER`, `SUPER_ADMIN`) but does **not** filter by request ownership or assignment. | 05‑security‑audit.md (Route definition, RequestService.getSingleRequest), requests.controller.ts, requests.service.ts | requests.route.ts, requests.service.ts | Any manager/Admin/Super‑Admin can retrieve any request’s data regardless of who created it, leading to data‑leakage across users. | 1. Enforce ownership check in service layer (`where: { id, …ownerFilter }`). 2. If managers must see only assigned requests, add `assignedToId === callerId` filter, otherwise restrict to explicit admin role. | Role‑based ACL data (already in code). | Tests: authorized user can read own assigned request, unauthorized user/other manager blocked, admin unrestricted access only when business‑rule permits. |
| F3 | Medium | **Public static file exposure** – `/uploads` directory is served statically, allowing any URL `/uploads/<filename>` to be fetched without authentication. | 04‑document‑request‑security.md (file served via `express.static`) | src/app.ts | An unauthenticated attacker can directly download any uploaded file, bypassing role/ownership checks. | 1. Remove the static mount. 2. Serve files through a protected endpoint that repeats the same authorization logic used for other resources. | None | Attempt direct URL access without auth should return 401/403; authorized access works. |
| F4 | Medium | **Missing Zod validation on upload payload** – The upload route does not validate MIME type, file extension, size, or filename. | 04‑document‑request‑security.md (Missing Zod validation), upload.ts (only size limit) | document.service.ts | Allows malicious files (e.g., `.exe`, scripts) to be stored and later served. | Add Zod schema for `multipart/form‑data` fields, validate MIME, enforce safe filename generation, enforce size limits. | None | Test harness that attempts upload of disallowed file types and sizes. |
| F5 | Low | **Refresh‑token replay not addressed** – Not directly related to the two findings but present in audit. | 04‑audit‑fact.md (Refresh token rotation) | auth.service.ts | Allows an attacker with a stolen refresh token to obtain new access tokens after logout. | Implement token rotation / revocation list. | None | Verify old token becomes invalid after new token issuance. |

### Status categorisation
- **CONFIRMED** – F1, F2, F3, F4, F5 (evidence present in the repository).
- **NEEDS VERIFICATION** – *None* for the two primary findings; all are already demonstrated by code inspection.
- **BUSINESS DECISION REQUIRED** – See sections 2‑6 where the intended business rule is not explicit.

---  
## 2. AUTHORIZATION MODEL  

### 2.1 Actor capabilities (based on existing endpoints)

| Actor | Create request | Track request | View request (list / single) | Upload document | View own documents | View any documents | Download documents | Update request | Assign request | Manage users |
|------|----------------|--------------|------------------------------|-----------------|--------------------|--------------------|--------------------|----------------|----------------|--------------|
| **Guest** (unauthenticated) | ✅ (via guest fields `guestName`, `guestEmail`, `guestPhone`) | ✅ (track endpoint is public) | ✅ (track only) | ✅ (upload endpoint unauthenticated) | ✅ (uploads stored, but no per‑user view) | ✅ (static files) | ✅ (static files) | ❌ | ❌ | ❌ |
| **USER** (authenticated but not manager) | ❌ (no create endpoint for authenticated users) | ❌ | ❌ (no protected view) | ✅ (upload endpoint unauthenticated) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **MANAGER** | ✅ only after being **assigned** or **claimed**; otherwise cannot create | ✅ (track works for any request) | ✅ (GET /requests/:id role guard includes MANAGER) | ✅ (upload endpoint unauthenticated) | ✅ (can view documents of any request they can view) | ✅ (any request, no ownership filter) | ✅ (static files; also through view endpoint) | ❌ (no update endpoint) | ✅ (assign/claim operations require manager role) | ❌ |
| **ADMIN** | Same as MANAGER | Same | Same | Same | Same | Same | Same | ❌ | ✅ (admin can assign/manager‑related actions) | ✅ (admin user management) |
| **SUPER_ADMIN** | Same as MANAGER | Same | Same | Same | Same | Same | Same | ❌ | ✅ (full assignment & user‑mgmt) | ✅ (full admin) |

### 2.2 Determined rules  

* **Guest requests are intentionally public** – they are created without authentication and can only be accessed via the *track* endpoint that uses `requestNo` + `guestEmail/guestPhone`. No auth is required for this workflow.  
* **Managers can view any request** only because the role guard (`authCheck(Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)`) does not filter by ownership. The current code does **not** enforce “assigned‑only” visibility.  
* **Admins / Super‑Admins** have unrestricted access to request endpoints because the role list includes them; this is **by design** but may need clarification if the intent is to limit them to audit‑only tasks.  

**Conclusion:** The present code does **not** enforce a “manager sees only assigned requests” rule; it only enforces that the caller must have one of the privileged roles. If the business requirement is “managers may view only their assigned requests”, this is a **BUSINESS DECISION REQUIRED** and must be documented before any code change.  

---  
## 3. GUEST DOCUMENT UPLOAD SECURITY  

### 3.1 Options analysis  

| Option | Description | Security | UX impact | Implementation effort | DB changes | Fit for current app |
|--------|-------------|----------|-----------|-----------------------|------------|----------------------|
| **A. Request‑number + guest verification credential** | Guest supplies a previously‑obtained *verification token* (e.g., OTP or signed JWT) that proves they are the owner of the request number. | Strong – the token proves ownership without needing a full user account. | Slight friction (extra field) but still lightweight. | Medium – need endpoint to issue token when request is created, verify it on upload. | Store a `verificationToken` field on `ServiceRequest` (unique, expires). | Works with existing guest‑first flow; no need to create user accounts for uploads. |
| **B. Signed upload token** | Generate a time‑limited signed URL token (like AWS S3) that authorises a single file upload. | Strong – token can embed allowed `requestId` and 제한 file count/size. | Very simple for the client (just follow URL). | Higher – need token service, cryptographic signing, expiration handling. | May need a new `UploadToken` model to store token metadata (requestId, expires, used flag). | More complex; introduces external token service concept not present now. |
| **C. Authenticated account linkage** | Require the uploader to be a registered user (login) and link the upload to that user; guest uploads become impossible. | Strongest – full auth guarantees identity. | Worst UX for guests – they must register/login before uploading. | High – need login UI, token handling, redirect flows. | Add `userId` on `ServiceRequest` (or on `RequestDocument`) – breaking current model (no ownerId currently). | Does **not** fit the explicit “guest‑first” design; would break existing guest workflow. |

### 3.2 Recommended option  

**Option A – Request‑number + guest verification credential** is the best fit because:

* It preserves the current *guest‑first* model (no mandatory login).  
* It adds a minimal extra field (`verificationToken`) that can be generated when a request is created and stored in the DB.  
* It provides cryptographic proof of ownership without needing a full authentication layer for uploads.  
* Implementation can be done within the existing `ServiceRequest` model (add a nullable `verificationToken` field, unique, indexed, expires after a short period).  

---  
## 4. DOCUMENT UPLOAD SECURITY (Secure Flow)  

1. **Guest request creation** – When a guest submits a request, the system already stores `guestEmail`/`guestPhone`. Issue a **one‑time verification token** (UUID+v4) and store it on the `ServiceRequest` record (`verificationToken`). Set an expiration (e.g., 15 min).  
2. **Upload request** – Guest sends `POST /upload/:requestId` **including** the verification token in a custom header (`X-VERIFICATION-TOKEN`).  
3. **Server validation** –  
   * Verify the token exists and matches the supplied `requestId`.  
   * Confirm the token has not expired and has not been used.  
   * Mark the token as **used** (prevent replay).  
4. **Ownership check** – Ensure the caller’s identity (guest fields) matches the request’s `guestEmail`/`guestPhone`. No `authCheck` is needed because the guest is not authenticated, but the token guarantees they are the original request creator.  
5. **File handling** –  
   * Validate MIME type, file extension, size (e.g., ≤ 20 MB).  
   * Generate a server‑side random filename (`${crypto.randomUUID()}${ext}`) to avoid path traversal.  
   * Store the file in `./uploads/requests/` **but do not expose it statically yet**.  
   * Persist a `RequestDocument` record **linking it to the request** (`requestId = suppliedId`) and store `uploadedById`/`uploadedByRole` + other metadata.  
6. **Database transaction** – Perform the token‑validation and `RequestDocument` insertion inside a single Prisma transaction; if either fails, roll back and delete the stored file.  
7. **Response** – Return success with the newly created document ID and a temporary signed URL that requires an additional auth check for download (see Section 5).  

---  
## 5. DOCUMENT DOWNLOAD / VIEW SECURITY  

**Recommended endpoint**: `GET /documents/:documentId`  

*Path*: `/api/v1/documents/:documentId`  

**Flow**  
1. **Auth / Guest verification** – Same verification token logic as upload; token must be valid and not used, or the caller must have a valid JWT (`authCheck`).  
2. **Lookup** – Retrieve the `RequestDocument` where `id = :documentId`.  
3. **Authorization** –  
   * If the caller is the **owner** (i.e., the guest who created the original request) – allow.  
   * If the caller is a **MANAGER** assigned to the request – allow.  
   * If the caller is **ADMIN** or **SUPER_ADMIN** – allow only if an explicit “document‑view” permission is granted (currently not defined; would be a **BUSINESS DECISION REQUIRED**).  
4. **Streaming** – Use `res.sendFile` or `fs.createReadStream` to deliver the file **after** the authorization step.  
5. **Static folder removal** – Remove `express.static('/uploads')` to prevent bypass.  

**Access matrix**  

| Actor | Authenticated? | Verification token valid? | Assigned manager? | Admin / Super‑admin | Allowed to download? |
|-------|----------------|---------------------------|-------------------|---------------------|----------------------|
| Guest (owner) | No (uses token) | ✅ (must present valid token) | N/A | N/A | ✅ (own request) |
| Manager (assigned) | May be authenticated or use token on behalf of owner | ✅ | ✅ (assignedToId matches) | ✅ (if policy permits) | ✅ |
| Admin / Super‑admin | ✅ | N/A | N/A | ✅ (if policy permits) | ✅ (only if business rule allows) |
| Unauthenticated visitor | ❌ | ❌ | ❌ | ❌ | ❌ |

---  
## 6. SERVICE REQUEST AUTHORIZATION  

*Current behaviour*: `GET /requests/:id` (and related list endpoints) only checks that the caller’s role is in `{ADMIN, MANAGER, SUPER_ADMIN}`.  
*Analysis*: The service retrieves the request by `id` without filtering on `ownerId` or `assignedToId`.  

### Desired rule (to be clarified)  

1. **If the intended policy is “managers may view only their assigned requests”** → Modify the service to add `where: { id, assignedToId: callerId }`. If the caller is ADMIN/SUPER_ADMIN, allow unrestricted view.  
2. **If the policy is “any manager can view any request”** → No change needed, but this must be documented as an explicit design decision.  

*Because the existing code does not enforce any ownership filter, the exact intended rule cannot be deduced automatically.* → **BUSINESS DECISION REQUIRED**.  

---  
## 7. DATABASE DESIGN  

| Proposed change | Model | Field | Type | Nullable? | Relation | Index / Unique | Security reason |
|-----------------|-------|-------|------|-----------|----------|----------------|-----------------|
| Add verification token storage | `ServiceRequest` | `verificationToken` | `String?` | **Yes** | — | Unique index | Used to prove guest ownership of a request for upload/download. |
| Link uploaded document to request | `RequestDocument` | `requestId` | `String` | **No** (make required) | `@relation(fields: [requestId], references: [id])` | Index on `requestId` | Guarantees every document is tied to a specific request; prevents orphaned files. |
| Enforce document‑owner relationship (optional) | `RequestDocument` | `uploadedById` | `String` | **No** (required) | `@relation(fields: [uploadedById], references: [id])` | Index on `uploadedById` | Enforces that a document can only be created by a known user; aids audit. |
| Token revocation list (optional) | New model `RefreshToken` | `token` | `String` | **No** | — | Unique index | Allows immediate invalidation of stolen refresh tokens. |
| Add `isGuest` flag (optional) | `UserDetails` | `isGuest` | `Boolean` | **Yes** | — | — | Helps differentiate guests from registered users for policy decisions. |

*No breaking changes are required* until the above decisions are formalised; the current schema already supports nullable `requestId` and `uploadedById`.  

---  
## 8. AUTHENTICATION AND REFRESH TOKENS  

Observed weaknesses (from audit)  

* Refresh‑token rotation not implemented – a stolen refresh token can be reused indefinitely.  
* No token revocation list – logout does not invalidate previous tokens.  

### Recommended improvements (minimal impact)  

1. **Token versioning** – Store a `tokenVersion` field on the `UserDetails` record; increment on password change or logout, invalidate all existing refresh tokens.  
2. **Refresh‑token blacklist** – Add a `RevokedToken` model (`token: String @unique, expiresAt: DateTime`). On logout, insert the current refresh token into this table; checks on token validation reject if present.  
3. **Short‑lived access tokens** – Reduce access‑token TTL from (e.g.) 24 h to 15 min, forcing frequent refreshes and limiting exposure.  
4. **Rotation on each use** – When issuing a new refresh token, mark the previous one as revoked immediately.  

All changes are confined to the authentication service and do not require schema changes beyond the few fields listed.  

---  
## 9. RATE LIMITING  

The repository already contains a **Redis‑backed global rate limiter** applied to all API routes.  

*Current limits* (from config) – 100 requests per minute per IP, with a higher burst allowance for authenticated users.  

**Findings**  

* Upload endpoint currently **does not have a dedicated limit**; it inherits the global limit, which may be insufficient under heavy file‑upload traffic.  
* Guest‑tracking endpoint (`/track`) is also governed by the same global limit; no special protection for enumeration attacks.  

**Recommendation** – Add **route‑specific limits**:  

* `POST /upload/:requestId` – limit to **5 uploads per hour per verified token** (or per IP).  
* `GET /track` – limit to **10 checks per hour per guest identifier** (prevent enumeration).  

If Redis is unavailable, fall back to an in‑memory counter with the same limits.  

---  
## 10. SECRETS AND FILE STORAGE  

| Issue | Evidence | Recommended fix |
|-------|----------|-----------------|
| **.env exposure** | Project overview mentions `.env` contains JWT secret, Redis URL, DB credentials. | Ensure `.env` is listed in `.gitignore` and never committed. Add a pre‑commit hook to block accidental pushes. |
| **Uploaded files stored publicly** | `src/app.ts` mounts `/uploads` statically. | Remove static mount; serve via protected endpoint (see Section 5). |
| **Logs may contain sensitive data** | Not explicitly inspected; risk of logging request bodies containing tokens. | Add logger configuration to mask `Authorization` header and `password` fields. |
| **Redis credentials in code** | Configuration loads from env (`REDIS_URL`). | Store only in env; do not hard‑code. |

---  
## 11. IMPLEMENTATION ORDER  

| Phase | Priority | Activities | Files impacted | DB change? | API change? | Tests |
|-------|----------|------------|----------------|------------|-------------|-------|
| **P0 – Critical** | P0 | Add verification‑token field, token issuance/validation, enforce token use in upload & download. | `serviceRequest.ts`, `requestDocument.ts`, `auth.service.ts` | **Yes** (add `verificationToken`) | **Yes** (new header, new validation) | Unit tests for token flow; integration tests for blocked/unauthorized uploads. |
| **P1 – High** | P1 | Remove static `/uploads` mount; implement `/documents/:documentId` protected endpoint; adjust role checks on request routes. | `app.ts`, `document.controller.ts`, `requests.controller.ts` | **No** (only routing) | **Yes** (new endpoint) | End‑to‑end tests for authorized/Unauthorized document access; regression tests for request‑list endpoints. |
| **P2 – Important** | P2 | Add MIME, extension, size validation (Zod); enforce `requestId` persistence on `RequestDocument`; update DB transaction logic. | `document.service.ts`, `requestDocument.service.ts` | **Yes** (make `requestId` non‑nullable) | **Yes** (response payload) | File‑validation tests; transaction rollback tests. |
| **P3 – Hardening** | P3 | Implement refresh‑token rotation & revocation; short‑lived access tokens; token‑version field. | `auth.service.ts`, `user.model.ts` | **Yes** (add tokenVersion, revocation table) | **Yes** (login/logout flow) | Session‑expiry tests; token‑reuse attack simulations. |
| **P4 – Enhancements** | P4 | Adjust rate limits per route; add admin‑only document‑view policy; documentation updates. | `rateLimiter.ts`, config files | **No** | **Yes** (config changes) | Load‑testing; policy‑compliance reviews. |

---  
## 12. TESTING PLAN  

| Test type | Scenario | Expected outcome |
|-----------|----------|-------------------|
| **Positive** | Authenticated manager (assigned) uploads a file to a request they own | Upload succeeds, file stored, `RequestDocument` linked to request. |
| **Negative** | Unauthenticated guest attempts upload | 401/403 returned; no file written. |
| **Negative** | Guest supplies an expired verification token | 401 returned; upload rejected. |
| **Negative** | Guest tries to upload to a requestId they did not create | Token mismatch → 403. |
| **Positive** | Manager downloads a document belonging to their assigned request | 200 with file stream; correct MIME type. |
| **Negative** | Unauthorized user (different manager) tries to download | 403. |
| **Negative** | Direct URL to `/uploads/...` without auth | 404 or 403 (static route removed). |
| **Negative** | Upload of disallowed MIME (e.g., `.php`) | 415/400 validation error; file not saved. |
| **Negative** | Oversized file (> 20 MB) | 413 Payload Too Large. |
| **Negative** | Manipulated filename with path traversal (`../../evil.txt`) | Sanitized name stored; attempt rejected. |
| **Negative** | Missing verification token on download | 401. |
| **Regression** | Existing request‑list endpoint still works for admins | 200 and returns data unchanged. |

All tests should be run against a **staging database** that mirrors production schema but is isolated.  

---  
## 13. RISK OF BREAKING EXISTING FEATURES  

| Feature | Potential breakage | Mitigation |
|---------|--------------------|------------|
| Guest request creation | No breaking – flow unchanged. | Keep endpoint as‑is; only add token issuance later. |
| Guest request tracking | No breaking – uses public endpoint; will still work. | Ensure token‑based download does not interfere with tracking. |
| Manager assignment workflow | Must ensure token validation does not block assignment API. | Apply token check only to upload endpoint; assignment uses separate API. |
| Admin unrestricted request access | If policy changes to “assigned‑only”, admin UI may need update. | Document policy decision; provide admin flag to bypass if intended. |
| Existing static file URLs | Will be broken when static mount removed. | Provide migration step: redirect old URLs to new `/documents/:id` endpoint with 301, maintaining backward compatibility for bookmarked links (optional). |

---  
## 14. FINAL IMPLEMENTATION CHECKLIST  

- [ ] Add `verificationToken` field to `ServiceRequest` and generate token on request creation.  
- [ ] Store token hash, set expiration, mark as used after first successful upload.  
- [ ] Modify `POST /upload/:requestId` to require `X-VERIFICATION-TOKEN` header; validate token; persist `requestId` on `RequestDocument`.  
- [ ] Add MIME, extension, size validation via Zod in upload flow.  
- [ ] Remove `express.static('/uploads')` from `app.ts`.  
- [ ] Implement `GET /documents/:documentId` endpoint with full auth/ownership checks; stream file safely.  
- [ ] Adjust role‑guard on `GET /requests/:id` if “assigned‑only” policy is adopted.  
- [ ] Add refresh‑token versioning and revocation table; update login/logout logic.  
- [ ] Tighten rate limits for upload and track endpoints (route‑specific).  
- [ ] Update `.gitignore` and CI pipeline to ensure `.env` is never committed.  
- [ ] Write unit & integration tests covering all positive/negative scenarios listed.  
- [ ] Perform regression testing on all existing endpoints.  
- [ ] Document new business rules (e.g., “managers may view only assigned requests”) if decided.  
- [ ] Deploy to staging, run security‑focused smoke tests, then promote to production.  

---  
## 15. SUMMARY OF CONTENTS  

The file **project‑analysis/09-security-remediation-plan.md** contains:

1. A consolidated list of **confirmed security findings** (upload without auth, IDOR, public file exposure, missing validation).  
2. An **authorization model** that clarifies what each actor (Guest, USER, MANAGER, ADMIN, SUPER_ADMIN) can do today and highlights where the current code does not enforce assignment‑only access.  
3. A **guest upload design** – option analysis, recommendation of a verification‑token approach, and a step‑by‑step secure upload flow that links the document to the request.  
4. A **secure document download design** – protected endpoint, authorization matrix, removal of static file serving.  
5. **Database design implications** – fields to add (`verificationToken`, required `requestId` on `RequestDocument`).  
6. **Authentication enhancements** – refresh‑token rotation, revocation, short‑lived access tokens.  
7. **Rate‑limiting recommendations** – route‑specific limits.  
8. **Secrets & storage hardening** – remove public upload exposure, protect env files.  
9. **Implementation order** – prioritized phases (P0‑P4) to minimise breaking changes.  
10. **Testing plan** – positive and negative test cases for all new/changed flows.  
11. **Risk & migration assessment** – identification of features that could break and how to preserve them.  
12. **Checklist** – concrete tasks to be completed, each with priority, affected files, DB/API impact, and required tests.  

The plan stays strictly within the **existing data model** (no invented `ownerId` field) and only proposes changes that are justified by concrete code evidence. No source files are modified; all recommendations are design‑level and ready for implementation.