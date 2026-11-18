# Security Specification — LabTrace Firestore Rules

## 1. Data Invariants
1. **Identity Integrity**: Every `SampleBottle`, `SamplePhoto`, and `CustomParameter` must carry `ownerId == request.auth.uid` on creation, and `ownerId` and `createdAt` are strictly immutable on update.
2. **Verified Users Only**: All reads and writes require `request.auth != null && request.auth.token.email_verified == true`.
3. **No Self-Assigned Roles**: On `/users/{userId}` creation, `role` is locked to `'staff'` and `uid` must equal `userId == request.auth.uid`.
4. **Master Gate on Photos**: Any write or single-document read on `/samples/{sampleId}/photos/{photoId}` must verify that the parent `/samples/{sampleId}` exists and belongs to `request.auth.uid` (or `isAdmin()`), and `sampleId` matches the parent path variable.
5. **Terminal State Locking**: Once a `SampleBottle` reaches `stage == 'Sertifikat Terbit'`, non-admin updates are blocked so issued Certificates of Analysis (CoA) cannot be tampered with retroactively.
6. **Temporal Integrity & Size Bounds**: `createdAt` and `updatedAt` must equal `request.time`. Every string field has strict `.size()` bounds, and photo `dataUrl` is capped at `280000` bytes.

## 2. The "Dirty Dozen" Adversarial Payloads
1. Unauthenticated read/write to `/samples/smp-1` -> `PERMISSION_DENIED`.
2. Unverified email user (`email_verified: false`) attempting `create` on `/samples/smp-1` -> `PERMISSION_DENIED`.
3. Identity spoofing: User A creating `/samples/smp-1` with `ownerId: "user-B"` -> `PERMISSION_DENIED`.
4. Privilege escalation: User A creating `/users/userA` with `role: "admin"` -> `PERMISSION_DENIED`.
5. Shadow field injection: Creating `/samples/smp-1` with extra ghost field `isVerified: true` -> `PERMISSION_DENIED`.
6. Timestamp tampering: Creating `/samples/smp-1` with client-provided `createdAt` != `request.time` -> `PERMISSION_DENIED`.
7. ID poisoning: Creating `/samples/invalid$id!` with invalid regex characters -> `PERMISSION_DENIED`.
8. Orphaned photo write: Creating `/samples/nonexistent/photos/ph-1` -> `PERMISSION_DENIED`.
9. Cross-tenant photo read/write: User B reading `/samples/sampleOwnedByA/photos/ph-1` -> `PERMISSION_DENIED`.
10. Terminal state bypass: Non-admin updating parameters on a `SampleBottle` where `existing().stage == 'Sertifikat Terbit'` -> `PERMISSION_DENIED`.
11. Resource exhaustion: Uploading a `SamplePhoto` with `dataUrl.size() > 280000` -> `PERMISSION_DENIED`.
12. Query scraping: Executing `list` query on `/samples` without `where('ownerId', '==', uid)` -> `PERMISSION_DENIED`.
