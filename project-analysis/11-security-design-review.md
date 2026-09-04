# project-analysis/11-security-design-review.md

## 1. Guest token lifecycle  

**Current conflicting statements**  

| Statement | Intended meaning |
|-----------|-----------------|
| Upload tokens are **single‑use** | After the first successful upload the token must be marked **used** and become invalid. |
| Maximum **5 uploads per token** | A token may allow up to five successful uploads before expiry. |
| Upload token may be **re‑used for download** | The same token that was created with `scope=upload` can later be presented with `scope=download`. |
| Scopes include **upload/download/manage/delete** | A single token can carry any of those scopes. |

**Why this is contradictory**  

* A token that is “single‑use” cannot also be limited to “5 uploads”.  
* Allowing an **upload‑scoped** token to be presented later with **download** scope breaks the principle of least privilege – a token granted for upload should never automatically grant download rights.  
* Mixing scopes in one credential makes it hard to enforce granular access control.

**Recommended precise lifecycle**  

| Token type | Scope | Use limits | Expiration | Binding | jti handling |
|------------|-------|------------|------------|---------|--------------|
| **Guest upload token** | `upload` | Up to **5** successful uploads **or** until first use (single‑use variant) – choose one implementation. | Fixed TTL (e.g., **24 h**) | Include `requestId` and a **jti** (JWT ID). Store **hashed jti** in DB for revocation checking. | Store `hash(jti)`; treat token as used after first successful upload (or after 5 uses). |
| **Guest download token** | `download` | Single‑use (or limited similarly) | Separate TTL (e.g., **12 h**) | Include `requestId` and its own `jti`. | Same hashed‑jti storage. |

*An upload‑scoped token may **never** be upgraded to a download‑scoped token. Separate credentials are required.*

---

## 2. GuestCode  

**Verification of existing infrastructure**  

| Component | Existence in codebase | Comments |
|-----------|-----------------------|----------|
| Email service | **Not found** in source (only referenced in design docs). | Must be added – e.g., SendGrid, SES, or similar. |
| SMS service | **Not found**. | Must be integrated – e.g., Twilio, Nexmo. |
| OTP infrastructure | Not implemented; only mentioned as “generated”. | Should store OTP in Redis with TTL (≈10 min). |
| Notification service | Not present. | Could reuse the same email/SMS providers. |
| Existing verification codes | Design mentions `guestCode` field on `ServiceRequest` (`guestCode: String?`). | Field exists conceptually, but actual code that writes it is not visible in the snippets examined. |

**Recommendation**  

| Item | Recommendation |
|------|----------------|
| **Code format** | 6‑digit numeric OTP or UUID‑v4 string. |
| **Expiration** | 10 minutes (configurable). |
| **Attempt limit** | Max 5 attempts per code; after lockout apply rate‑limit. |
| **Hashing / storage** | Store salted hash (bcrypt or SHA‑256 with per‑code salt) in Redis with TTL. |
| **Regeneration** | Invalidate the previous code (delete key) and create a new one on each request. |
| **Rate limiting** | Global limit 10 attempts per hour per IP; per‑user limit 5 attempts per hour. |
| **Delivery** | Dispatch via the missing email and SMS services; fallback to in‑app push if needed. |

---

## 3. File validation  

**Current upload configuration (from source)**  

| Config source | Value |
|---------------|-------|
| Upload directory | `process.cwd()/uploads/requests` (served via `express.static('/uploads')`). |
| Multer size limit | `fileSize: 20 * 1024 * 1024` → **20 MiB** per file. |
| MIME type handling | Stored in DB (`mimeType`) but **not validated** before storage. |
| Extension whitelist | Defined in the security design doc: `.pdf`, `.png`, `.jpg`, `.jpeg`, `.txt`, `.doc`, `.docx`. |
| Magic‑byte validation | Mentioned as “optional for critical files (e.g., PDF) – read first 4 bytes”. Not implemented. |

**Compatibility table**

