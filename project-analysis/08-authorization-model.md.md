**project-analysis/05-authorization-model.md**

---  
# Authorization and Ownership Model  

## ServiceRequest Ownership  

- The `ServiceRequest` Prisma model contains the following fields relevant to ownership:  
  - `id` (primary key)  
  - `guestName`, `guestEmail`, `guestPhone`, `guestAddress` – used when a **guest** creates a request.  
  - `assignedToId` – references a `UserDetails` record; represents the **manager** assigned to the request.  
  - **No explicit `userId` or `ownerId` field exists** that links the request to an authenticated user who creates it.  
- Requests are therefore identified by guest data; ownership is established later through assignment/claim actions (`assignManager`, `claimRequest`).  
- The `assignedToId` field is **nullable**, meaning a request may initially have no manager.  

**Conclusion:** There is no direct `ownerId` field; the system treats a request as “owner‑less” until a manager is assigned or the request is claimed.  

---  
## Role Permissions  

| Role | Can Create Request? | Can View Own Requests? | Can View All Requests? | Can Upload Documents? | Can Access Own Documents? |
|------|----------------------|------------------------|------------------------|------------------------|---------------------------|
| **Guest (unauthenticated)** | ✅ (via guest fields) | ❌ (no protected endpoint) | ❌ | ✅ (upload endpoint unauthenticated) | ✅ (static `/uploads` publicly reachable) |
| **Authenticated USER (non‑manager)** | ❓ (no explicit create endpoint) | ❌ | ❌ | ✅ (upload endpoint unauthenticated) | ✅ |
| **MANAGER** | ❓ (must be assigned/claim) | ✅ (via `GET /requests/:id` – role guard includes MANAGER) | ✅ (any request, no ownership filter) | ❌ (upload endpoint has no auth) | ✅ (via `GET /request/:requestId` returns documents) |
| **ADMIN** | Same as MANAGER | Same | Same | Same | Same |
| **SUPER_ADMIN** | Same as MANAGER | Same | Same | Same | Same |

**Key observations**  
- `authCheck` on `GET /requests/:id` only checks that the caller’s role is **ADMIN**, **MANAGER**, or **SUPER_ADMIN**; it does **not** filter by request ownership.  
- Consequently, any of those roles can retrieve **any** request’s data, fulfilling a high‑level “all‑requests view” capability.  

---  
## Guest Workflow  

- Guests can create a request by posting to `/requests/create` (or via UI) providing `guestName`, `guestEmail`, `guestPhone`, etc. **No authentication is required**.  
- The created `ServiceRequest` is stored with the supplied guest data; it is **not linked** to any authenticated user.  
- Guests can later **track** their request using the `track` endpoint (`GET /requests/track`) which accepts `requestNo` and `guestEmail` (or `guestPhone`) as query parameters. This endpoint is **public** (no `authCheck`).  
- The tracking endpoint returns request summary but does **not** expose uploaded documents.  
- Because the system does not associate the request with an authenticated user, **authentication is intentionally omitted** from the guest‑facing workflow.  
- Uploading documents currently does **not** require authentication; thus a guest can upload files to any `requestId` without proving ownership.  

---  
## Document Ownership  

- `RequestDocument` has the fields:  
  - `requestId` (nullable `String`) – intended to reference a `ServiceRequest`.  
  - `uploadedById` (nullable `String`) – references the `UserDetails` that uploaded the file.  
  - `uploadedByRole` (optional Role) – stored at upload time.  
- In the current upload flow (`POST /upload/:requestId`):  
  - The `requestId` parameter is **not validated** nor used to set `requestId` on the new `RequestDocument`.  
  - The service creates a `RequestDocument` **without** a `requestId`, leaving it **orphaned** (no link to any request).  
  - File metadata (name, original name, MIME type, size, etc.) is stored, but the association to the request is lost.  
- Consequently, **request‑document linkage is not enforced**; multiple documents could be orphaned, and later retrieval based on a request ID cannot guarantee that the documents belong to that request.  

---  
## Document Access Matrix  

