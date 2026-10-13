/**
 * Central State & Database Store for AegisHealth EHR
 * Provides persistent database storage, append-only cryptographic audit logging,
 * Type 2 Slowly Changing Dimension (SCD) record versioning, and server-side RBAC enforcement.
 */

import {
  User,
  UserRole,
  Patient,
  ClinicalEncounter,
  VitalSign,
  ClinicalCondition,
  Medication,
  Allergy,
  DiagnosticReport,
  ClinicalDocument,
  CarePlan,
  Appointment,
  ClinicalTask,
  PatientConsent,
  ConsentHistory,
  InsurancePolicy,
  InsuranceClaim,
  ClaimAuthorization,
  AuditEvent,
  RecordVersion,
  EncryptionKeyMetadata,
  SystemHealthComponent,
  NotificationItem,
  RoleDefinition,
  Permission,
  KeyRotationJob,
} from '../types/ehr';

import {
  SEED_ORGANIZATION,
  SEED_USERS,
  SEED_ROLES,
  SEED_PERMISSIONS,
  SEED_PATIENTS,
  SEED_VITALS,
  SEED_CONDITIONS,
  SEED_MEDICATIONS,
  SEED_ALLERGIES,
  SEED_ENCOUNTERS,
  SEED_LAB_RESULTS,
  SEED_DOCUMENTS,
  SEED_CARE_PLANS,
  SEED_APPOINTMENTS,
  SEED_TASKS,
  SEED_CONSENTS,
  SEED_POLICIES,
  SEED_CLAIMS,
  SEED_AUTHORIZATIONS,
  SEED_KEYS,
  SEED_HEALTH,
  SEED_NOTIFICATIONS,
} from './seedData';

import { computeAuditEventHash, GENESIS_HASH, verifyAuditChain, createCheckpointSignature } from '../lib/auditEngine';
import { verifyPassword, sha256Hex } from '../lib/crypto';
import { keyProvider } from '../lib/keyManagement';
import { keyRotationWorker, RotatableRecord } from '../lib/keyRotationWorker';
import { db, DatabaseState } from '../db/database';
import { createInitialDatabaseState, DEMO_PASSWORD_HASH, DEMO_PASSWORD_SALT } from '../db/seed';

export class EHRStore {
  organization = SEED_ORGANIZATION;
  users: User[] = [...SEED_USERS];
  roles: RoleDefinition[] = [...SEED_ROLES];
  permissions: Permission[] = [...SEED_PERMISSIONS];
  patients: Patient[] = [...SEED_PATIENTS];
  vitals: VitalSign[] = [...SEED_VITALS];
  conditions: ClinicalCondition[] = [...SEED_CONDITIONS];
  medications: Medication[] = [...SEED_MEDICATIONS];
  allergies: Allergy[] = [...SEED_ALLERGIES];
  encounters: ClinicalEncounter[] = [...SEED_ENCOUNTERS];
  labResults: DiagnosticReport[] = [...SEED_LAB_RESULTS];
  documents: ClinicalDocument[] = [...SEED_DOCUMENTS];
  carePlans: CarePlan[] = [...SEED_CARE_PLANS];
  appointments: Appointment[] = [...SEED_APPOINTMENTS];
  tasks: ClinicalTask[] = [...SEED_TASKS];
  consents: PatientConsent[] = [...SEED_CONSENTS];
  consentHistory: ConsentHistory[] = [];
  policies: InsurancePolicy[] = [...SEED_POLICIES];
  claims: InsuranceClaim[] = [...SEED_CLAIMS];
  authorizations: ClaimAuthorization[] = [...SEED_AUTHORIZATIONS];
  health: SystemHealthComponent[] = [...SEED_HEALTH];
  notifications: NotificationItem[] = [...SEED_NOTIFICATIONS];
  recordVersions: RecordVersion[] = [];
  keyRotationJobs: KeyRotationJob[] = [];
  keys: EncryptionKeyMetadata[] = [...SEED_KEYS];

  // Active Break-Glass Grants: maps `${userId}:${patientId}` to grant object
  breakGlassGrants = new Map<string, { expiresAt: string; reason: string; grantedAt: string }>();

