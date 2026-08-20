### Finding 1: Upload Security

**Verdict:** Confirmed Critical  

**Evidence:**  
- `src/module/document/document.route.ts` defines the upload endpoint as `router.post("/upload/:requestId", upload.any(), DocumentControllers.uploadDocuments);` – **no `authCheck` middleware** is attached to this route.  
- The only middleware employed is `upload.any()` from `@/config/upload`.  
- The route **does not validate the `requestId` param** (no Zod schema, no manual check).  
- Ownership of the `requestId` is never verified in the controller or service.  
- Uploaded files are stored in `uploads/` and served statically (`src/app.ts` line 48: `expressApp.use("/uploads", express.static(path.join(process.cwd(), "uploads")));`) – making them publicly accessible.  
- `DocumentServices.uploadDocuments` creates `requestDocument` records that **do not link the uploaded file to the supplied `requestId`**, so the request‑to‑file linkage is effectively ignored.  
- No validation of MIME type, file extension, size, or filename is performed before storage.

**Route:** `POST /upload/:requestId` – `src/module/document/document.route.ts`  

**Middleware chain:**  
1. `upload.any()` (from `@/config/upload`) – accepts any file without authentication or validation.  
2. `DocumentControllers.uploadDocuments` – receives `req.files`, `req.body`, and the (unvalidated) `requestId` param.

**Risk:** Critical – an unauthenticated attacker can upload files to any `requestId`, files are stored in a publicly reachable directory, and there is no linkage or ownership enforcement. This leads to arbitrary file upload, potential remote code execution, and data leakage.

**Required fix:**  
1. Attach a proper authentication middleware (`authCheck`) to the upload route and enforce a role that is allowed to upload (e.g., `Role.MANAGER`, `Role.ADMIN`).  
2. Validate the `requestId` parameter with a strict Zod schema and ensure the authenticated user **owns** that request (query the request and verify `request.ownerId === req.user.id`).  
3. Add explicit file‑validation logic (MIME type, allowed extensions, size limits) before processing.  
4. Store uploaded files outside the web‑root or serve them behind an authenticated endpoint.  
5. Persist the `requestId` association when creating `requestDocument` records.  

---

### Finding 2: Request IDOR

**Verdict:** Confirmed High  

**Evidence:**  
- `src/module/requests/requests.route.ts` defines `router.get("/:id", authCheck(Role.ADMIN, Role.SUPER_ADMIN, Role.MANAGER), RequestControllers.getSingleRequest);`. Authentication is required, but **the role list permits any user with ADMIN/MANAGER/SUPER_ADMIN** to call the endpoint.  
- `RequestControllers.getSingleRequest` calls `RequestServices.getSingleRequest(req.params.id)` (line 67‑69 in `requests.controller.ts`).  
- `RequestServices.getSingleRequest` performs a Prisma query `prisma.serviceRequest.findUnique({ where: { id }, include: … })` **without any ownership check** – it simply returns the first record matching the supplied `id`.  
- Ownership of a request (`request.ownerId` or similar) is never compared to the authenticated user’s id, so any user who passes the role guard can retrieve **any** request stored in the system.  
- The static admin guard does not differentiate between “view‑own‑requests” and “view‑all‑requests”; it merely allows the listed privileged roles.

**Route:** `GET /requests/:id` – `src/module/requests/requests.route.ts` (line 23‑26)  

**Authorization logic:**  
- **Authentication:** JWT must be present and validated by `authCheck`.  
- **Role check:** The user’s role must be **ADMIN**, **MANAGER**, or **SUPER_ADMIN** (as passed to `authCheck`).  
- **Ownership check:** **None** – the service layer retrieves the request by id alone, ignoring who requested it.

**Risk:** High – the endpoint suffers from an **Insecure Direct Object Reference (IDOR)**, allowing any user with the listed privileged roles to retrieve another user’s request data. If role assignment is mis‑managed, lower‑privilege users could gain access, leading to data exposure. The issue is *not* a vulnerability when admin access is intentionally granted, but the missing ownership validation is a design flaw that can be abused.

**Required fix:**  
1. Modify `RequestServices.getSingleRequest` (or a dedicated authorization utility) to verify that the requesting user is authorized to view the requested record (e.g., `where: { id, ...ownerFilter }` where `ownerFilter` checks `ownerId === req.user.id` or similar).  
2. Document the intended access policy (e.g., “only the request owner or an admin may view”) and enforce it via a dedicated ownership‑check function.  
3. If the intention is to restrict the endpoint to request owners only, adjust the role list in `authCheck` accordingly or add a separate `authorizeOwnership` middleware.

---

### Other Observations (directly related)

- **Publicly accessible upload directory** (`/uploads`) exposed via `express.static` compounds the upload risk; consider serving uploads through a protected endpoint or moving them outside the document root.  
- **Missing Zod validation** on the `requestId` parameter in the upload route leaves the endpoint open to parameter tampering.  
- **No size/MIME/extension restrictions** on uploaded files; adding a validation schema would mitigate arbitrary file upload concerns.

These points are tightly coupled to the two findings and should be addressed as part of the required fixes above.