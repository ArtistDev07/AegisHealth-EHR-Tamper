/**
 * Comprehensive TypeScript types for AegisHealth EHR & Audit System
 */

export type UserRole = 'DOCTOR' | 'PATIENT' | 'INSURANCE' | 'ADMIN' | 'AUDITOR';

export interface User {
  id: string;
  organizationId: string;
  email: string;
  name: string;
  role: UserRole;
  title?: string;
  department?: string;
  mfaEnabled: boolean;
  accountStatus: 'ACTIVE' | 'SUSPENDED' | 'INVITED';
  lastSignInAt?: string;
  createdAt: string;
  patientId?: string; // Linked patient profile if role === 'PATIENT'
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  status: 'ACTIVE' | 'MAINTENANCE';
  contactEmail: string;
  retentionYears: number;
}

export interface Permission {
  id: string;
  permissionKey: string;
  description: string;
  resourceType: string;
  action: 'READ' | 'CREATE' | 'UPDATE' | 'DELETE' | 'EXPORT' | 'VERIFY';
  sensitivity: 'PUBLIC' | 'CONFIDENTIAL' | 'RESTRICTED_PHI' | 'PRIVILEGED_SECURITY';
}

export interface RoleDefinition {
  id: string;
  role: UserRole;
  name: string;
  description: string;
  isSystemRole: boolean;
  permissions: string[];
}

export interface CareAssignment {
  id: string;
  patientId: string;
  clinicianId: string;
  clinicianName: string;
  assignmentType: 'PRIMARY_CARE' | 'ATTENDING' | 'CONSULTING';
  validFrom: string;
  validTo?: string;
  status: 'ACTIVE' | 'DISCHARGED';
}

export interface PatientDemographics {
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  gender: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
  bloodType: string;
}