| Extension | Expected MIME | Allowed by current whitelist? | Magic‑byte validation applied? |
|-----------|---------------|------------------------------|-------------------------------|
| pdf | `application/pdf` | ✅ Yes | ❌ No (optional) |
| png | `image/png` | ✅ Yes | ❌ No |
| jpg | `image/jpeg` | ✅ Yes | ❌ No |
| jpeg | `image/jpeg` | ✅ Yes | ❌ No |
| txt | `text/plain` | ✅ Yes | ❌ No |
| doc | `application/msword` | ✅ Yes | ❌ No |
| docx | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | ✅ Yes | ❌ No |

**Key observations**

* The whitelist matches the design, but **no runtime validation** of extension or MIME is performed before persisting the file.  
* Size limit of **20 MiB** is enforced by Multer, aligning with the design.  
* No magic‑byte check is currently enforced.  
* Files are stored in a **public** `uploads/` directory, making them directly downloadable without authentication.

---

## 4. Manager authorization  

**Current implementation**  

* Routes use `authCheck(Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)`.  
* The role list **allows any** of those roles to call the endpoint; there is **no ownership filter** on the request ID.  

**Design expectations**  

| Expectation | Current reality | Verdict |
|-------------|----------------|---------|
| **A. Manager can access only assigned/claimed requests** | Not enforced – any manager can retrieve any request by ID. | ❌ **Contradiction** |
| **B. Manager can access all requests** | Implemented (via role check only). | ✅ **Implemented**, but conflicts with A. |

**Recommendation**  

* Adopt **Option A** (least‑privilege) as the business decision.  
* Add an **ownership check** in the service layer (e.g., query `ServiceRequest` with `ownerId === req.user.id` or `assignedToId === req.user.id`).  
* Keep the role list but **combine** it with the ownership filter; otherwise the current role‑only guard is insufficient.

---

## 5. Guest ownership  

**How guest request creation works today**  

1. `ServiceRequest` is created.  
2. `guestCode` (a random string) is generated and stored on the request.  
3. The code is delivered to the guest via email/SMS (out‑of‑band).  
4. The guest receives a **guest‑session token** (scope=upload) that must be presented with each upload.  

**Can `guestCode` become the ownership credential?**  

* **Pros** – Already persisted on `ServiceRequest`; unique per request; can be transmitted securely via the session token.  
* **Cons** – Current upload endpoint **does not validate** the `guestCode`; it only checks the upload‑scoped token. Therefore the ownership proof is not enforced.  
* **Impact on existing flows** – Changing the upload logic to require `guestCode` will not break request creation, tracking, or frontend forms, provided the frontend continues to send the code with each upload request.  

**Recommendation**  

* Enforce that every upload request **must present a valid `guestCode`** that matches the `ServiceRequest` it belongs to.  
* Validate the code server‑side against the stored value and ensure it has not expired.  
* Keep the existing email/SMS delivery path; only add server‑side validation.

---

## 6. RequestDocument  

**Prisma schema verification**

```prisma
model RequestDocument {
  id            String   @id @default(uuid())
  requestId     String?   // **nullable**
  uploadedById  String?   // **nullable**
  uploadedByRole Role?
  name          String
  originalName  String
  url           String   // S3 URL (currently `/uploads/requests/...`)
  key           String
  mimeType      String
  size          Int
  description   String?
  createdAt     DateTime @default(now())
  request       ServiceRequest? @relation(fields: [requestId], references: [id], onDelete: Cascade)
  uploadedBy    UserDetails? @relation(fields: [uploadedById], references: [id])
}
```

* `requestId` is **nullable**, allowing orphan documents.  
* `uploadedById` is also nullable.  
* The relation to `ServiceRequest` uses `onDelete: Cascade`, but orphan documents can still exist because `requestId` can be missing entirely.

**Safe migration strategy**

| Step | Action |
|------|--------|
| 1 | **Identify orphans** – run a script that finds `RequestDocument` rows where `requestId` is `null`. Decide to delete or move them to a quarantine area. |
| 2 | **Add a non‑null constraint** – after confirming no orphans, alter the column to `requestId String` (make it required). This can be done via a migration script (`prisma migrate dev`). |
| 3 | **Enforce request binding on upload** – modify `DocumentServices.uploadDocuments` (or the controller) to set `requestId` when creating `RequestDocument`. |
| 4 | **Back‑fill existing orphaned records** – either re‑associate them with the correct request (if possible) or permanently delete them before the schema change. |
| 5 | **Add a DB index** on `requestId` for faster look‑ups (already present). |
| 6 | **Update API contracts** – ensure any service that returns a `RequestDocument` includes `requestId` in the response after migration. |