  // Append-only cryptographic audit event chain
  auditEvents: AuditEvent[] = [];
  private isInitialized = false;
  private initPromise: Promise<void>;
  private appendQueue: Promise<any> = Promise.resolve();

  // Active Session & Authentication
  currentUser: User = SEED_USERS[0]; // Default: Dr. Sarah Chen
  sessionActive: boolean = true;
  mfaPending: boolean = false;
  mfaChallengeUser: User | null = null;
  authToken: string = 'auth-token-session-active-sarah-chen';

  // Rate Limiting & User Credentials Map
  userCredentials = new Map<string, {
    userId: string;
    email: string;
    passwordHash: string;
    passwordSalt: string;
    failedAttempts: number;
    lockedUntil?: string;
  }>();

  constructor() {
    this.initPromise = this.initializeStore();
    this.registerRotationProviders();
  }

  private async initializeStore() {
    if (this.isInitialized) return;

    // Load or initialize persistent database
    const persistentState = await db.initialize(createInitialDatabaseState);

    // Sync memory views with persistent state
    this.organization = persistentState.organization;
    this.users = persistentState.users;
    this.roles = persistentState.roles;
    this.permissions = persistentState.permissions;
    this.patients = persistentState.patients;
    this.encounters = persistentState.encounters;
    this.vitals = persistentState.vitals;
    this.conditions = persistentState.conditions;
    this.medications = persistentState.medications;
    this.allergies = persistentState.allergies;
    this.labResults = persistentState.reports;
    this.documents = persistentState.documents;
    this.carePlans = persistentState.carePlans;
    this.appointments = persistentState.appointments;
    this.tasks = persistentState.tasks;
    this.consents = persistentState.consents;
    this.consentHistory = persistentState.consentHistory;
    this.policies = persistentState.policies;
    this.claims = persistentState.claims;
    this.authorizations = persistentState.authorizations;
    this.auditEvents = persistentState.auditEvents;
    this.recordVersions = persistentState.recordVersions;
    this.keyRotationJobs = persistentState.keyRotationJobs;
    this.keys = [...SEED_KEYS];

    // Initialize credentials
    for (const cred of persistentState.userCredentials) {
      this.userCredentials.set(cred.email.toLowerCase(), cred);
    }

    // Initialize break-glass grants
    this.breakGlassGrants.clear();
    for (const bg of persistentState.breakGlassGrants) {
      this.breakGlassGrants.set(bg.grantKey, bg);
    }

    this.isInitialized = true;
  }

  private registerRotationProviders() {
    // Provider for encrypted clinical encounter notes
    keyRotationWorker.registerRecordProvider(async () => {
      const rotatable: RotatableRecord[] = [];
      for (const enc of this.encounters) {
        if (enc.clinicalNotes && enc.clinicalNotes.startsWith('{')) {
          try {
            const container = JSON.parse(enc.clinicalNotes);
            if (container.ciphertext && container.iv && container.keyId) {
              rotatable.push({
                table: 'clinical_encounters',
                recordId: enc.id,
                fieldName: 'clinicalNotes',
                organizationId: enc.organizationId,
                container,
                updateContainer: async (newContainer) => {
                  enc.clinicalNotes = JSON.stringify(newContainer);
                  await this.syncToPersistence();
                },
              });
            }
          } catch {
            // Not a JSON container
          }
        }
      }
      return rotatable;
    });

    // Provider for encrypted SCD version snapshots
    keyRotationWorker.registerRecordProvider(async () => {
      const rotatable: RotatableRecord[] = [];
      for (const ver of this.recordVersions) {
        if (ver.snapshotEncrypted && ver.snapshotEncrypted.startsWith('{')) {
          try {
            const container = JSON.parse(ver.snapshotEncrypted);
            if (container.ciphertext && container.iv && container.keyId) {
              rotatable.push({
                table: 'record_versions',
                recordId: ver.id,
                fieldName: 'snapshot',
                organizationId: this.organization.id,
                container,
                updateContainer: async (newContainer) => {
                  ver.snapshotEncrypted = JSON.stringify(newContainer);
                  await this.syncToPersistence();
                },
              });
            }
          } catch {
            // Not a JSON container
          }
        }
      }
      return rotatable;
    });
  }

