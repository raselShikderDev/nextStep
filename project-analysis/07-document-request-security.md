**project-analysis/04-document-request-security.md**

---  
# Data Model  

```
UserDetails ──1───∞ ServiceRequest      (UserRequests)  
UserDetails ──1───∞ RequestDocument    (UploadedBy)    
UserDetails ──1───∞ RequestStatusHistory (ChangedBy)    
UserDetails ──1───∞ Payment              (VerifiedBy)    
UserDetails ──1───∞ User                 (email, role…)  

ServiceRequest
   ├─ id                (PK)
   ├─ requestNo         (guest‑generated)
   ├─ guestName / guestEmail / guestPhone   (guest fields)
   ├─ assignedToId      (FK → UserDetails)      ← manager assigned by admin
   ├─ status            (RequestStatus)
   ├─ createdAt / updatedAt
   ├─ service           (FK → Service)
   ├─ payment           (FK → Payment)
   ├─ documents         (∞ → RequestDocument)   ← uploaded files
   └─ statusHistory     (∞ → RequestStatusHistory)

RequestDocument
   ├─ id                (PK)
   ├─ requestId         (FK → ServiceRequest, **not persisted** in current upload flow)
   ├─ uploadedById      (FK → UserDetails)
   ├─ uploadedByRole    (Role enum)
   ├─ name              (sanitized filename)
   ├─ originalName      (original client filename)
   ├─ url               (static path `/uploads/requests/<filename>`)
   ├─ key               (S3‑style key)
   ├─ mimeType          (detected MIME)
   ├─ size              (bytes)
   ├─ description       (optional free‑text)
   └─ createdAt
```

*Key points*

* **User** (via `UserDetails`) is the canonical identity record.  
* **ServiceRequest** is the core “request” entity; it is linked to a `UserDetails` (the manager assigned) and can have many `RequestDocument` children.  
* **RequestDocument** stores metadata about each uploaded file and points back to a `ServiceRequest` via `requestId`.  
* **Role** enum defines permissions: `USER`, `MANAGER`, `ADMIN`, `SUPER_ADMIN`.  

---  
# Upload Flow  

1. **POST /upload/:requestId** – `document.route.ts`  
   * Middleware chain: `upload.any()` (from `@/config/upload`) → `DocumentControllers.uploadDocuments`  
   * No `authCheck` or validation of `:requestId` is attached.  

2. **DocumentControllers.uploadDocuments** (controller)  
   * Receives `req.files`, `req.body.description`, and the **unvalidated** `requestId` param.  
   * Calls `DocumentServices.uploadDocuments`.  

3. **DocumentServices.uploadDocuments** (service)  
   * For each file creates a `requestDocument` record with fields:  
     * `uploadedById`, `uploadedByRole`, `name`, `originalName`, `url`, `key`, `mimeType`, `size`, `description`.  
   * **Crucially, `requestId` is omitted** – the newly created `RequestDocument` is **not linked** to the supplied `requestId`.  
   * Files are saved to `process.cwd()/uploads/requests/<unique‑filename>` by the Multer storage engine.  

4. **Filesystem** – files reside under `./uploads/requests/`.  
5. **Database** – a `requestDocument` row is inserted, but it contains **no reference to the request** (no `requestId`).  

**Result:** The uploaded file is stored, but the link to the target request is never persisted.  

---  
# Download / View Flow  

| Endpoint | Route (file) | Auth middleware | Role check | DB lookup | Filesystem access | Public? |
|----------|--------------|----------------|-----------|-----------|-------------------|---------|
| **GET /request/:requestId** | `src/module/document/document.route.ts` → `DocumentControllers.getRequestDocuments` | `authCheck(Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)` | Only the listed privileged roles can call the endpoint. | `prisma.requestDocument.findMany({ where: { requestId } })` – **no ownership check**. | URLs are served via `express.static('/uploads')`. | Yes – static folder is exposed; any URL `/uploads/<filename>` can be fetched without further auth. |

*Authentication* – JWT must be present and validated by `authCheck`.  
*Authorization* – Role‑based guard allows ADMIN/MANAGER/SUPER_ADMIN, but **does not verify that the caller owns the request**.  
*Ownership* – Not enforced; any privileged role can retrieve documents for any request.  
*Database* – Simple `findMany` on `requestDocument` using the supplied `requestId`.  
*Filesystem* – Static route serves the file directly; no extra permission check.  