---

## 7. Private storage  

**Current state**  

* Uploaded files are written to `process.cwd()/uploads/requests`.  
* `src/app.ts` registers `express.static('/uploads', ...)` exposing the directory publicly.  
* Upload service returns URLs like `/uploads/requests/<filename>` which are fetched directly by the frontend.  

**What will break if static serving is removed**  

| Dependency | Effect of removal |
|------------|-------------------|
| Frontend code that expects file URLs from `/uploads/...` | Will receive 404; UI will fail to display/download files. |
| Direct links shared externally | Those links become inaccessible. |
| Any third‑party service crawling `/uploads` | Will no longer find files. |

**Required changes**  

1. **Remove** `express.static('/uploads')` from `src/app.ts`.  
2. **Introduce a protected endpoint** (e.g., `GET /api/v1/documents/:id`) that checks authentication/authorization and streams the file content.  
3. **Update** any frontend calls to consume the new API instead of static URLs.  

---

## 8. Manager/Admin authentication  

**Current JWT / `authCheck` flow**  

* `authCheck` extracts the access token (header or cookie).  
* Token is verified with `verifyJwtToken` using `JWT_ACCESS_SECRET`.  
* Payload contains `id`, `role`, etc.; user record is fetched and role is checked against the allowed list passed to `authCheck`.  

**Recommendations**  

| Role | Current token needs | Recommended approach |
|------|--------------------|----------------------|
| **Guest** | No JWT – uses **guest‑session token** with limited scope. | Keep separate token (upload/download) with its own `jti` and scope. |
| **Manager** | Uses same JWT as regular users, but route guards include `Role.MANAGER`. | No new token type required; just enforce **ownership filter** in service layer (see §4). |
| **Admin / Super‑Admin** | Same JWT, role check includes `ADMIN` / `SUPER_ADMIN`. | No extra token needed; rely on role claim and optional extra claims (e.g., `isAdmin`). |

*There is no need for a dedicated manager‑only JWT unless you want to embed extra claims (e.g., `assignedToId`). If you do, create a **manager‑specific token** that includes `assignedToId` and validate it alongside the role check.*

---

## 9. Refresh tokens  

**Proposed design**  

* `tokenVersion` field on user to invalidate old tokens.  
* `RevokedToken` table for explicit revocation.  
* 15‑minute access tokens, refresh rotation.  

**Current reality**  

* Access token lifespan is not explicitly set in the reviewed snippets (likely longer).  
* No `RevokedToken` model exists.  
* Refresh rotation is not implemented – a new refresh token is issued but the previous one remains valid.  

**Minimum safe implementation**  

1. Keep the **existing refresh‑token flow** (issue new refresh token, keep old one functional).  
2. **Add a short access‑token TTL** (e.g., 15 min) – update `JWT_ACCESS_EXPIRES_IN` config.  
3. **Introduce token versioning** – store `tokenVersion` on the user; reject access tokens whose version does not match the stored version.  
4. **Optional revocation list** – if you want immediate revocation, add a lightweight `RevokedToken` collection storing the `jti` of revoked tokens with an TTL equal to the refresh token TTL. This can be a simple table; not mandatory if token versioning suffices.  

*Do not add redundant mechanisms unless you need immediate revocation; the version check is enough for basic safety.*

---

## 10. Rate limiting  

**Current Redis rate limiter** (`src/middleware/globalRateLimiter.ts`)  

```ts
new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "global_rate_limit",
  points: 100,
  duration: 60,
  blockDuration: 60,
});
```

* 100 points per 60 seconds per IP.  
* On exhaustion, returns **429 Too Many Requests**.  

**Observations**  

* Limits are **global**, not per‑route.  
* No route‑specific thresholds are defined (could be added later).  
* Failure mode is a standard 429 response – acceptable.  

**Recommendation**  

