# P0.2: Request IDOR Fix Implementation

## Changes Implemented:
1. **Authorization Checks**:
   - Modified `getSingleRequest` in `requests.controller.ts` to enforce:
     - **User Ownership**: Users can only access requests where `userId === callerId`.
     - **Manager Assignment**: Managers can only access requests where `assignedToId === callerId`.
     - **Admin/SuperAdmin**: Unrestricted access preserved.

2. **Error Handling**:
   - Returns `404` if the request is not found or unauthorized.

## Verification Steps:
1. **[✔] User Access**: Verified that users can only access their own requests.
2. **[✔] Manager Access**: Verified that managers can only access assigned requests.
3. **[✔] Admin Access**: Verified that admins can access all requests.