| Actor | Upload Document | Retrieve Own Documents | Retrieve Any Request’s Documents | Download via static `/uploads` |
|-------|----------------|------------------------|-----------------------------------|-------------------------------|
| Guest (unauthenticated) | ✅ (upload endpoint unauthenticated) | ❌ (no endpoint) | ❌ (no endpoint) | ✅ (static files publicly reachable) |
| Authenticated USER (non‑manager) | ✅ (upload endpoint unauthenticated) | ❌ (no endpoint) | ❌ | ✅ |
| MANAGER | ❌ (no auth required but endpoint requires role check; currently no auth) | ✅ (via `GET /request/:requestId` returns documents for that request) | ✅ (any request, no ownership filter) | ✅ |
| ADMIN | Same as MANAGER | Same | Same | ✅ |
| SUPER_ADMIN | Same as MANAGER | Same | Same | ✅ |

**Key points**  
- Uploaded files are stored in `./uploads/requests/` and served statically, making them publicly accessible.  
- The only protected endpoint for viewing documents (`GET /request/:requestId`) only checks broad role permissions; it does **not** verify that the caller is the uploader or request owner.  

---  
## Confirmed Security Problems  

1. **Unauthenticated Document Upload (Critical)**  
   - `POST /upload/:requestId` lacks `authCheck`.  
   - No validation of `requestId` or request ownership.  
   - Uploaded files are stored without linking to the supplied `requestId`.  
   - Files are placed in a publicly served directory (`/uploads`).  

2. **Request‑IDOR (High)**  
   - `GET /requests/:id` and `GET /requests` endpoints are guarded only by role checks (`ADMIN`, `MANAGER`, `SUPER_ADMIN`).  
   - The underlying service (`RequestServices.getSingleRequest`) performs a plain `findUnique` on the supplied ID with **no ownership check**.  
   - Any manager/ADMIN/SUPER_ADMIN can retrieve **any** request’s data, regardless of who created or owns it.  

---  
## Business Rules That Need a Decision  

- **Intended ownership model** – Should a request be permanently tied to the guest who created it, or can it be reassigned/claimed freely?  
- **Scope of manager access** – Should managers be allowed to view *all* requests, or only those assigned to them?  
- **Document visibility** – Should a document be downloadable only by the uploader, the request owner, or any privileged role?  
- **Guest‑to‑authenticated user linkage** – When a guest later registers/login, should their historic requests automatically become linked to their authenticated account?  

---  
## Recommended Security Architecture (Based on Current Data Model)  

1. **Do not invent a missing `ownerId` field** – If the schema lacks an explicit owner reference, treat the request as “owner‑less” until an assignment occurs.  
2. **Add authentication & ownership validation to the upload endpoint**:  
   - Apply `authCheck` (or a dedicated `authorizeRequestOwner` middleware) to `POST /upload/:requestId`.  
   - Validate that the authenticated user’s `UserDetails.id` matches the `request`’s owner (or that the user is a manager assigned to the request).  
   - Ensure `requestId` is present and **persist it** on the newly created `RequestDocument` (`requestId` relation).  
3. **Restrict document retrieval to the request owner or an assigned manager**:  
   - Modify `DocumentControllers.getRequestDocuments` (or add a dedicated middleware) to verify that the caller is either the request owner (`uploadedById`) or holds a role explicitly permitted to view all documents.  
   - Remove or protect the public static `/uploads` route; serve files through a protected endpoint that performs the same ownership check before streaming the file.  
4. **Refine role‑based access control**:  
   - If the business rule is “managers may view only their assigned requests”, adjust the `authCheck` on `GET /requests/:id` to also require `assignedToId === callerId` **or** add a separate `authorizeRequestOwnership` middleware that checks the relationship.  
   - Keep `ADMIN`/`SUPER_ADMIN` access only where truly needed (e.g., audit functions).  
5. **Preserve legitimate guest workflow**:  
   - Do **not** add authentication to endpoints that are intentionally public for guests (e.g., `track` endpoint).  
   - If guest uploads are to be allowed, consider adding a lightweight captcha or rate‑limit rather than removing auth entirely.  
6. **Persist `requestId` on `RequestDocument`**:  
   - In `DocumentServices.uploadDocuments`, after validation, create the `RequestDocument` with `requestId: suppliedRequestId`.  
   - This will allow proper querying of “all documents belonging to a request” and enforce ownership at the database level (a foreign‑key constraint could be added).  
7. **Audit and logging** – Add logs for upload and document download events to detect abuse.  

These recommendations respect the **actual** Prisma schema (no invented fields) and the observed code paths, ensuring that any security fix aligns with the existing data model and intended business processes.