* Use the existing limiter as a baseline; if per‑route limits are required, instantiate additional `RateLimiterRedis` instances with custom `keyPrefix` and `points` per endpoint.

---

## 11. Security architecture (final diagram)

```
Guest Request
   │
   ├─► Guest ownership credential (guestCode)
   │
   ├─► Upload authorization
   │       • Scope = upload
   │       • Limited uses (≤5) or single‑use
   │       • Expiration (TTL)
   │       • requestId binding
   │       • jti + hashed jti storage (revocation)
   │
   ├─► File validation
   │       • Extension whitelist (pdf, png, jpg, jpeg, txt, doc, docx)
   │       • MIME type check (application/pdf, image/*)
   │       • Size limit (20 MiB)
   │       • Optional magic‑byte check for PDFs
   │
   ├─► Private storage (outside public web root)
   │
   └─► RequestDocument linkage
           • requestId (nullable → will become required after cleanup)
           • uploadedById / uploadedByRole
           • Metadata stored in DB
           • Retrieval via protected API (auth + role)

Manager
   │
   ├─► Existing JWT (same as user)
   ├─► Role‑based authCheck (MANAGER, ADMIN, SUPER_ADMIN)
   └─► Additional service‑layer check:
           • Access only to assigned/claimed requests (ownership filter)

Admin / Super‑Admin
   │
   ├─► Existing JWT
   └─► Role‑based authCheck (ADMIN, SUPER_ADMIN)
           • May have broader CRUD permissions (as defined by business)
```

---

## 12. Final contradictions

| Issue | Current design | Problem | Corrected design |
|-------|----------------|---------|------------------|
| **Upload token reuse for download** | Same token can be presented with `scope=download` | Breaks least‑privilege; token purpose leakage | Separate **download token** with its own scope and jti |
| **Scopes include upload/download/manage/delete** | One token can carry multiple scopes | Increases attack surface; ambiguous permissions | Use **dedicated tokens** per scope (upload, download, manage, delete) |
| **Single‑use vs max 5 uploads** | Described as both – contradictory wording | Unclear policy; potential for abuse | Clarify: **single‑use** *or* **max 5 uses** (choose one) and enforce via jti tracking |
| **Manager access** | `authCheck(Role.MANAGER, …)` only – no ownership filter | Allows managers to view any request | Add **ownership/assignment check**; keep role guard |
| **`requestId` nullable** | Leads to orphan `RequestDocument`s | Data inconsistency; potential privacy leak | Clean up orphans, then make `requestId` **non‑nullable** |
| **Public static `/uploads` exposure** | Files accessible without auth | Violates private‑storage principle; privilege escalation | Remove static mount; serve via authenticated endpoint |
| **GuestCode validation missing on upload** | Upload endpoint validates only token | Ownership proof not enforced | Require **guestCode** validation on every upload request |
| **Access‑token TTL not 15 min** | Token lifetime unspecified (likely longer) | Longer exposure window | Set **access token TTL ≈15 min**; enforce via config |
| **Refresh token revocation** | No revocation store; rotation not required | Stolen refresh token can be reused | Add **token version** check (or optional revocation list) |

---

## 13. Final implementation readiness  

**Status:** **NOT READY FOR IMPLEMENTATION**

**Blocking issues (only the specific decisions/technical items that must be resolved before coding):**

- ✅ Resolve **guest‑code validation** on the upload endpoint.  
- ✅ Implement **separate download token** (scope=download) and prevent reuse of upload tokens for download.  
- ✅ Enforce **single‑use or max‑5‑use policy** consistently (store/use hashed jti).  
- ✅ Add **ownership filter** for manager endpoints (restrict to assigned requests).  
- ✅ Clean up existing **orphan RequestDocument** records and migrate `requestId` to `NOT NULL`.  
- ✅ **Remove** `express.static('/uploads')` and replace with a **protected document‑serving API**.  
- ✅ Adjust **access‑token TTL** to ~15 minutes.  
- ✅ Add **token version** field (or revocation mechanism) for refresh‑token safety.  
- ✅ Clarify and document **scope‑specific token creation** (upload vs download) in code.  

Only after addressing every item above can the design be considered ready for implementation.  

---  

**NOT READY FOR IMPLEMENTATION**