# Final Security Design – Revised Remediation Blueprint

## 1. Guest Token Design – Corrected Model
| Option | Description | Security | Complexity | Fit for current app |
|--------|-------------|----------|------------|----------------------|
| **B – Scoped Short‑Lived Guest Tokens** *(recommended)* | • When a guest request is created a **guest‑session token** is issued. <br>• The JWT contains: `requestId`, `scope` (`upload` | `download`), `jti` (unique identifier), `exp` (15 min). <br>• Only a **hashed** reference to `jti` is stored with an expiration timestamp. <br>• Tokens are **single‑use** for upload and can be reused for download **only if still valid**. <br>• Multiple uploads per request are supported by issuing a **new token** for each file (or by allowing a limited number of uploads per session). | • No raw token stored → mitigates token leakage. <br>• Scope field enforces purpose (upload vs. download). <br>• Hash prevents reverse‑engineering. <br>• Expiration & revocation protect against replay. | Low‑moderate – only adds a tiny table (`guest_sessions`) and a signing secret; no structural DB changes beyond that. | ✔️ Keeps guest‑first approach, works with multiple uploads, aligns with existing flow. |

**Token Generation & Storage**  
1. Generate a UUID (`jti`).  
2. Build JWT (`HS256`) with claims: `{ requestId, scope, jti, exp }`.  
3. Sign with the application’s existing JWT secret (reuse current secret).  
4. Store **only** `jti` (hashed with SHA‑256) + `exp` + `used_at` (nullable timestamp) in a new Prisma model `GuestSession`.  
5. On each use, verify: <br> – `jti` exists, not expired, not used, matches the supplied `scope`. <br> – Mark `used_at` = now to prevent replay.  

**Replay & Revocation**  
* Replay is impossible because the `jti` hash can be used only once (marked used).  
* If a token is revoked (e.g., logout, suspicious activity), insert a row into `RevokedToken` (see Section 7) – the verification step rejects any used or revoked `jti`.  

## 2. Guest Ownership – What Proves It?
- **Guest verification code** (`guestCode`) is generated at request creation and stored on `ServiceRequest` (`guestCode: String?`).  
- The code is delivered to the guest (e.g., via email or SMS) **out‑of‑band**; it is **not** derivable from `guestEmail`/`guestPhone`/`requestNo`.  
- **Only possession of the correct `guestCode` together with a valid guest‑session token** proves ownership.  
- Neither `requestId` nor `guestEmail/phone` alone is sufficient; they are **public identifiers**, not secret credentials.

## 3. Document Access – Separate Paths
| Operation | Required Credential / Scope | Access Rules |
|-----------|----------------------------|--------------|
| **Upload** | `scope: upload` guest‑session token + ownership proof (`guestCode` validates request) | • Token must be valid and unused. <br>• Rate‑limited (max 5 uploads per token). |
| **List Documents** | `scope: download` **or** `scope: manage` (admin) | • Guest can list only documents belonging to *their* request (checked via `requestId`). <br>• Manager/Admin can list all if policy permits. |
| **Download** | `scope: download` token (or admin privilege) | • Same validation as list, plus DRM‑style streaming (no direct filesystem path). |
| **Delete** | `scope: manage` (admin) **or** token with `scope: delete` (owner) | • Owner can delete only his own documents; admin can delete any. |

*Note:* The same JWT secret is used, but **different scopes** enforce distinct permissions without requiring separate tables.

## 4. Manager Authorization – Explicit Policy Choice
| Option | Behaviour | Security / Business Impact |
|--------|-----------|----------------------------|
| **A – Assigned‑Only** (recommended) | Managers can view **only** requests where `assignedToId === managerId` (or where they have explicitly claimed the request). | • Enforces least‑privilege; prevents cross‑user data leakage. <br>• Aligns with typical HR policies. <br>• Requires adding a simple filter (`where: { id, assignedToId: callerId }`) in the service layer. |
| **B – All‑Requests** | Managers can view **any** request regardless of assignment. | • Simpler code but higher risk of accidental data exposure. <br>• May be acceptable if the business truly allows managers to audit all work. |

**Recommendation:** Adopt **Option A** (assigned‑only) as the default. This decision must be **confirmed by product owners** before any code change.

