**project‑analysis/13‑final‑implementation‑blueprint.md**

# 1. Consistency Check Summary
The security specification (12‑security‑implementation‑spec.md) was cross‑checked against the actual codebase (Prisma schema, TypeScript sources, route definitions, middleware, Redis configuration, authentication flow, and role definitions). The comparison shows that several proposed designs do **not** yet exist in the current implementation and would require new code, schema changes, or route modifications.

# 2. Mapping of Specification Items to Existing Code

| Specification Section | What Exists in Code | Gap / Mismatch |
|----------------------|----------------------|----------------|
| **Guest Authorization Model** | Guest can create a `ServiceRequest` via a **public** `POST /requests/create` (no auth). No token exchange flow is implemented yet. | No “guest session token” generation or storage; the model must be created. |
| **Token Design** | JWTs are created (`loginUser`) but **no** `jti` handling, no usage‑counter, no `GuestSession` table, no token revocation store. | No storage for `jti`, no usage limits, no revocation list. |
| **Guest Download** | No `/documents/:documentId` endpoint; files are served statically from `/uploads`. | Must replace static serving with a protected endpoint that checks token scope. |
| **Email/SMS Infrastructure** | No dedicated email/SMS provider is referenced in the codebase. | Specification can reuse existing internal notification mechanisms; no conflict. |
| **Manager Authorization** | `authCheck(Role.ADMIN, Role.SUPER_ADMIN, Role.MANAGER)` is used on request routes, **but** it does **not** filter by `assignedToId`. | Must add `assignedToId` check to enforce “manager only sees assigned requests”. |
| **Request‑Document Migration** | `RequestDocument.requestId` is **nullable** (`String?`). No orphan‑cleanup job or migration script exists. | Must identify orphan documents, attempt to map to a `ServiceRequest`, quarantine/delete, then make `requestId` non‑nullable and add foreign key. |
| **File Security** | Multer limit is 20 MiB; file‑type validation is minimal; uploads are stored in a public `/uploads` folder. | Specification requires stricter MIME/type validation, filename sanitisation, private storage, and usage caps. |
| **Private Document API** | Static route `express.static('uploads')` serves files; no `/documents/:id` endpoint. | Must remove static mount and expose files only through an authorized `/documents/:id` route. |
| **Refresh‑Token Hardening** | Refresh flow exists (`refreshToken` endpoint) but **no** `tokenVersion`, **no** `RevokedToken` table, **no** short‑lived access token enforcement. | Must add `tokenVersion` field to `UserDetails`, a `RevokedToken` model, and switch to 15‑min access‑token TTL. |
| **Rate Limiting** | Global Redis‑backed limiter is in place (`globalRateLimiter`). | Must add route‑specific limits (e.g., upload, download, tracking). |
| **Roles** | `enum Role` contains `USER`, `MANAGER`, `ADMIN`, `SUPER_ADMIN`; **no `GUEST`** entry. | Must **not** add `GUEST` to the enum unless absolutely required. |
| **Request Model** | Prisma model is `ServiceRequest` (singular) with relation to `RequestDocument`. | Specification must refer to `ServiceRequest`, not a non‑existent `Request`. |
| **Login / Refresh Endpoints** | `/login` and `/refresh-token` are **public** (no `authCheck`). | Must keep them public; they are not required to be authenticated. |

# 3. Identified Blockers
- **Token‑usage conflict** – Specification wants up to 5 uploads per token *and* also says “add `jti` to `used_jti` after each successful use” which would invalidate the token after the first use. No usage‑counter exists; we need a counter stored somewhere (Redis or DB) to allow 5 uses.
- **Missing Token storage mechanism** – No `Token` table, `GuestSession` table, or Redis key for `jti` currently exists. Adding a storage layer (even just a Redis set for used `jti`s) is required.
- **Role enum does not contain `GUEST`** – The current `Role` enum only has `USER`, `MANAGER`, `ADMIN`, `SUPER_ADMIN`. Introducing a `GUEST` role would be a schema change not present in the codebase.
- **Request‑document orphan handling** – `requestId` is nullable now; we must write a migration plan that (1) finds orphan `RequestDocument`s, (2) attempts to map them to a `ServiceRequest` (using `requestNo` or `guestCode`), (3) quarantines or deletes unrecoverable records, then (4) makes `requestId` non‑nullable and adds a foreign key. No such logic exists.
- **Manager authorization still role‑only** – Access to request endpoints currently only checks role, not `assignedToId`. The business rule “manager may view only assignedToId” is not enforced.
- **Static file exposure** – `/uploads` is served statically. The specification requires removal of this exposure and serving documents exclusively through a protected `/documents/:id` endpoint.
- **Refresh‑token versioning & revocation not implemented** – No `tokenVersion` column, no `RevokedToken` model, no short‑lived access‑token TTL change.
- **Rate‑limit per route not yet defined** – Only a global limiter exists; route‑specific limits must be added.
- **File‑validation rules** – Current upload validates only size (20 MiB) and stores files publicly; the specification requires MIME‑type, extension, magic‑byte checks, filename sanitisation, private storage, and strict per‑request file‑count/total‑size limits.
- **Guest token exchange flow** – The spec describes a flow where a guest receives a `guestCode` and then a scoped session token, but the codebase presently has no endpoint that issues such a token or stores it.

# 4. Overall Assessment
Because the above gaps exist, the current codebase **does not yet satisfy** all the requirements outlined in the security specification. The implementation would need several new database models (or Redis structures), migration scripts, route changes, and validation updates before it can be marked *implementation‑ready*.

**NOT READY FOR IMPLEMENTATION**  
**Blockers:**  
- Token usage counter vs. `jti` revocation conflict  
- No existing `Token`/`GuestSession` storage; need new storage mechanism  
- Role enum lacks `GUEST` (must not be added)  
- `ServiceRequest` vs. `Request` model name mismatch  
- `RequestDocument.requestId` nullable; orphan cleanup and migration undefined  
- Manager auth does not enforce `assignedToId`  
- Static `/uploads` serving must be removed; private storage not yet in place  
- Refresh‑token versioning and revocation not implemented  
- Route‑specific rate limiting not yet configured  
- File validation and security policies not fully enforced  

These items must be resolved before any source‑code changes can be made. Until they are addressed, the specification remains *not ready for implementation*.