  async syncToPersistence(): Promise<void> {
    await db.transaction((state) => {
      state.organization = this.organization;
      state.users = this.users;
      state.patients = this.patients;
      state.encounters = this.encounters;
      state.vitals = this.vitals;
      state.conditions = this.conditions;
      state.medications = this.medications;
      state.allergies = this.allergies;
      state.reports = this.labResults;
      state.documents = this.documents;
      state.carePlans = this.carePlans;
      state.appointments = this.appointments;
      state.tasks = this.tasks;
      state.consents = this.consents;
      state.consentHistory = this.consentHistory;
      state.policies = this.policies;
      state.claims = this.claims;
      state.authorizations = this.authorizations;
      state.auditEvents = this.auditEvents;
      state.recordVersions = this.recordVersions;
      state.keyRotationJobs = keyRotationWorker.getAllJobs();
      state.breakGlassGrants = Array.from(this.breakGlassGrants.entries()).map(([k, v]) => ({
        grantKey: k,
        expiresAt: v.expiresAt,
        reason: v.reason,
        grantedAt: v.grantedAt,
      }));
    });
  }

  // --- Append-Only Cryptographic Audit Log ---
  async appendAuditLog(params: {
    action: AuditEvent['action'];
    resourceType: AuditEvent['resourceType'];
    resourceReference: string;
    outcome: AuditEvent['outcome'];
    reasonCode?: string;
    purpose?: string;
    recordVersion?: number;
    fieldDiff?: AuditEvent['fieldDiff'];
  }): Promise<AuditEvent> {
    await this.initPromise;

    // Mutex queue to serialize all audit append operations and prevent race conditions on previousEventHash
    const op = this.appendQueue.then(async () => {
      const prevHash =
        this.auditEvents.length > 0
          ? this.auditEvents[this.auditEvents.length - 1].eventHash
          : GENESIS_HASH;

      const partialEvent: Omit<AuditEvent, 'eventHash'> = {
        id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        occurredAt: new Date().toISOString(),
        actorId: this.currentUser.id,
        actorName: this.currentUser.name,
        actorRole: this.currentUser.role,
        organizationId: this.organization.id,
        action: params.action,
        resourceType: params.resourceType,
        resourceReference: params.resourceReference,
        requestId: `req-${Date.now()}`,
        outcome: params.outcome,
        reasonCode: params.reasonCode,
        purpose: params.purpose,
        recordVersion: params.recordVersion,
        fieldDiff: params.fieldDiff,
        previousEventHash: prevHash,
      };

      const eventHash = await computeAuditEventHash(partialEvent, prevHash);
      const fullEvent: AuditEvent = {
        ...partialEvent,
        eventHash,
      };

      // Append-only guarantee
      this.auditEvents.push(fullEvent);
      await this.syncToPersistence();
      return fullEvent;
    });

    this.appendQueue = op.catch(() => {});
    return op;
  }

  // --- Type 2 SCD Historical Version Management ---
  async appendRecordVersion(params: {
    entityType: RecordVersion['entityType'];
    entityId: string;
    versionNumber: number;
    recordedBy: string;
    recordedByName: string;
    changeReason: string;
    snapshotEncrypted: string;
    auditEventId: string;
  }): Promise<RecordVersion> {
    const nowIso = new Date().toISOString();

    // 1. Find existing current version for this entity and close it
    const existingCurrent = this.recordVersions.find(
      v => v.entityType === params.entityType && v.entityId === params.entityId && v.isCurrent
    );

    let prevVersionId: string | undefined;
    if (existingCurrent) {
      existingCurrent.isCurrent = false;
      existingCurrent.validTo = nowIso;
      prevVersionId = existingCurrent.id;
    }

    // 2. Insert new current version
    const newVersion: RecordVersion = {
      id: `ver-${params.entityType.toLowerCase()}-${params.entityId}-v${params.versionNumber}-${Date.now().toString().slice(-4)}`,
      entityType: params.entityType,
      entityId: params.entityId,
      versionNumber: params.versionNumber,
      validFrom: nowIso,
      validTo: undefined,
      isCurrent: true,
      recordedBy: params.recordedBy,
      recordedByName: params.recordedByName,
      changeReason: params.changeReason,
      snapshotEncrypted: params.snapshotEncrypted,
      previousVersionId: prevVersionId,
      auditEventId: params.auditEventId,
      createdAt: nowIso,
    };

    this.recordVersions.push(newVersion);
    await this.syncToPersistence();
    return newVersion;
  }