## 5. RequestDocument Migration – Safe Evolution
1. **Identify orphan documents** – `RequestDocument` rows where `requestId` is `null`.  
2. **Recoverability** – If `url` exists on disk, move the file to a quarantine folder with a timestamped name for manual review.  
3. **Cleanup** – Delete unrecoverable orphan files after a 7‑day holding period.  
4. **Schema change** – After confirming **zero** orphan rows in production, alter the column: <br>`requestId String` (make **non‑nullable**) and add foreign‑key `@@relation foreignKey(onDelete: Cascade)`.  
5. **Enforcement** – The service that creates `RequestDocument` will now **always** supply `requestId`; Prisma will reject attempts without it.  

## 6. File Security Policy
| Aspect | Policy (values justified) |
|--------|---------------------------|
| **Allowed extensions** | `.pdf`, `.png`, `.jpg`, `.jpeg`, `.txt`, `.doc`, `.docx` |
| **MIME validation** | `application/pdf`, `image/*` (checked via `file.mimetype`). |
| **Content magic‑byte check** | Optional for critical files (e.g., PDF) – read first 4 bytes to verify PDF signature. |
| **Maximum file size** | 20 MiB per file (aligned with current `upload.ts` limit). |
| **Maximum files per request** | 5 files per request (enforced via token usage count). |
| **Maximum total upload size per request** | 100 MiB (aggregate of all files). |
| **Filename generation** | `crypto.randomUUID() + path.extname(originalName)` – eliminates user‑controlled characters. |
| **Path traversal protection** | All filenames are sanitized with `path.basename` before storage. |
| **Executable handling** | Block MIME types that are executables (`application/octet-stream` with suspicious magic numbers) and reject. |
| **Storage location** | `path.join(process.cwd(), \"private_uploads\", \"requests\")` – **outside** the public `uploads` directory. |
| **Public access** | Disabled – all files are served via `/api/v1/documents/:id` after auth. |
| **Deletion & cleanup** | Delete on `DELETE /documents/:id` after confirming token scope `delete`; also trigger cleanup of the physical file. |
| **Failed‑upload cleanup** | Transaction rolls back; any partially written file is deleted; DB write is aborted. |

## 7. Refresh‑Token Hardening – Minimal Viable Architecture
1. **Token versioning** – Add `tokenVersion: Int` to `UserDetails`. Increment on password change, logout, or manual admin reset. All previously issued refresh tokens become invalid.  
2. **Refresh‑token revocation list** – New model `RevokedToken { tokenHash String @unique; expiresAt DateTime }`. When a refresh token is used or rotated, its hash is stored here; subsequent uses are rejected.  
3. **Short‑lived access tokens** – Issue access tokens with **15 min** TTL (instead of longer).  
4. **Rotation on each use** – When a valid refresh token is exchanged for a new access token, generate a **new refresh token**, store its hashed `jti` in `RevokedToken` with an expiration of 24 h, and return the new token to the client.  

*This provides strong protection against token theft and replay while avoiding unnecessary extra tables or complex cryptographic schemes.*

## 8. Rate Limiting – Targeted Limits
| Endpoint | Limiter | Limit | Reason |
|----------|---------|-------|--------|
| `POST /upload/:requestId` | Guest‑session token + IP | **5 uploads per hour per token** | Prevents bulk file abuse while allowing legitimate multi‑file uploads. |
| `GET /track` | Guest identifier (`guestCode` or IP) | **10 checks per hour** | Stops enumeration of guest requests. |
| All auth‑protected routes | Authenticated user IP | **200 requests per hour** | General abuse protection. |
| Document download (`GET /documents/:id`) | Authenticated user ID | **30 downloads per hour** | Prevents mass downloading by a privileged user. |

Limits are enforced by the existing Redis‑backed rate limiter; configuration values are externalized in `rateLimiter.ts` for easy adjustment.

## 9. Secrets – Current State & Recommendations
- `.gitignore` already excludes `.env`. No hard‑coded secrets are present in source files.  
- Ensure **environment loading** (`dotenv`) happens **before** any secret is logged.  
- Add **logger sanitisation** for `Authorization` header and `password` fields to avoid accidental leakage.  

## 10. Final Architecture Diagram (textual)