export interface Patient {
  id: string;
  organizationId: string;
  medicalRecordNumber: string; // e.g., MRN-2026-9042
  mrnLookupHash: string; // Blind index hash for secure search
  demographics: PatientDemographics;
  recordStatus: 'ACTIVE' | 'RESTRICTED' | 'ARCHIVED';
  assignedDoctorIds: string[];
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface VitalSign {
  id: string;
  patientId: string;
  encounterId?: string;
  type: 'BLOOD_PRESSURE' | 'HEART_RATE' | 'TEMPERATURE' | 'RESPIRATORY_RATE' | 'OXYGEN_SATURATION' | 'BODY_WEIGHT' | 'BODY_HEIGHT';
  value: string; // e.g. "120/80", "72", "98.6"
  unit: string; // "mmHg", "bpm", "°F", "breaths/min", "%", "kg", "cm"
  referenceRange?: string; // "90-120 / 60-80"
  status: 'NORMAL' | 'ELEVATED' | 'CRITICAL';
  recordedAt: string;
  recordedBy: string;
  recordedByName: string;
}

export interface ClinicalCondition {
  id: string;
  patientId: string;
  encounterId?: string;
  codeSystem: 'ICD-10' | 'SNOMED-CT';
  code: string;
  displayName: string;
  clinicalStatus: 'ACTIVE' | 'RESOLVED' | 'REMISSION';
  onsetDate: string;
  recordedBy: string;
  recordedByName: string;
  notes?: string;
  version: number;
  updatedAt: string;
}

export interface Medication {
  id: string;
  patientId: string;
  encounterId?: string;
  name: string;
  strength: string;
  dosageInstructions: string;
  route: 'ORAL' | 'INTRAVENOUS' | 'TOPICAL' | 'SUBCUTANEOUS' | 'INHALATION';
  startDate: string;
  endDate?: string;
  status: 'ACTIVE' | 'DISCONTINUED' | 'COMPLETED';
  prescribedBy: string;
  prescribedByName: string;
  version: number;
  updatedAt: string;
}

export interface Allergy {
  id: string;
  patientId: string;
  substance: string;
  reaction: string;
  severity: 'MILD' | 'MODERATE' | 'SEVERE_ANAPHYLAXIS';
  status: 'ACTIVE' | 'INACTIVE';
  verificationStatus: 'CONFIRMED' | 'SUSPECTED';
  recordedBy: string;
  recordedByName: string;
  recordedAt: string;
  version: number;
}

export interface ClinicalEncounter {
  id: string;
  organizationId: string;
  patientId: string;
  clinicianId: string;
  clinicianName: string;
  encounterType: 'OUTPATIENT_CONSULT' | 'EMERGENCY_EVALUATION' | 'ROUTINE_FOLLOWUP' | 'TELEHEALTH_SESSION' | 'SURGICAL_PREOP';
  encounterStatus: 'DRAFT' | 'FINALIZED' | 'AMENDED';
  encounterDate: string;
  reasonForVisit: string;
  clinicalNotes: string; // Encrypted field in storage
  assessment: string;
  plan: string;
  diagnoses: string[];
  finalizedAt?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface DiagnosticReport {
  id: string;
  patientId: string;
  encounterId?: string;
  reportType: 'LABORATORY' | 'RADIOLOGY' | 'PATHOLOGY';
  testName: string;
  specimenDate?: string;
  reportedDate: string;
  status: 'PRELIMINARY' | 'FINAL' | 'AMENDED';
  resultSummary: string;
  interpretation: 'NORMAL' | 'ABNORMAL' | 'CRITICAL';
  values: {
    test: string;
    result: string;
    unit: string;
    range: string;
    flag?: 'H' | 'L' | 'CRIT';
  }[];
  performingFacility: string;
  documentAttachmentKey?: string;
}

export interface ClinicalDocument {
  id: string;
  organizationId: string;
  patientId: string;
  encounterId?: string;
  relatedClaimId?: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  contentHash: string; // SHA-256 of payload
  documentType: 'DISCHARGE_SUMMARY' | 'OPERATIVE_REPORT' | 'LAB_PANEL' | 'INSURANCE_EVIDENCE' | 'CONSENT_FORM';
  classification: 'RESTRICTED_CLINICAL' | 'CLAIMS_ATTACHMENT' | 'PATIENT_FACING';
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: string;
  downloadToken?: string;
  previewContent?: string;
}

export interface CarePlan {
  id: string;
  patientId: string;
  authorId: string;
  authorName: string;
  title: string;
  status: 'ACTIVE' | 'COMPLETED' | 'SUSPENDED';
  goals: string[];
  actionItems: {
    description: string;
    targetDate: string;
    completed: boolean;
  }[];
  effectiveFrom: string;
  effectiveTo?: string;
  version: number;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  organizationId: string;
  patientId: string;
  patientName: string;
  clinicianId: string;
  clinicianName: string;
  appointmentType: 'ROUTINE_CHECKUP' | 'SPECIALIST_CONSULT' | 'LAB_FOLLOWUP' | 'ANNUAL_EXAM';
  scheduledAt: string;
  durationMinutes: number;
  status: 'SCHEDULED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  modality: 'IN_PERSON' | 'TELEHEALTH';
  location: string;
  instructions?: string;
  cancellationReason?: string;
  version: number;
  createdAt: string;
}

export interface ClinicalTask {
  id: string;
  patientId: string;
  patientName: string;
  title: string;
  dueDate: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  assignedToDoctorId: string;
  category: 'LAB_REVIEW' | 'PRESCRIPTION_REFILL' | 'REFERRAL_SIGN_OFF' | 'PATIENT_MESSAGE';
}

export interface PatientConsent {
  id: string;
  patientId: string;
  purpose: 'DIRECT_CARE' | 'INSURANCE_CLAIMS_PROCESSING' | 'RESEARCH_ANONYMIZED' | 'EXTERNAL_REFERRAL';
  dataScope: 'ALL_CLINICAL_RECORDS' | 'MINIMUM_NECESSARY_CLAIMS' | 'LAB_ONLY' | 'MEDICATIONS_ONLY';
  recipientOrganization: string;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  effectiveFrom: string;
  effectiveTo?: string;
  recordedSource: 'PORTAL_ELECTRONIC_SIGNATURE' | 'CLINIC_PAPER_SCANNED';
  version: number;
  updatedAt: string;
}

export interface ConsentHistory {
  id: string;
  consentId: string;
  versionNumber: number;
  previousStatus: string;
  newStatus: string;
  changeReason: string;
  changedBy: string;
  changedAt: string;
  auditEventId: string;
}

export interface InsurancePolicy {
  id: string;
  organizationId: string;
  patientId: string;
  policyNumber: string; // e.g. POL-88204-BC
  groupNumber: string;
  payerName: string;
  coverageType: 'COMPREHENSIVE_HEALTH' | 'HIGH_DEDUCTIBLE' | 'MEDICARE_ADVANTAGE';
  copayAmount: number;
  deductible: number;
  effectiveFrom: string;
  effectiveTo: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface InsuranceClaim {
  id: string;
  organizationId: string;
  patientId: string;
  patientName: string;
  policyId: string;
  policyNumber: string;
  claimReference: string; // e.g. CLM-2026-8801
  claimType: 'HOSPITALIZATION' | 'SURGICAL_PROCEDURE' | 'SPECIALIST_EVALUATION' | 'DIAGNOSTIC_IMAGING';
  requestedAmount: number;
  currency: string;
  submittedAt: string;
  status: 'PENDING_REVIEW' | 'ADDITIONAL_INFO_REQUESTED' | 'APPROVED' | 'REJECTED';
  assignedAgentId: string;
  minimumNecessaryEvidence: {
    serviceRendered: string;
    serviceDate: string;
    billedDiagnosisCodes: string[];
    adjudicationSummary: string;
    supportingDocumentIds: string[];
  };
  reviewReason?: string;
  decisionDate?: string;
  version: number;
  updatedAt: string;
}

export interface ClaimAuthorization {
  id: string;
  claimId?: string;
  patientId: string;
  patientName: string;
  policyNumber: string;
  requestType: 'PRIOR_AUTHORIZATION_SURGERY' | 'MRI_SPECIALIZED_SCAN' | 'BIOLOGIC_THERAPY';
  requestedService: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'DENIED' | 'REQUIRES_CLINICAL_PEER_REVIEW';
  submittedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  decisionReason?: string;
  version: number;
}

/**
 * Type 2 Slowly Changing Dimension (SCD) Record Version
 */
export interface RecordVersion {
  id: string;
  entityType: 'PATIENT' | 'ENCOUNTER' | 'MEDICATION' | 'CONDITION' | 'CARE_PLAN' | 'CONSENT' | 'CLAIM';
  entityId: string;
  versionNumber: number;
  validFrom: string;
  validTo?: string;
  isCurrent: boolean;
  recordedBy: string;
  recordedByName: string;
  changeReason: string;
  snapshotEncrypted: string; // AES-256-GCM ciphertext representation of state
  previousVersionId?: string;
  auditEventId: string;
  createdAt: string;
}

/**
 * Tamper-Evident Audit Event
 */
export interface AuditEvent {
  id: string;
  occurredAt: string; // ISO UTC
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  organizationId: string;
  action:
    | 'AUTH_LOGIN_SUCCESS'
    | 'AUTH_LOGIN_FAILURE'
    | 'AUTH_MFA_SUCCESS'
    | 'AUTH_MFA_FAILURE'
    | 'AUTH_LOGOUT'
    | 'AUTH_SESSION_EXPIRED'
    | 'PATIENT_RECORD_VIEW'
    | 'PATIENT_RECORD_CREATE'
    | 'PATIENT_RECORD_UPDATE'
    | 'CLINICAL_ENCOUNTER_VIEW'
    | 'CLINICAL_ENCOUNTER_CREATE'
    | 'CLINICAL_ENCOUNTER_UPDATE'
    | 'CLINICAL_ENCOUNTER_FINALIZE'
    | 'CLINICAL_OBSERVATION_CREATE'
    | 'CLINICAL_DOCUMENT_VIEW'
    | 'CLINICAL_DOCUMENT_UPLOAD'
    | 'CLINICAL_DOCUMENT_DOWNLOAD'
    | 'CONSENT_VIEW'
    | 'CONSENT_UPDATE'
    | 'CLAIM_VIEW'
    | 'CLAIM_ADJUDICATION_DECISION'
    | 'CLAIM_REQUEST_INFO'
    | 'AUTHORIZATION_DECISION'
    | 'EMERGENCY_BREAK_GLASS_ACCESS'
    | 'AUTHORIZATION_DENIAL'
    | 'ROLE_PERMISSION_CHANGE'
    | 'USER_INVITATION'
    | 'USER_STATUS_CHANGE'
    | 'KEY_ROTATION_TRIGGERED'
    | 'KEY_ROTATION_BATCH_PROCESSED'
    | 'KEY_ROTATION_JOB_COMPLETED'
    | 'KEY_ROTATION_JOB_FAILED'
    | 'EMERGENCY_BREAK_GLASS_REQUESTED'
    | 'EMERGENCY_BREAK_GLASS_GRANTED'
    | 'EMERGENCY_BREAK_GLASS_DENIED'
    | 'EMERGENCY_BREAK_GLASS_EXPIRED'
    | 'AUDIT_INTEGRITY_VERIFIED'
    | 'AUDIT_STORE_RESTORATION_INITIATED'
    | 'AUDIT_STORE_RESTORATION_COMPLETED'
    | 'SENSITIVE_DATA_EXPORT';
  resourceType: 'PATIENT' | 'ENCOUNTER' | 'DOCUMENT' | 'CLAIM' | 'CONSENT' | 'USER' | 'KEY' | 'SECURITY';
  resourceReference: string; // Masked or explicit ID
  requestId: string;
  outcome: 'SUCCESS' | 'DENIED' | 'FAILED' | 'CHALLENGE_REQUIRED';
  reasonCode?: string;
  purpose?: string;
  recordVersion?: number;
  fieldDiff?: {
    field: string;
    oldValueMasked?: string;
    newValueMasked?: string;
  }[];
  previousEventHash: string;
  eventHash: string; // SHA-256 cryptographic hash of record contents + previous hash
  checkpointSignature?: string;
}

export interface AuditVerificationResult {
  runId: string;
  executedAt: string;
  totalEventsChecked: number;
  validChainLinks: number;
  discrepanciesCount: number;
  discrepancies: {
    eventId: string;
    timestamp: string;
    expectedHash: string;
    storedHash: string;
    failureReason: string;
  }[];
  integrityStatus: 'VALID_VERIFIED' | 'TAMPER_DETECTED' | 'CHAIN_CORRUPTED';
  checkpointHash: string;
  verifiedBy: string;
}

export interface EncryptionKeyMetadata {
  id: string;
  keyReference: string;
  keyVersion: number;
  purpose: 'COLUMN_LEVEL_ENCRYPTION_DEK' | 'MASTER_KEY_ENCRYPTION_KEK' | 'BLIND_INDEX_HMAC';
  algorithm: 'AES-256-GCM' | 'HMAC-SHA-256';
  provider: 'GCP_CLOUD_KMS' | 'INTERNAL_MANAGED_HSM';
  status: 'ACTIVE' | 'ROTATED_DEPRECATED' | 'RETIRED';
  createdAt: string;
  rotatedAt?: string;
  recordsEncryptedCount: number;
  nextScheduledReview: string;
}

export interface SystemHealthComponent {
  id: string;
  name: string;
  category: 'CORE_API' | 'DATABASE' | 'KMS' | 'DOCUMENT_STORAGE' | 'AUDIT_CHAIN' | 'BACKGROUND_WORKERS';
  status: 'OPERATIONAL' | 'DEGRADED' | 'UNAVAILABLE';
  latencyMs: number;
  lastChecked: string;
  message: string;
  details?: Record<string, string | number>;
}

export interface NotificationItem {
  id: string;
  recipientUserId: string;
  category: 'CLINICAL_ALERT' | 'APPOINTMENT_REMINDER' | 'SECURITY_NOTICE' | 'CLAIM_STATUS';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

export interface KeyRotationJob {
  id: string;
  sourceKeyId: string;
  targetKeyId: string;
  requestedBy: string;
  status: 'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'ROLLED_BACK';
  totalRecords: number;
  completedRecords: number;
  failedRecords: number;
  batchSize: number;
  cursor: string | null;
  retryCount: number;
  maxRetries: number;
  lastErrorCode?: string;
  lastErrorMessage?: string;
  createdAt: string;
  startedAt?: string;
  updatedAt: string;
  completedAt?: string;
  verificationResult?: {
    verifiedRecords: number;
    success: boolean;
    executedAt: string;
  };
}

export interface WrappedKeyRecord {
  keyId: string;
  version: number;
  wrappedKeyCiphertext: string; // Base64 wrapped with master KEK
  iv: string; // Nonce used during wrapping
  tag: string; // Tag for wrapping
  algorithm: 'AES-256-GCM';
  status: 'ACTIVE' | 'ROTATED_DEPRECATED' | 'RETIRED';
  createdAt: string;
  rotatedAt?: string;
  recordsEncryptedCount: number;
}