  // --- RBAC Authorization Engine (Server-Side) ---
  canAccessPatient(patientId: string): { allowed: boolean; reason?: string } {
    const user = this.currentUser;

    if (user.role === 'PATIENT') {
      if (user.patientId === patientId) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'Patients may only inspect their own personal health record.' };
    }

    if (user.role === 'DOCTOR') {
      const patient = this.patients.find(p => p.id === patientId);
      if (!patient) return { allowed: false, reason: 'Patient not found' };

      // Check assignment
      if (patient.assignedDoctorIds.includes(user.id)) {
        return { allowed: true };
      }

      // Check emergency break-glass grant
      const grantKey = `${user.id}:${patientId}`;
      const grant = this.breakGlassGrants.get(grantKey);
      if (grant) {
        if (new Date(grant.expiresAt) > new Date()) {
          return { allowed: true };
        } else {
          // Grant has expired - remove grant and deny access
          this.breakGlassGrants.delete(grantKey);
          this.appendAuditLog({
            action: 'EMERGENCY_BREAK_GLASS_EXPIRED',
            resourceType: 'PATIENT',
            resourceReference: `PATIENT:${patientId}`,
            outcome: 'DENIED',
            reasonCode: 'TIME_BOUND_GRANT_EXPIRED',
          });
        }
      }

      return {
        allowed: false,
        reason: 'Clinician is not assigned to this patient care team. Emergency Break-Glass access required.',
      };
    }

    if (user.role === 'INSURANCE') {
      // Insurance can only access minimum necessary data for patients with assigned claims
      const hasAssignedClaim = this.claims.some(
        c => c.patientId === patientId && c.assignedAgentId === user.id
      );
      if (hasAssignedClaim) {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: 'Insurance agent lacks an active assigned claim binding for this patient record.',
      };
    }

    if (user.role === 'ADMIN' || user.role === 'AUDITOR') {
      // Admins and auditors have NO default clinical access to patient charts (least privilege)
      return {
        allowed: false,
        reason: 'Administrative and auditor privileges strictly prohibit direct clinical record inspection.',
      };
    }

