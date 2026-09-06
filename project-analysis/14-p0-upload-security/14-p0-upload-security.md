# P0.1 Document Upload Security Implementation

## Task

Secure the document upload flow (`POST /upload/:requestId`) by implementing authentication, request ID validation, request ownership/assignment authorization, file type and size validation, safe server-side filenames, and private file storage.

## Files Changed

- `src/app.ts`
  - Removed the public `/uploads` static file mount.
- `src/config/upload.ts`
  - Changed upload storage to `private_uploads/requests`.
  - Added MIME type and extension allowlists.
  - Preserved the 20 MiB file size limit.
  - Added server-generated filenames.
- `src/module/document/document.controller.ts`
  - Extracts `requestId` from route params.
  - Passes authenticated user ID and role to the document service.
  - Removed the old `attachDocumentsToRequest` flow.
- `src/module/document/document.route.ts`
  - Added authentication middleware to `POST /upload/:requestId`.
- `src/module/document/document.service.ts`
  - Validates `requestId` as a UUID.
  - Requires authenticated user information.
  - Resolves the authenticated user's `UserDetails` record.
  - Verifies that the `ServiceRequest` exists.
  - Authorizes the request owner, assigned manager, or ADMIN/SUPER_ADMIN.
  - Persists `requestId` directly on each `RequestDocument`.
  - Uses private storage paths.
  - Updated document deletion to use the private storage directory.
- `src/module/document/document.validation.ts`
  - Added UUID validation for upload request IDs.
  - Added optional upload description validation.

## Security Problems Fixed

1. **Unauthenticated document upload**
   - `authCheck(Role.USER, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)` is now applied to the upload route.

2. **Invalid request IDs**
   - `requestId` is validated using `z.uuid()`.

3. **Request IDOR**
   - The service verifies that the target `ServiceRequest` exists.
   - Access is allowed only when the authenticated user is:
     - the request owner,
     - the assigned manager,
     - ADMIN, or
     - SUPER_ADMIN.

4. **User ID layer mismatch**
   - The authenticated `User.id` is resolved to the corresponding `UserDetails.id` before comparing against `ServiceRequest.userId` and `ServiceRequest.assignedToId`.

5. **Request document linking**
   - `requestId` is persisted directly when creating each `RequestDocument`.

6. **Insufficient file validation**
   - MIME type and file extension allowlists are enforced.
   - The existing 20 MiB file size limit is preserved.

7. **Unsafe filenames**
   - Uploaded files use server-generated filenames rather than client-controlled filenames.

8. **Public file exposure**
   - The public `/uploads` static mount was removed.
   - New uploads are stored under `private_uploads/requests`.

## Authentication and Authorization

The upload route requires an authenticated user with one of the following roles:

- USER
- MANAGER
- ADMIN
- SUPER_ADMIN

The service then performs resource-level authorization.

An upload is permitted when:

- the authenticated user owns the request, or
- the authenticated user is assigned to the request, or
- the authenticated user has ADMIN or SUPER_ADMIN privileges.

## Request Validation

The upload service validates `requestId` using the UUID schema.

The service then verifies the target `ServiceRequest` exists before creating any `RequestDocument` records.

## Document Linking

New `RequestDocument` records receive the validated request ID directly:

- `requestId` is set to the target `ServiceRequest.id`.
- `uploadedById` is set to the authenticated user's `UserDetails.id`.
- `uploadedByRole` is set from the authenticated user's role.

The old `attachDocumentsToRequest` flow is no longer used by the upload controller.

`RequestDocument.requestId` remains nullable in the Prisma schema. No migration was performed in P0.1.

## File Validation

Allowed MIME types:

- `image/jpeg`
- `image/png`
- `image/gif`
- `image/webp`
- `application/pdf`
- `application/msword`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

Allowed extensions:

- `.jpeg`
- `.png`
- `.gif`
- `.webp`
- `.pdf`
- `.doc`
- `.docx`

File size limit:

- 20 MiB

Filenames are generated server-side using the selected extension.

## Private File Storage

Uploads are stored under:

`private_uploads/requests`

The public Express static mount for `/uploads` was removed.

A protected document download/serving endpoint is not part of P0.1 and should be handled separately.

## Database Changes

- No Prisma schema migration performed.
- `RequestDocument.requestId` remains nullable.
- Making `requestId` required is deferred until existing orphan records are handled.

## Scope Exclusions

The following were intentionally not implemented as part of P0.1:

- Guest sessions or guest token exchange
- JTI implementation
- Refresh token rotation redesign
- Route-specific rate limiting
- Manager authorization redesign beyond upload resource authorization
- Dashboard/frontend changes

## Verification

### Static checks

- Biome check: **PASS**
- Build (`bun run build`): **PASS**
- `git diff --check`: **PASS**

Verified commands:

```text
bunx biome check src/config/upload.ts src/module/document/document.controller.ts src/module/document/document.route.ts src/module/document/document.service.ts src/module/document/document.validation.ts src/app.ts

Checked 6 files in 13ms. No fixes applied.

## IMPLEMENTED AND STATICALLY VERIFIED