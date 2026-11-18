/**
 * Adversarial Security Test Suite Specification for LabTrace Firestore Rules.
 * Verifies the "Dirty Dozen" invariants against firestore.rules.
 */

export interface SecurityTestCase {
  name: string;
  collectionPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  expectedOutcome: 'PERMISSION_DENIED' | 'ALLOW';
}

export const DIRTY_DOZEN_TESTS: SecurityTestCase[] = [
  {
    name: '01. Unauthenticated read on /samples/smp-101',
    collectionPath: '/samples/smp-101',
    operation: 'get',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    name: '02. Unverified email user create on /samples/smp-101',
    collectionPath: '/samples/smp-101',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    name: '03. Identity spoofing ownerId != auth.uid on create',
    collectionPath: '/samples/smp-101',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    name: '04. Privilege escalation role=admin on /users/{uid}',
    collectionPath: '/users/user-a',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    name: '05. Shadow ghost field isVerified=true on /samples/{id}',
    collectionPath: '/samples/smp-101',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    name: '06. Client timestamp spoofing createdAt != request.time',
    collectionPath: '/samples/smp-101',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    name: '07. ID poisoning with invalid characters',
    collectionPath: '/samples/invalid$id!',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    name: '08. Orphaned photo upload without parent sample',
    collectionPath: '/samples/missing-parent/photos/ph-1',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    name: '09. Cross-tenant photo read on another user sample',
    collectionPath: '/samples/sample-user-a/photos/ph-1',
    operation: 'get',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    name: '10. Terminal state bypass after Sertifikat Terbit',
    collectionPath: '/samples/smp-issued',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    name: '11. Oversized photo payload > 280000 bytes',
    collectionPath: '/samples/smp-101/photos/ph-large',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    name: '12. Unfiltered list query scraping /samples',
    collectionPath: '/samples',
    operation: 'list',
    expectedOutcome: 'PERMISSION_DENIED',
  },
];