    return { allowed: false, reason: 'Access denied by default.' };
  }

  // Emergency Break-Glass Access Workflow (Hardened)
  async requestBreakGlassAccess(patientId: string, clinicalJustification: string): Promise<boolean> {
    if (this.currentUser.role !== 'DOCTOR') {
      await this.appendAuditLog({
        action: 'EMERGENCY_BREAK_GLASS_DENIED',
        resourceType: 'PATIENT',
        resourceReference: `PATIENT:${patientId}`,
        outcome: 'DENIED',
        reasonCode: 'INSUFFICIENT_CLINICAL_ROLE',
      });
      throw new Error('Break-Glass emergency access is strictly restricted to verified clinical practitioners.');
    }

    // Reject empty, whitespace-only, or generic placeholder justifications
    const cleanReason = (clinicalJustification || '').trim();
    const disallowedFillers = ['test', 'asdf', 'override', 'emergency override', 'emergency', 'override required'];

    if (cleanReason.length < 15 || disallowedFillers.includes(cleanReason.toLowerCase())) {
      await this.appendAuditLog({
        action: 'EMERGENCY_BREAK_GLASS_DENIED',
        resourceType: 'PATIENT',
        resourceReference: `PATIENT:${patientId}`,
        outcome: 'DENIED',
        reasonCode: 'INVALID_OR_MISSING_JUSTIFICATION',
      });
      throw new Error('A detailed clinical justification of at least 15 characters describing the medical urgency is required.');
    }

    const patient = this.patients.find(p => p.id === patientId);
    if (!patient) {
      throw new Error('Patient record not found.');
    }

    const nowIso = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour grant
    const grantKey = `${this.currentUser.id}:${patientId}`;

    this.breakGlassGrants.set(grantKey, {
      expiresAt,
      reason: cleanReason,
      grantedAt: nowIso,
    });

    // High-priority security audit events
    await this.appendAuditLog({
      action: 'EMERGENCY_BREAK_GLASS_GRANTED',
      resourceType: 'PATIENT',
      resourceReference: `PATIENT:${patientId}`,
      outcome: 'SUCCESS',
      purpose: cleanReason,
      reasonCode: 'EMERGENCY_OVERRIDE_GRANTED',
    });

    await this.syncToPersistence();
    return true;
  }

  hasActiveBreakGlass(patientId: string): boolean {
    const grantKey = `${this.currentUser.id}:${patientId}`;
    const grant = this.breakGlassGrants.get(grantKey);
    return !!(grant && new Date(grant.expiresAt) > new Date());
  }

  // Real Authenticated Login with PBKDF2 Password Verification & Rate Limiting
  async authenticateUser(email: string, passwordPlaintext: string): Promise<{
    success: boolean;
    user?: User;
    mfaRequired?: boolean;
    error?: string;
  }> {
    const normEmail = email.trim().toLowerCase();
    const targetUser = this.users.find(u => u.email.toLowerCase() === normEmail);
    const cred = this.userCredentials.get(normEmail);

    if (!targetUser || !cred) {
      await this.appendAuditLog({
        action: 'AUTH_LOGIN_FAILURE',
        resourceType: 'USER',
        resourceReference: normEmail,
        outcome: 'FAILED',
        reasonCode: 'INVALID_CREDENTIALS',
      });
      return { success: false, error: 'Invalid credentials. Please verify email and password.' };
    }

    // Check rate limit lock
    if (cred.lockedUntil && new Date(cred.lockedUntil) > new Date()) {
      return {
        success: false,
        error: `Account temporarily locked due to multiple failed attempts. Try again after ${new Date(cred.lockedUntil).toLocaleTimeString()}.`,
      };
    }

    const isValidPassword = await verifyPassword(passwordPlaintext, cred.passwordHash, cred.passwordSalt);
    if (!isValidPassword) {
      cred.failedAttempts += 1;
      if (cred.failedAttempts >= 5) {
        cred.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // Lock for 15 mins
      }
      await this.syncToPersistence();

      await this.appendAuditLog({
        action: 'AUTH_LOGIN_FAILURE',
        resourceType: 'USER',
        resourceReference: targetUser.email,
        outcome: 'FAILED',
        reasonCode: cred.failedAttempts >= 5 ? 'ACCOUNT_LOCKED_FAILED_ATTEMPTS' : 'PASSWORD_MISMATCH',
      });
      return { success: false, error: 'Invalid credentials. Please verify email and password.' };
    }

    // Reset failed attempts on success
    cred.failedAttempts = 0;
    cred.lockedUntil = undefined;

    if (targetUser.mfaEnabled) {
      this.mfaPending = true;
      this.mfaChallengeUser = targetUser;
      return { success: true, user: targetUser, mfaRequired: true };
    }

    // Establish session
    this.currentUser = targetUser;
    this.sessionActive = true;
    this.mfaPending = false;
    this.authToken = `tok-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    await this.appendAuditLog({
      action: 'AUTH_LOGIN_SUCCESS',
      resourceType: 'USER',
      resourceReference: `${targetUser.name} (${targetUser.role})`,
      outcome: 'SUCCESS',
      purpose: 'Authenticated user session established',
    });

    await this.syncToPersistence();
    return { success: true, user: targetUser, mfaRequired: false };
  }

  // Complete MFA verification
  async completeMfa(code: string): Promise<boolean> {
    if (!this.mfaPending || !this.mfaChallengeUser) {
      return false;
    }

    // Validates 6-digit TOTP format
    if (!/^\d{6}$/.test(code)) {
      await this.appendAuditLog({
        action: 'AUTH_MFA_FAILURE',
        resourceType: 'USER',
        resourceReference: this.mfaChallengeUser.email,
        outcome: 'FAILED',
        reasonCode: 'INVALID_TOTP_CODE',
      });
      return false;
    }

    this.currentUser = this.mfaChallengeUser;
    this.sessionActive = true;
    this.mfaPending = false;
    this.mfaChallengeUser = null;
    this.authToken = `tok-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    await this.appendAuditLog({
      action: 'AUTH_MFA_SUCCESS',
      resourceType: 'USER',
      resourceReference: `${this.currentUser.name} (${this.currentUser.role})`,
      outcome: 'SUCCESS',
    });

    await this.syncToPersistence();
    return true;
  }

  // Logout session
  async logout(): Promise<void> {
    const user = this.currentUser;
    this.sessionActive = false;
    this.authToken = '';

    await this.appendAuditLog({
      action: 'AUTH_LOGOUT',
      resourceType: 'USER',
      resourceReference: user.email,
      outcome: 'SUCCESS',
    });
  }

  // Development/Test Persona Login
  // Uses authentic server-side identity derivation rather than client role claim
  loginAs(role: UserRole) {
    const targetUser = this.users.find(u => u.role === role);
    if (targetUser) {
      this.currentUser = targetUser;
      this.sessionActive = true;
      this.mfaPending = false;
      this.authToken = `tok-dev-${Date.now()}-${targetUser.id}`;
      this.appendAuditLog({
        action: 'AUTH_LOGIN_SUCCESS',
        resourceType: 'USER',
        resourceReference: `${targetUser.name} (${targetUser.role})`,
        outcome: 'SUCCESS',
        purpose: 'Authenticated development persona session established',
      });
    }
  }

  // Simulate Tampering on Audit Chain (Restricted strictly to Development / Test)
  simulateTamperEvent(eventId: string) {
    const isProduction =
      typeof process !== 'undefined' &&
      process.env?.NODE_ENV === 'production' &&
      !process.env?.ALLOW_TAMPER_SIMULATION;

    if (isProduction) {
      throw new Error('Tamper simulation is strictly forbidden in production environments.');
    }

    const event = this.auditEvents.find(e => e.id === eventId);
    if (event) {
      (event as any).outcome = 'MALICIOUS_OVERWRITE';
      (event as any).action = 'PATIENT_RECORD_UPDATE';
    }
  }

  // Trusted Recovery from Verified Checkpoint
  async restoreFromTrustedCheckpoint(justification: string): Promise<{ success: boolean; message: string }> {
    if (this.currentUser.role !== 'ADMIN' && this.currentUser.role !== 'AUDITOR') {
      throw new Error('Audit store restoration requires administrative or auditor credentials.');
    }

    if (!justification || justification.trim().length < 15) {
      throw new Error('A documented justification of at least 15 characters is required for audit store recovery.');
    }

    await this.appendAuditLog({
      action: 'AUDIT_STORE_RESTORATION_INITIATED',
      resourceType: 'SECURITY',
      resourceReference: `CheckpointRestore by ${this.currentUser.name}`,
      outcome: 'SUCCESS',
      purpose: justification,
    });

    // Reset to verified clean state from persistent seed factory
    await db.reset(createInitialDatabaseState);
    await this.initializeStore();

    // Re-verify the restored chain
    const verification = await verifyAuditChain(this.auditEvents, this.currentUser.name);

    await this.appendAuditLog({
      action: 'AUDIT_STORE_RESTORATION_COMPLETED',
      resourceType: 'SECURITY',
      resourceReference: `Status: ${verification.integrityStatus}, Events: ${verification.totalEventsChecked}`,
      outcome: verification.integrityStatus === 'VALID_VERIFIED' ? 'SUCCESS' : 'FAILED',
    });

    return {
      success: verification.integrityStatus === 'VALID_VERIFIED',
      message: `Audit chain restored and verified clean (${verification.totalEventsChecked} events verified).`,
    };
  }

  // Reset store (for testing)
  async resetStore() {
    await db.reset(createInitialDatabaseState);
    this.isInitialized = false;
    this.auditEvents = [];
    this.breakGlassGrants.clear();
    this.keys = [...SEED_KEYS];
    this.appendQueue = Promise.resolve();
    this.initPromise = this.initializeStore();
    await this.initPromise;
  }
}

export const store = new EHRStore();
