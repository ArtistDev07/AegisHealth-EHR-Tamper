/**
 * Comprehensive Automated Security & Boundary Test Suite
 * AegisHealth EHR & Tamper-Evident Audit System
 */

import assert from 'node:assert/strict';
import {
  encryptField,
  decryptField,
  reEncryptField,
  generateBlindIndex,
  hashPassword,
  verifyPassword,
  setActiveKeyId,
  getActiveKeyId,
  DEK_SECRETS,
} from '../src/lib/crypto';
import {
  computeAuditEventHash,
  verifyAuditChain,
  GENESIS_HASH,
} from '../src/lib/auditEngine';
import { store } from '../src/services/store';
import { api, ApiError } from '../src/services/api';

async function runTests() {
  console.log('====================================================');
  console.log('AEGISHEALTH EHR SECURITY & INTEGRITY VERIFICATION SUITE');
  console.log('====================================================\n');

  // Reset store to pristine state before starting suite
  await store.resetStore();

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void> | void) {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`[FAIL] ${name}: ${err.message}`);
      if (err.stack) console.error(err.stack);
      failed++;
    }
  }

  // --- 1. COLUMN-LEVEL ENVELOPE ENCRYPTION TESTS ---
  console.log('\n--- 1. Cryptographic Envelope & Authenticated Cipher ---');

  await test('AES-256-GCM encryption produces version, keyId, 96-bit IV, ciphertext, tag, and aadHash', async () => {
    const context = {
      recordId: 'pat-test-01',
      fieldName: 'clinicalNotes',
      organizationId: 'org-aegis-01',
    };
    const plaintext = 'Confidential patient psychiatric and diagnostic evaluation.';
    const container = await encryptField(plaintext, context);

    assert.equal(container.keyId, 'key-dek-v1');
    assert.ok(container.iv, 'IV must exist');
    assert.ok(container.ciphertext, 'Ciphertext must exist');
    assert.ok(container.tag, 'Tag must exist');
    assert.ok(container.aadHash, 'AAD hash must exist');

    // Decode IV to ensure 12 bytes (96 bits)
    const ivBytes = Buffer.from(container.iv, 'base64');
    assert.equal(ivBytes.length, 12, 'IV must be exactly 96 bits (12 bytes)');

    // Decode Tag to ensure 16 bytes (128 bits)
    const tagBytes = Buffer.from(container.tag, 'base64');
    assert.equal(tagBytes.length, 16, 'Tag must be exactly 128 bits (16 bytes)');

    // Decrypt and verify round-trip
    const decrypted = await decryptField(container, context);
    assert.equal(decrypted, plaintext, 'Decrypted text must match original plaintext');
  });

  await test('Cryptographic Nonce Uniqueness: Two encryptions of identical plaintext yield distinct IVs and ciphertexts', async () => {
    const context = { recordId: 'pat-101', fieldName: 'phone', organizationId: 'org-aegis-01' };
    const plaintext = '+1 (555) 382-9011';

    const enc1 = await encryptField(plaintext, context);
    const enc2 = await encryptField(plaintext, context);

    assert.notEqual(enc1.iv, enc2.iv, 'Nonces (IVs) must never repeat');
    assert.notEqual(enc1.ciphertext, enc2.ciphertext, 'Ciphertexts must differ due to random IVs');
  });

  await test('Authenticated Additional Data (AAD) Binding: Rejects swapped record or field context', async () => {
    const contextA = { recordId: 'pat-101', fieldName: 'clinicalNotes', organizationId: 'org-aegis-01' };
    const contextSwappedField = { recordId: 'pat-101', fieldName: 'phone', organizationId: 'org-aegis-01' };
    const contextSwappedPatient = { recordId: 'pat-102', fieldName: 'clinicalNotes', organizationId: 'org-aegis-01' };

    const container = await encryptField('Secret observation for patient 101', contextA);

    // Attempt decryption with wrong field name
    await assert.rejects(
      async () => await decryptField(container, contextSwappedField),
      /Decryption failed for field 'phone'/
    );

    // Attempt decryption with wrong record ID (relocation attack prevention)
    await assert.rejects(
      async () => await decryptField(container, contextSwappedPatient),
      /Decryption failed for field 'clinicalNotes'/
    );
  });

  await test('Tamper Detection: Corrupted ciphertext fails GCM authentication tag verification', async () => {
    const context = { recordId: 'pat-101', fieldName: 'notes', organizationId: 'org-aegis-01' };
    const container = await encryptField('Tamper resistance test note', context);

    // Alter one byte of ciphertext
    const ctBytes = Buffer.from(container.ciphertext, 'base64');
    ctBytes[0] = ctBytes[0] ^ 0xff; // Flip bits
    const tamperedContainer = {
      ...container,
      ciphertext: ctBytes.toString('base64'),
    };

    await assert.rejects(
      async () => await decryptField(tamperedContainer, context),
      /Decryption failed for field 'notes'/
    );
  });

  // --- 2. BLIND INDEX TESTS ---
  console.log('\n--- 2. Deterministic Keyed Blind Indexes (HMAC-SHA-256) ---');

  await test('Blind Index produces deterministic, salted hash without leaking plaintext', async () => {
    const mrn = 'MRN-2026-9042';
    const idx1 = await generateBlindIndex(mrn, 'MRN');
    const idx2 = await generateBlindIndex('mrn-2026-9042 ', 'MRN'); // Case & whitespace insensitive

    assert.equal(idx1, idx2, 'Blind indexes must be deterministic across normalization');
    assert.ok(!idx1.includes('9042'), 'Blind index must not leak MRN substrings');

    const emailIdx = await generateBlindIndex('alex_morgan@example.com', 'EMAIL');
    assert.ok(!emailIdx.includes('alex'), 'Email blind index must not leak name');
  });

  // --- 3. KEY ROTATION TESTS ---
  console.log('\n--- 3. DEK Versioning & Key Rotation ---');

  await test('Key rotation: Encrypt with v1, rotate active key to v2, decrypt v1, re-encrypt to v2', async () => {
    const context = { recordId: 'pat-rot-01', fieldName: 'diagnosis', organizationId: 'org-aegis-01' };
    setActiveKeyId('key-dek-v1');

    const v1Container = await encryptField('Hypertension Stage 2', context);
    assert.equal(v1Container.keyId, 'key-dek-v1');

    // Rotate active key
    setActiveKeyId('key-dek-v2');
    assert.equal(getActiveKeyId(), 'key-dek-v2');

    // Verify v1 record is still decryptable while active key is v2 (backward compatibility)
    const decryptedWithV1 = await decryptField(v1Container, context);
    assert.equal(decryptedWithV1, 'Hypertension Stage 2');

    // Safe re-encryption to v2
    const v2Container = await reEncryptField(v1Container, 'key-dek-v2', context);
    assert.equal(v2Container.keyId, 'key-dek-v2');
    const decryptedWithV2 = await decryptField(v2Container, context);
    assert.equal(decryptedWithV2, 'Hypertension Stage 2');

    // Reset back to v1
    setActiveKeyId('key-dek-v1');
  });

  // --- 4. RBAC ACCESS CONTROL TESTS ---
  console.log('\n--- 4. Role-Based Access Control (RBAC) & Boundary Isolation ---');

  await test('Doctor Access: Can access assigned patient (pat-101), DENIED access to unassigned (pat-104)', async () => {
    store.loginAs('DOCTOR'); // Dr. Sarah Chen assigned to pat-101, NOT pat-104

    // Access assigned
    const pat101 = await api.getPatientById('pat-101');
    assert.equal(pat101.id, 'pat-101');

    // Access unassigned -> throws permission denied
    await assert.rejects(
      async () => await api.getPatientById('pat-104'),
      (err: any) => err instanceof ApiError && err.code === 'PERMISSION_DENIED'
    );
  });

  await test('Patient Isolation: Alex Morgan can view self (pat-101), DENIED access to Priya Sharma (pat-102)', async () => {
    store.loginAs('PATIENT'); // Alex Morgan, bound to pat-101

    const self = await api.getPatientById('pat-101');
    assert.equal(self.id, 'pat-101');

    await assert.rejects(
      async () => await api.getPatientById('pat-102'),
      (err: any) => err instanceof ApiError && err.code === 'PERMISSION_DENIED'
    );
  });

  await test('Insurance Minimum Necessary: Can view patient bound to assigned claim, DENIED unassigned patient', async () => {
    store.loginAs('INSURANCE'); // Elena Rostova, assigned claim on pat-101 (CLM-2026-8801 / 8802)

    // Should be able to view pat-101 (bound to claim CLM-2026-8801)
    const claimPat = await api.getPatientById('pat-101');
    assert.equal(claimPat.id, 'pat-101');

    // Should be DENIED pat-104 (no claim assigned)
    await assert.rejects(
      async () => await api.getPatientById('pat-104'),
      (err: any) => err instanceof ApiError && err.code === 'PERMISSION_DENIED'
    );
  });

  await test('Administrator & Auditor Least Privilege: Strictly DENIED direct clinical patient inspection', async () => {
    store.loginAs('ADMIN');
    await assert.rejects(
      async () => await api.getPatientById('pat-101'),
      (err: any) => err instanceof ApiError && err.code === 'PERMISSION_DENIED'
    );

    store.loginAs('AUDITOR');
    await assert.rejects(
      async () => await api.getPatientById('pat-101'),
      (err: any) => err instanceof ApiError && err.code === 'PERMISSION_DENIED'
    );
  });

  // --- 5. EMERGENCY BREAK-GLASS ACCESS TESTS ---
  console.log('\n--- 5. Emergency Break-Glass Access Workflow ---');

  await test('Break-Glass grants 1-hour access with valid clinical justification and logs audit event', async () => {
    store.loginAs('DOCTOR');
    const initialAuditCount = store.auditEvents.length;

    // Prior check: pat-104 is denied
    assert.equal(store.hasActiveBreakGlass('pat-104'), false);

    // Request break glass with short/empty reason -> fails
    await assert.rejects(
      async () => await store.requestBreakGlassAccess('pat-104', 'Too short'),
      /detailed clinical justification.*is required/i
    );

    // Request with valid justification
    await store.requestBreakGlassAccess(
      'pat-104',
      'Acute trauma resuscitation in emergency bay; immediate record review required.'
    );

    assert.equal(store.hasActiveBreakGlass('pat-104'), true);
    assert.equal(store.canAccessPatient('pat-104').allowed, true);

    // High priority audit event created
    const lastEvent = store.auditEvents[store.auditEvents.length - 1];
    assert.equal(lastEvent.action, 'EMERGENCY_BREAK_GLASS_GRANTED');
    assert.equal(lastEvent.outcome, 'SUCCESS');
    assert.ok(store.auditEvents.length > initialAuditCount);
  });

  // --- 6. TAMPER-EVIDENT AUDIT CHAIN & INTEGRITY VERIFICATION ---
  console.log('\n--- 6. Tamper-Evident SHA-256 Audit Trail & Cryptographic Verification ---');

  await test('Audit trail is unbroken and verifies completely in pristine state', async () => {
    store.loginAs('AUDITOR');
    const verification = await api.verifyAuditIntegrity();
    assert.equal(verification.integrityStatus, 'VALID_VERIFIED');
    assert.equal(verification.discrepanciesCount, 0);
    assert.ok(verification.validChainLinks > 0);
  });

  await test('Tamper detection: Detects corrupted audit block and identifies discrepancy index', async () => {
    store.loginAs('AUDITOR');
    const targetEvent = store.auditEvents[1];

    // Maliciously tamper with event
    store.simulateTamperEvent(targetEvent.id);

    const verification = await api.verifyAuditIntegrity();
    assert.equal(verification.integrityStatus, 'TAMPER_DETECTED');
    assert.ok(verification.discrepanciesCount >= 1);
    const failure = verification.discrepancies.find(d => d.eventId === targetEvent.id);
    assert.ok(failure, 'Must identify the tampered event ID');

    // Clean restore
    await store.resetStore();
    const cleanVerification = await api.verifyAuditIntegrity();
    assert.equal(cleanVerification.integrityStatus, 'VALID_VERIFIED');
  });

  // --- 7. OPTIMISTIC CONCURRENCY & TYPE 2 SCD VERSIONING ---
  console.log('\n--- 7. Optimistic Concurrency & SCD Record Versioning ---');

  await test('Optimistic Concurrency: Rejects demographic update with stale expectedVersion (409 conflict)', async () => {
    store.loginAs('DOCTOR');
    const patient = await api.getPatientById('pat-101');
    const currentVersion = patient.version;

    // Send stale version (currentVersion - 1)
    await assert.rejects(
      async () =>
        await api.updatePatientDemographics('pat-101', currentVersion - 1, {
          phone: '+1 (555) 999-0000',
        }),
      (err: any) => err instanceof ApiError && err.status === 409 && err.code === 'VERSION_CONFLICT'
    );

    // Send valid version
    const updated = await api.updatePatientDemographics('pat-101', currentVersion, {
      phone: '+1 (555) 999-0000',
    });
    assert.equal(updated.version, currentVersion + 1);

    // Verify Type 2 SCD snapshot was logged
    const scdEntry = store.recordVersions.find(
      v => v.entityId === 'pat-101' && v.versionNumber === updated.version
    );
    assert.ok(scdEntry, 'Type 2 SCD entry must be recorded');
    assert.ok(scdEntry.snapshotEncrypted, 'SCD snapshot must contain encrypted data');
  });

  // --- 8. AUTHENTICATION & PASSWORD HASHING ---
  console.log('\n--- 8. Authentication & Password Hashing ---');

  await test('PBKDF2 password hashing with 100,000 iterations verifies correctly', async () => {
    const password = 'CorrectHorseBatteryStaple!2026';
    const { hashHex, saltHex } = await hashPassword(password);
    assert.ok(hashHex.length === 64, 'SHA-256 derived key must be 64 hex characters (256 bits)');

    const isValid = await verifyPassword(password, hashHex, saltHex);
    assert.equal(isValid, true, 'Valid password must verify');

    const isWrongValid = await verifyPassword('WrongPassword123', hashHex, saltHex);
    assert.equal(isWrongValid, false, 'Invalid password must fail verification');
  });

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test suite runner crashed:', err);
  process.exit(1);
});