---  
# Authorization Model  

| Entity | Intended rule (as inferred from code) | Actual enforcement |
|--------|--------------------------------------|--------------------|
| **Request Owner** (guest / primary user) | Should be able to create a request, upload supporting docs, and later view/download only *its own* documents. | **Not enforced** – upload endpoint has no auth; view endpoint only checks broad roles, not ownership. |
| **Manager** | Assigned to a request, can view and manage it, but not arbitrary other users’ requests. | Role‑check allows access to `GET /requests/:id` but no ownership filter. |
| **Admin / Super‑Admin** | Full visibility across the system (intended for oversight). | Role‑check permits the same endpoint; however, “full visibility” is granted to any admin, not just designated auditors. |
| **Document Upload** | Should be limited to the request owner (or an authorized manager) and must be linked to the correct request. | **No authentication**, **no request‑ownership validation**, and **no `requestId` linkage** in DB. |
| **File Publication** | Uploaded files should be stored outside the public web‑root or served through an authenticated endpoint. | Files are placed in `./uploads` and served statically – **publicly accessible**. |

---  
# Confirmed Problems  

1. **Unauthenticated Document Upload (Critical)**  
   * `POST /upload/:requestId` lacks `authCheck`.  
   * No validation of `requestId` or request ownership.  
   * Uploaded files are persisted without a link to the request (`requestId` never stored).  
   * Files are stored in a publicly reachable directory (`/uploads`).  

2. **Request‑IDOR (High)**  
   * `GET /requests/:id` (`requests.route.ts`) permits any user whose role is ADMIN/MANAGER/SUPER_ADMIN to retrieve **any** request’s data, regardless of who created it.  
   * The service layer (`RequestServices.getSingleRequest`) performs a plain `findUnique` on the supplied `id` with **no ownership filter**.  
   * Consequently, a manager can fetch another user’s request data, violating confidentiality expectations.  

---  
# Unknown Business Rules  

*Exact policy for who may view or download a request’s documents* – The code only checks broad role permissions; it does **not** enforce “owner‑only” visibility, nor does it clarify whether managers are allowed to view requests they are assigned to but not created by them.  
*Whether uploads must be associated with the request* – The current implementation never persists the `requestId`, suggesting that the intended rule (link upload to request) is not realized in code.  
*Whether admin access should be restricted to specific administrative functions* – Role‑checks allow any admin to call the request‑fetch endpoint, but the audit does not clarify if that is intended or a mis‑configuration.  

These points are marked **UNKNOWN** because the existing code does not make the intended rule explicit.  

---  
# Recommended Architecture  

1. **Authentication & Authorization**  
   * Apply `authCheck` (or a more granular `authorizeOwnership` middleware) to **every** upload and request‑fetch endpoint.  
   * For uploads, enforce that the caller’s `UserDetails.id` equals the `request.ownerId` (or a permitted manager role).  
   * For request retrieval, filter the query by `ownerId` unless the caller holds a role explicitly granted full access (e.g., `SUPER_ADMIN`).  

2. **Upload Flow Changes**  
   * Reject the request if `requestId` is missing or does not belong to the caller.  
   * Persist `requestId` on the newly created `RequestDocument` (`data: { requestId, uploadedById, … }`).  
   * Add Zod or custom validation for MIME type, file extension, size, and filename.  
   * Store uploads **outside** the publicly served directory and serve them through a protected endpoint that checks permissions.  

3. **Download / View Flow Changes**  
   * After authenticating, verify that the caller is either the request owner or a role authorized to view all requests.  
   * Use `prisma.requestDocument.findMany` with a `where: { requestId, uploadedById: callerId }` (or similar) to ensure ownership before returning results.  

4. **Static File Serving**  
   * Remove the direct `express.static('/uploads')` mapping.  
   * Serve files via a dedicated route that runs the same ownership/auth checks as other endpoints.  

5. **Database Schema** (no changes needed) – Ensure the foreign‑key relationship `RequestDocument.requestId` is used consistently; add a NOT‑NULL constraint if ownership becomes mandatory.  

---  
*Prepared for the security audit team. No application source files were modified.*