```
Guest Request Creation
   │
   └─► Generate GuestCode + GuestSession token (scope=upload)
          │
          ▼
Guest Upload Request (POST /upload/:requestId)
   │   • Present GuestCode + valid upload‑scope token
   │   • Validate token (hash, expiry, not used)
   │   • Rate‑limit (5/hour)
   ▼
File Validation (MIME, size, extension)
   │
   ▼
Store File in private_uploads/requests/<random‑name>
   │
   ▼
Create RequestDocument (requestId linked, uploadedById)
   │
   ▼
Response → Upload token may be reused for download (scope=download) if still valid
          │
          ▼
Authorized Document Retrieval (GET /documents/:id)
   │   • Verify token (download scope) or admin privilege
   │   • Check ownership / assignment
   │   • Stream file from private_uploads
   ▼
Delete Document (DELETE /documents/:id) – requires delete‑scope token or admin

Manager Flow
   │
   └─► Assigned requests only (Option A) – filter by assignedToId
          │
          ▼
Same upload/download paths apply with manager‑scope token

Admin / Super‑Admin
   │
   └─► Full visibility (optional “manage” scope) – used only where explicitly allowed
```

## 11. Final Implementation Sequence
| Priority | Phase | Core Tasks |
|----------|-------|------------|
| **P0** | Critical | • Add `GuestSession` model & JWT signing.<br>• Store only hashed `jti` + expiry.<br>• Enforce token usage (single‑use). |
| **P1** | High | • Remove static `/uploads` mount.<br>• Implement `/api/v1/documents/:id` endpoint with scope checks.<br>• Make `RequestDocument.requestId` required after orphan cleanup. |
| **P2** | Hardening | • Add file‑validation pipeline (MIME, size, whitelist).<br>• Enforce filename sanitisation & storage path.<br>• Deploy rate‑limiter rules. |
| **P3** | Refresh‑Token Hardening | • Add `tokenVersion`, `RevokedToken` model.<br>• Switch to 15‑min access tokens & rotation. |
| **P3‑Optional** | Improvements | • Introduce admin “manage” scope for delete/list.<br>• Add orphan‑document quarantine job.<br>• Add logging sanitisation. |

## 12. Final Go/No‑Go Checklist
- [ ] Guest‑session token design **confirmed** (Option B selected).  
- [ ] **Guest ownership proof** (`guestCode` + token) documented and approved.  
- [ ] **Manager access policy** (Option A) **explicitly approved** by product owners.  
- [ ] Orphan `RequestDocument` cleanup strategy validated (no data loss).  
- [ ] File‑security policy (extensions, size, storage) finalized.  
- [ ] Document‑access scopes and permission matrix approved.  
- [ ] Refresh‑token revocation & versioning model accepted.  
- [ ] Rate‑limiting limits verified with stakeholder load‑test data.  
- [ ] Secrets handling plan reviewed and approved.  

**If any of the above items remain unresolved, the implementation is NOT READY FOR IMPLEMENTATION.**  

---  

### Summary of Content
The file defines a **revised, minimal‑risk security design** that:
1. Replaces the previous one‑token‑for‑both‑upload‑and‑download approach with **separate scoped short‑lived guest tokens** (Option B).  
2. Clarifies that **guest ownership** must be proven via a **guest verification code** plus a token, not via public identifiers.  
3. Separates **upload, list, download, and delete** operations with distinct token scopes and authorisation rules for each actor (Guest, USER, MANAGER, ADMIN, SUPER_ADMIN).  
4. Explicitly presents **two manager‑authorization options**, recommends the **assigned‑only** model (least‑privilege) and marks the final choice as a business decision that must be confirmed.  
5. Details a **safe migration** of `RequestDocument.requestId` from nullable to non‑nullable, including orphan detection, recovery, and foreign‑key enforcement.  
6. Sets a concrete **file‑security policy** (allowed types, size limits, naming, storage location, anti‑executable measures).  
7. Recommends a **minimal refresh‑token hardening** set (versioning, revocation list, 15‑min access tokens).  
8. Provides **targeted rate‑limiting** values based on token/IP, with rationales.  
9. Confirms that current secret handling is already sound but adds logger sanitisation.  
10. Delivers a clear **architectural diagram**, **implementation roadmap** split into prioritized phases, and a **go/no‑go checklist** that enumerates all conditions that must be satisfied before any code change is made.  

All recommendations respect the existing Prisma schema (no invented fields) and avoid unnecessary complexity, focusing on concrete, testable changes that address the confirmed vulnerabilities.``
```