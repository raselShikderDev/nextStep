# project-analysis/12-security-implementation-spec.md

## 1. FINAL GUEST AUTHORIZATION MODEL
**Chosen architecture:** **A. guestCode is the primary ownership credential and is exchanged for a scoped session token.**  

- The guest creates a `ServiceRequest` and receives a `guestCode`.  
- `guestCode` is **not** a permanent identifier; it is a one‑time‑use (or limited‑use) credential that the system validates and then exchanges for a **scoped session token**.  
- The session token is short‑lived, scoped to the specific request, and can be used for upload, download, and other operations within that scope.  
- This design keeps the guest’s credential simple (just an opaque code) while centralising authority in the token, avoiding the need to embed fine‑grained permissions directly in the code itself.

---

## 2. FINAL TOKEN DESIGN
**Chosen model:** **B. One upload token = maximum 5 successful uploads.**  

| Property | Value / Rule |
|----------|--------------|
| **Token type** | `UPLOAD` (for uploads) / `DOWNLOAD` (for downloads). Never interchangeable. |
| **Scope** | Scoped to a single `requestId`. Token includes `requestId`, `jti` (JWT ID), and a `type` claim. |
| **Binding** | Token's `aud` (audience) and `iss` (issuer) tie it to the originating `requestId`. The backend validates that the token’s `requestId` matches the current request before allowing any operation. |
| **jti** | Unique JWT ID (`jti`) claim generated per token. Stored hashed in a `used_jti` table with a TTL to prevent replay. |
| **Hashed jti storage** | Store `hash(jti)` in a Redis set with an expiration equal to the token’s TTL. This allows O(1) lookup for revocation checks without storing plain JWTs. |
| **Expiration** | **Short‑lived** – 15 minutes for upload tokens, 30 minutes for download tokens. |
| **Maximum uses** | **5 successful uploads** per token. After the 5th successful upload the token is automatically invalidated. |
| **Revocation** | Tokens can be revoked early via an admin endpoint or if suspicious activity is detected. Revocation adds the token’s `jti` hash to a “revoked” set that is checked on each request. |
| **Replay behavior** | Because each token’s `jti` is stored as a hash and checked against the `used_jti` set, a replayed token with the same `jti` will be rejected. Tokens are single‑use per upload batch; after a successful use the hash is added to the set, preventing reuse. |
| **Separate credentials** | Upload and download operations use **different tokens**; a token with `type: UPLOAD` can never be exchanged for `type: DOWNLOAD`. |

---

## 3. GUEST DOWNLOAD
- **Endpoint:** `GET /documents/:documentId`  
- **Authorization flow:**  
  1. Guest presents a **valid download token** (type `DOWNLOAD`) that is bound to the same `requestId` as the target `documentId`.  
  2. The system verifies the token’s signature, expiration, and that the `requestId` matches the requested document’s request.  
  3. It checks the token’s scope – only `DOWNLOAD` tokens are permitted.  
  4. Once authorized, the backend streams the file from private storage **without exposing any public path**.  
- **Security guarantees:**  
  - No direct mapping to `/uploads/filename` is exposed; all file accesses go through the `/documents/:documentId` route.  
  - The token never grants upload permissions; it is strictly limited to retrieval.  

---

## 4. EXISTING EMAIL/SMS INFRASTRUCTURE
- The current audit confirmed that **no dedicated email/SMS services** exist in the codebase.  
- If future notification needs arise, they **must be implemented as separate, non‑security‑critical modules** that do not affect the token lifecycle or authorization logic.  
- For now, any guest credential delivery (e.g., sending the `guestCode`) can use existing internal notification channels without coupling them to security‑critical flows.

---

## 5. MANAGER AUTHORIZATION
- **Privilege model:**  
  - `MANAGER` → **only** requests where `assignedToId` equals the manager’s user ID.  
  - `ADMIN` → all requests where the manager field is populated (or where business rules deem it appropriate).  
  - `SUPER_ADMIN` → unrestricted access to all requests.  
- **Prisma condition (exact expression):**  

```prisma
// Manager can view a request only if they are explicitly assigned
where: {
  assignedToId: { equals: managerId }
}
```

- This condition is a **business decision** and is deliberately distinct from any “ownerId” concept, which does not exist.

---

## 6. REQUEST DOCUMENT MIGRATION
1. **Identify orphan records** – `where: { requestId: null }`.  
2. **Map to possible requests** –  
   - Look for documents that share the same `requestNo` or `guestCode` with a non‑null `requestId` elsewhere.  
   - If a matching request is found, update the orphan’s `requestId` to the discovered ID.  
3. **Recover where possible** – retain those documents in the system with the corrected foreign key.  
4. **Quarantine unrecoverable** – move orphan documents without a matching request to a `QuarantinedDocument` table for manual review.  
5. **Delete unrecoverable** – after a configurable review period, permanently delete quarantine records.  
6. **Enforce non‑null** – alter the `requestId` column to `NOT NULL` (after migration is complete).  
7. **Add foreign key** – define `requestId` as a foreign key to `Request.id`.  
8. **Validate upload code** – ensure every upload path sets `requestId` before persisting the document record.  

*No migration code is included; only the procedural steps are defined.*

---

## 7. FILE SECURITY
- **Size limit:** Keep existing **20 MiB** Multer limit.  
- **Allowed extensions:** `.pdf`, `.png`, `.jpg`, `.jpeg`, `.txt`, `.doc`, `.docx`.  
- **Allowed MIME types:** `application/pdf`, `image/png`, `image/jpeg`, `text/plain`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`.  
- **Extension/MIME consistency:** Every file must pass both checks; mismatches result in rejection.  
- **Filename generation:** Generate UUID‑based filenames and store the original extension; avoid user‑controlled names to prevent path traversal.  
- **Path traversal protection:** Store files outside the web root and serve them via the private storage API; never expose directory listings.  
- **File count limits:** Up to **10 files per request** unless business rules dictate otherwise.  
- **Total upload limits:** Per request, **100 MiB** total payload size.  
- **Magic‑byte validation (optional):** Verify file signatures for PDFs, PNGs, JPEGs, DOCX, and DOC to mitigate forged extensions.  
- **Private storage:** All uploaded files are saved in a directory that is **not directly accessible** via HTTP; access is only through `/documents/:id`.  
- **Cleanup:** If a database transaction fails after a successful file write, the uploaded file is immediately deleted to avoid orphaned data.  

---

## 8. PRIVATE DOCUMENT API
- **Endpoint:** `GET /documents/:id`  
- **Authorization check order:**  
  1. Verify JWT or session token is present.  
  2. Verify token’s `aud`/`iss` match the `requestId` of the document.  
  3. Verify token’s `type` claim (`DOWNLOAD` for guests, `VIEW` for USER, `MANAGER`/`ADMIN`/`SUPER_ADMIN` as appropriate).  
  4. If all checks pass, stream the file from private storage.  
- **Access matrix:**

| Role          | Condition to serve file |
|---------------|--------------------------|
| Guest         | Valid `DOWNLOAD` token scoped to the document’s `requestId`. |
| USER          | Valid token with `VIEW` scope scoped to the request. |
| MANAGER       | Either assigned to the request **or** token scope includes `MANAGE`. |
| ADMIN         | Always permitted for the document’s request. |
| SUPER_ADMIN   | Always permitted. |

- **Frontend impact:** Existing URLs that point directly to `/uploads/*` must be updated to use the new `/documents/:id` endpoint.

---

## 9. REFRESH TOKENS
- **Chosen approach:** **tokenVersion** (simple incremental version stored on the user/session record).  
- **Why sufficient:**  
  - Existing session objects already have a `version` field used for versioning password changes. Incrementing the version automatically invalidates all previously issued refresh tokens, providing a lightweight revocation mechanism.  
  - No additional database table or complex revocation list is needed.  
  - Works well with the current token‑lifetime model and does not require redesign of the authentication flow.  

---

## 10. RATE LIMITING
- Continue using the **Redis‑backed global limiter**.  
- Add **route‑specific limits** (all Redis keys prefixed with the route name):  

| Route                     | Limit (per minute) | Reason |
|---------------------------|--------------------|--------|
| `guest/tracking`          | 30                 | Prevent abuse of request‑tracking endpoints. |
| `guest/upload`            | 20 uploads/5 min   | Align with token usage caps (max 5 uploads per token). |
| `documents/download`      | 60 downloads/5 min | Guard against enumeration. |
| `auth/login` (if OTP used)| 10 attempts/15 min | Mitigate brute‑force. |

- Limits are **conservative**; values can be tuned later based on observed traffic.

---

## 11. FINAL API CHANGES
| Endpoint                | Current Auth               | Final Auth                     | Authorization                                            | Change Required |
|-------------------------|----------------------------|--------------------------------|----------------------------------------------------------|-----------------|
| `POST /requests`        | None (public)              | Authenticated (guest)          | Guest `guestCode` → token exchange                       | Add request‑creation guard |
| `GET /requests/:id`     | Public (if ID known)       | Authenticated (any)            | Token scoped to `requestId`                               | Add token validation |
| `GET /requests`         | Public listing             | Authenticated (manager+)       | Manager must be assigned or admin/super‑admin            | Add manager filter |
| `POST /requests/:id/upload` | Authenticated (owner)   | Authenticated (guest token)    | Upload token (`UPLOAD`) scoped to request                | Replace file‑upload middleware |
| `GET /documents`        | Public list                | Authenticated (any)            | Token scoped to request & document owner                 | Update list endpoint |
| `GET /documents/:id`    | Public (static)            | Authenticated (any)            | Token validated per role matrix                           | Switch to private storage API |
| `DELETE /documents/:id` | Owner only                 | **Removed** (no direct delete) | Authorization not exposed; delete via admin workflow    | Deprecate endpoint |
| `POST /auth/login`      | Public                     | Authenticated                  | Returns login token + OTP (if enabled)                  | Add OTP handling |
| `POST /auth/refresh`    | Public                       | Authenticated                  | Refresh token validated against `tokenVersion`          | Add version check |
| `POST /auth/logout`      | Public                       | Authenticated                  | Revokes token/tokenVersion                               | Add revocation logic |
| `GET /notifications`   | Public                       | Authenticated (manager+)       | Manager must be assigned or admin                        | Add permission guard |

---

## 12. FINAL DATABASE CHANGES
| Model               | Field          | Current        | Final          | Required? | Reason |
|---------------------|----------------|----------------|----------------|-----------|--------|
| `Request`           | `requestId`    | Auto‑generated | Auto‑generated | N/A       | No change |
| `RequestDocument`   | `requestId`    | Nullable       | **Non‑Nullable** (after migration) | Yes | Enforce relationship |
| `User`              | `role`         | ENUM (`ADMIN`, `SUPER_ADMIN`) | ENUM (`ADMIN`, `SUPER_ADMIN`, `MANAGER`, `USER`, `GUEST`) | Yes | Introduce manager & guest roles |
| `Token`             | `jti`          | –              | String (hashed) | N/A | Store hashed JTI for revocation |
| `Token`             | `type`         | –              | ENUM (`UPLOAD`, `DOWNLOAD`) | Yes | Separate credential types |
| `Token`             | `maxUses`      | –              | Integer (5 for upload) | Yes | Enforce usage cap |
| `Token`             | `expiresAt`    | –              | DateTime       | Yes | Token expiration handling |
| `UsedJti` (new)     | `hashed_jti`   | –              | String (unique) | N/A | Prevent token replay |
| `QuarantinedDocument` (new) | – | – | – | – | Store orphan docs for review |

---

## 13. FINAL IMPLEMENTATION ORDER
| Phase | Priority | Activities | Likely Affected Files | Database Impact | API Impact | Tests |
|-------|----------|------------|-----------------------|-----------------|------------|-------|
| **P0** | Critical | - Guest token exchange logic  <br> - Upload token generation & usage cap  <br> - Basic authorization middleware for guest → token flow | `auth.service.ts`, `token.service.ts`, `upload.controller.ts` | Add token tables, `used_jti` set, `Token.type`, `Token.maxUses` | New `/auth/login`, `/auth/refresh`, `/auth/logout` endpoints | Unit tests for token flow, integration tests for upload token revocation |
| **P1** | High‑risk | - Manager authorization rule (`assignedToId`) <br> - Guest download endpoint (`GET /documents/:id`) | `authorization.service.ts`, `document.controller.ts` | Update `User.role`, add foreign key constraints | Modify `/documents` routes, adjust permission checks | End‑to‑end tests for manager view, guest download, role escalation |
| **P2** | Auth hardening | - TokenVersion refresh approach <br> - Rate limiting per route | `auth.service.ts`, `rate-limiter.ts` | Add `tokenVersion` column to `User` | Update refresh token endpoint | Load tests for rate limits, tokenVersion revocation |
| **P3** | Additional security improvements | - Orphan document migration <br> - File validation improvements (magic bytes) <br> - Private storage enforcement | `document.service.ts`, `file-validation.util.ts` | Create `QuarantinedDocument` table, modify `RequestDocument.requestId` constraint | Update file listing API, adjust frontend URLs | Migration script execution tests, validation regression tests |

---

## 14. IMPLEMENTATION READINESS
**READY FOR IMPLEMENTATION**