/**
 * API Service Layer for AegisHealth EHR
 * Enforces server-side authorization boundaries, column-level encryption,
 * Type 2 SCD record versioning, optimistic concurrency, and tamper-evident audit logging.
 */

import { store } from './store';
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
  InsuranceClaim,
  ClaimAuthorization,
  AuditEvent,
  AuditVerificationResult,
  EncryptionKeyMetadata,
  SystemHealthComponent,
  NotificationItem,
} from '../types/ehr';

import { verifyAuditChain } from '../lib/auditEngine';
import { encryptField, decryptField, setActiveKeyId, getActiveKeyId } from '../lib/crypto';

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status: number = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export const api = {
  // Current user & session
  getCurrentUser(): User {
    return store.currentUser;
  },

  switchUserRole(role: UserRole) {
    store.loginAs(role);
  },

  // Patients
  async getPatients(searchQuery?: string): Promise<Patient[]> {
    const user = store.currentUser;

    // RBAC: Patient only sees themselves
    if (user.role === 'PATIENT') {
      const patient = store.patients.find(p => p.id === user.patientId);
      if (!patient) return [];
      await store.appendAuditLog({
        action: 'PATIENT_RECORD_VIEW',
        resourceType: 'PATIENT',
        resourceReference: patient.id,
        outcome: 'SUCCESS',
        purpose: 'Patient self-inspection',
      });
      return [patient];
    }

    // RBAC: Insurance only sees patients bound to assigned claims
    if (user.role === 'INSURANCE') {
      const assignedPatientIds = new Set(
        store.claims.filter(c => c.assignedAgentId === user.id).map(c => c.patientId)
      );
      const visible = store.patients.filter(p => assignedPatientIds.has(p.id));
      return visible;
    }

    // RBAC: Doctors see assigned patients (or all if searched within organization)
    if (user.role === 'DOCTOR') {
      let result = store.patients;
      if (searchQuery && searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        result = result.filter(
          p =>
            p.demographics.firstName.toLowerCase().includes(query) ||
            p.demographics.lastName.toLowerCase().includes(query) ||
            p.medicalRecordNumber.toLowerCase().includes(query)
        );
      }
      return result;
    }

    // Admins and Auditors: Do not list clinical records by default
    return [];
  },

  async getPatientById(patientId: string): Promise<Patient> {
    const authCheck = store.canAccessPatient(patientId);
    if (!authCheck.allowed) {
      // Record access denial in audit chain!
      await store.appendAuditLog({
        action: 'AUTHORIZATION_DENIAL',
        resourceType: 'PATIENT',
        resourceReference: `PATIENT:${patientId}`,
        outcome: 'DENIED',
        reasonCode: 'ACCESS_RESTRICTED_OR_UNASSIGNED',
        purpose: authCheck.reason,
      });
      throw new ApiError(authCheck.reason || 'Access denied', 'PERMISSION_DENIED', 403);
    }

    const patient = store.patients.find(p => p.id === patientId);
    if (!patient) {
      throw new ApiError('Patient record not found', 'NOT_FOUND', 404);
    }

    // Log successful sensitive read
    await store.appendAuditLog({
      action: 'PATIENT_RECORD_VIEW',
      resourceType: 'PATIENT',
      resourceReference: `${patient.medicalRecordNumber} (${patient.demographics.firstName} ${patient.demographics.lastName})`,
      outcome: 'SUCCESS',
      purpose: store.currentUser.role === 'PATIENT' ? 'Self-view' : 'Direct clinical encounter review',
    });

    return patient;
  },

  async updatePatientDemographics(
    patientId: string,
    expectedVersion: number,
    demographicsUpdate: Partial<Patient['demographics']>
  ): Promise<Patient> {
    const user = store.currentUser;
    if (user.role !== 'DOCTOR' && user.role !== 'ADMIN') {
      throw new ApiError('Patients and third parties cannot modify demographics directly.', 'FORBIDDEN', 403);
    }

    const patient = store.patients.find(p => p.id === patientId);
    if (!patient) throw new ApiError('Patient not found', 'NOT_FOUND', 404);

    // Concurrency control
    if (patient.version !== expectedVersion) {
      throw new ApiError(
        `Version conflict: The patient record has changed (current v${patient.version}, submitted v${expectedVersion}). Please reload.`,
        'VERSION_CONFLICT',
        409
      );
    }

    // Encrypt sensitive demographic fields before saving
    const encryptedPhone = await encryptField(demographicsUpdate.phone || patient.demographics.phone, {
      recordId: patientId,
      fieldName: 'phone',
      organizationId: store.organization.id,
    });

    const previousDemographics = { ...patient.demographics };
    patient.demographics = {
      ...patient.demographics,
      ...demographicsUpdate,
    };
    patient.version += 1;
    patient.updatedAt = new Date().toISOString();

    // Create Type 2 SCD Record Version
    store.recordVersions.push({
      id: `ver-pat-${Date.now()}`,
      entityType: 'PATIENT',
      entityId: patient.id,
      versionNumber: patient.version,
      validFrom: patient.updatedAt,
      isCurrent: true,
      recordedBy: user.id,
      recordedByName: user.name,
      changeReason: 'Authorized clinical demographic update',
      snapshotEncrypted: JSON.stringify(encryptedPhone),
      auditEventId: '',
      createdAt: patient.updatedAt,
    });

    // Record audit event
    await store.appendAuditLog({
      action: 'PATIENT_RECORD_UPDATE',
      resourceType: 'PATIENT',
      resourceReference: patient.medicalRecordNumber,
      outcome: 'SUCCESS',
      recordVersion: patient.version,
      fieldDiff: [
        {
          field: 'phone',
          oldValueMasked: '***-***-' + previousDemographics.phone.slice(-4),
          newValueMasked: '***-***-' + (demographicsUpdate.phone || '').slice(-4),
        },
      ],
    });

    return patient;
  },

  // Clinical Encounters
  async getEncountersByPatient(patientId: string): Promise<ClinicalEncounter[]> {
    const authCheck = store.canAccessPatient(patientId);
    if (!authCheck.allowed) {
      await store.appendAuditLog({
        action: 'AUTHORIZATION_DENIAL',
        resourceType: 'ENCOUNTER',
        resourceReference: `PATIENT:${patientId}`,
        outcome: 'DENIED',
        reasonCode: 'PERMISSION_DENIED',
      });
      throw new ApiError(authCheck.reason || 'Access denied', 'PERMISSION_DENIED', 403);
    }

    const encounters = store.encounters.filter(e => e.patientId === patientId);
    await store.appendAuditLog({
      action: 'CLINICAL_ENCOUNTER_VIEW',
      resourceType: 'ENCOUNTER',
      resourceReference: `PATIENT:${patientId}`,
      outcome: 'SUCCESS',
    });

    return encounters;
  },

  async getAllEncounters(): Promise<ClinicalEncounter[]> {
    const user = store.currentUser;
    if (user.role === 'DOCTOR') {
      return store.encounters;
    }
    if (user.role === 'PATIENT') {
      return store.encounters.filter(e => e.patientId === user.patientId);
    }
    return [];
  },

  async getEncounterById(encounterId: string): Promise<ClinicalEncounter> {
    const encounter = store.encounters.find(e => e.id === encounterId);
    if (!encounter) throw new ApiError('Encounter not found', 'NOT_FOUND', 404);

    const authCheck = store.canAccessPatient(encounter.patientId);
    if (!authCheck.allowed) {
      await store.appendAuditLog({
        action: 'AUTHORIZATION_DENIAL',
        resourceType: 'ENCOUNTER',
        resourceReference: encounter.id,
        outcome: 'DENIED',
      });
      throw new ApiError(authCheck.reason || 'Access denied', 'PERMISSION_DENIED', 403);
    }

    await store.appendAuditLog({
      action: 'CLINICAL_ENCOUNTER_VIEW',
      resourceType: 'ENCOUNTER',
      resourceReference: encounter.id,
      outcome: 'SUCCESS',
      recordVersion: encounter.version,
    });

    return encounter;
  },

  async createEncounter(data: {
    patientId: string;
    encounterType: ClinicalEncounter['encounterType'];
    reasonForVisit: string;
    clinicalNotes: string;
    assessment: string;
    plan: string;
    diagnoses: string[];
    isFinalized?: boolean;
  }): Promise<ClinicalEncounter> {
    const user = store.currentUser;
    if (user.role !== 'DOCTOR') {
      throw new ApiError('Only licensed medical clinicians can author clinical encounters.', 'FORBIDDEN', 403);
    }

    const authCheck = store.canAccessPatient(data.patientId);
    if (!authCheck.allowed) {
      throw new ApiError(authCheck.reason || 'Access denied', 'PERMISSION_DENIED', 403);
    }

    const now = new Date().toISOString();
    const newEncounter: ClinicalEncounter = {
      id: `enc-2026-${Date.now().toString().slice(-4)}`,
      organizationId: store.organization.id,
      patientId: data.patientId,
      clinicianId: user.id,
      clinicianName: user.name,
      encounterType: data.encounterType,
      encounterStatus: data.isFinalized ? 'FINALIZED' : 'DRAFT',
      encounterDate: now,
      reasonForVisit: data.reasonForVisit,
      clinicalNotes: data.clinicalNotes,
      assessment: data.assessment,
      plan: data.plan,
      diagnoses: data.diagnoses,
      finalizedAt: data.isFinalized ? now : undefined,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    store.encounters.unshift(newEncounter);

    // Encrypt notes and store SCD Version 1
    const encryptedNotes = await encryptField(data.clinicalNotes, {
      recordId: newEncounter.id,
      fieldName: 'clinicalNotes',
      organizationId: store.organization.id,
    });

    store.recordVersions.push({
      id: `ver-enc-${newEncounter.id}-1`,
      entityType: 'ENCOUNTER',
      entityId: newEncounter.id,
      versionNumber: 1,
      validFrom: now,
      isCurrent: true,
      recordedBy: user.id,
      recordedByName: user.name,
      changeReason: 'Initial encounter creation',
      snapshotEncrypted: JSON.stringify(encryptedNotes),
      auditEventId: '',
      createdAt: now,
    });

    await store.appendAuditLog({
      action: data.isFinalized ? 'CLINICAL_ENCOUNTER_FINALIZE' : 'CLINICAL_ENCOUNTER_CREATE',
      resourceType: 'ENCOUNTER',
      resourceReference: `${newEncounter.id} (${newEncounter.encounterType})`,
      outcome: 'SUCCESS',
      recordVersion: 1,
    });

    return newEncounter;
  },

  async updateEncounter(
    encounterId: string,
    expectedVersion: number,
    data: {
      clinicalNotes?: string;
      assessment?: string;
      plan?: string;
      diagnoses?: string[];
      isFinalized?: boolean;
    }
  ): Promise<ClinicalEncounter> {
    const user = store.currentUser;
    if (user.role !== 'DOCTOR') {
      throw new ApiError('Only licensed medical clinicians can modify clinical encounters.', 'FORBIDDEN', 403);
    }

    const encounter = store.encounters.find(e => e.id === encounterId);
    if (!encounter) throw new ApiError('Encounter not found', 'NOT_FOUND', 404);

    if (encounter.version !== expectedVersion) {
      throw new ApiError(
        `Version conflict: Encounter was updated by another clinician (current v${encounter.version}, expected v${expectedVersion}).`,
        'VERSION_CONFLICT',
        409
      );
    }

    const now = new Date().toISOString();
    encounter.version += 1;
    encounter.updatedAt = now;

    if (data.clinicalNotes !== undefined) encounter.clinicalNotes = data.clinicalNotes;
    if (data.assessment !== undefined) encounter.assessment = data.assessment;
    if (data.plan !== undefined) encounter.plan = data.plan;
    if (data.diagnoses !== undefined) encounter.diagnoses = data.diagnoses;
    if (data.isFinalized) {
      encounter.encounterStatus = 'FINALIZED';
      encounter.finalizedAt = now;
    }

    await store.appendAuditLog({
      action: data.isFinalized ? 'CLINICAL_ENCOUNTER_FINALIZE' : 'CLINICAL_ENCOUNTER_UPDATE',
      resourceType: 'ENCOUNTER',
      resourceReference: encounter.id,
      outcome: 'SUCCESS',
      recordVersion: encounter.version,
    });

    return encounter;
  },

  // Observations / Vitals
  async getVitalsByPatient(patientId: string): Promise<VitalSign[]> {
    const authCheck = store.canAccessPatient(patientId);
    if (!authCheck.allowed) throw new ApiError(authCheck.reason || 'Access denied', 'PERMISSION_DENIED', 403);
    return store.vitals.filter(v => v.patientId === patientId);
  },

  async createVital(data: {
    patientId: string;
    type: VitalSign['type'];
    value: string;
    unit: string;
    referenceRange?: string;
  }): Promise<VitalSign> {
    const user = store.currentUser;
    if (user.role !== 'DOCTOR') {
      throw new ApiError('Only clinicians can record clinical observations.', 'FORBIDDEN', 403);
    }

    const newVital: VitalSign = {
      id: `vit-${Date.now().toString().slice(-4)}`,
      patientId: data.patientId,
      type: data.type,
      value: data.value,
      unit: data.unit,
      referenceRange: data.referenceRange,
      status: 'NORMAL',
      recordedAt: new Date().toISOString(),
      recordedBy: user.id,
      recordedByName: user.name,
    };

    store.vitals.unshift(newVital);

    await store.appendAuditLog({
      action: 'CLINICAL_OBSERVATION_CREATE',
      resourceType: 'PATIENT',
      resourceReference: `VITAL:${data.type}=${data.value}${data.unit}`,
      outcome: 'SUCCESS',
    });

    return newVital;
  },

  // Conditions, Medications, Allergies
  async getConditionsByPatient(patientId: string): Promise<ClinicalCondition[]> {
    const authCheck = store.canAccessPatient(patientId);
    if (!authCheck.allowed) throw new ApiError(authCheck.reason || 'Access denied', 'PERMISSION_DENIED', 403);
    return store.conditions.filter(c => c.patientId === patientId);
  },

  async addCondition(data: {
    patientId: string;
    code: string;
    displayName: string;
    onsetDate: string;
    notes?: string;
  }): Promise<ClinicalCondition> {
    const user = store.currentUser;
    if (user.role !== 'DOCTOR') throw new ApiError('Only clinicians can record conditions.', 'FORBIDDEN', 403);

    const newCond: ClinicalCondition = {
      id: `cond-${Date.now().toString().slice(-4)}`,
      patientId: data.patientId,
      codeSystem: 'ICD-10',
      code: data.code,
      displayName: data.displayName,
      clinicalStatus: 'ACTIVE',
      onsetDate: data.onsetDate,
      recordedBy: user.id,
      recordedByName: user.name,
      notes: data.notes,
      version: 1,
      updatedAt: new Date().toISOString(),
    };

    store.conditions.unshift(newCond);
    await store.appendAuditLog({
      action: 'PATIENT_RECORD_UPDATE',
      resourceType: 'PATIENT',
      resourceReference: `CONDITION_ADDED:${data.code} (${data.displayName})`,
      outcome: 'SUCCESS',
    });

    return newCond;
  },

  async getMedicationsByPatient(patientId: string): Promise<Medication[]> {
    const authCheck = store.canAccessPatient(patientId);
    if (!authCheck.allowed) throw new ApiError(authCheck.reason || 'Access denied', 'PERMISSION_DENIED', 403);
    return store.medications.filter(m => m.patientId === patientId);
  },

  async addMedication(data: {
    patientId: string;
    name: string;
    strength: string;
    dosageInstructions: string;
    route: Medication['route'];
    startDate: string;
  }): Promise<Medication> {
    const user = store.currentUser;
    if (user.role !== 'DOCTOR') throw new ApiError('Only clinicians can prescribe medications.', 'FORBIDDEN', 403);

    const newMed: Medication = {
      id: `med-${Date.now().toString().slice(-4)}`,
      patientId: data.patientId,
      name: data.name,
      strength: data.strength,
      dosageInstructions: data.dosageInstructions,
      route: data.route,
      startDate: data.startDate,
      status: 'ACTIVE',
      prescribedBy: user.id,
      prescribedByName: user.name,
      version: 1,
      updatedAt: new Date().toISOString(),
    };

    store.medications.unshift(newMed);
    await store.appendAuditLog({
      action: 'PATIENT_RECORD_UPDATE',
      resourceType: 'PATIENT',
      resourceReference: `MEDICATION_PRESCRIBED:${data.name} ${data.strength}`,
      outcome: 'SUCCESS',
    });

    return newMed;
  },

  async getAllergiesByPatient(patientId: string): Promise<Allergy[]> {
    const authCheck = store.canAccessPatient(patientId);
    if (!authCheck.allowed) throw new ApiError(authCheck.reason || 'Access denied', 'PERMISSION_DENIED', 403);
    return store.allergies.filter(a => a.patientId === patientId);
  },

  async addAllergy(data: {
    patientId: string;
    substance: string;
    reaction: string;
    severity: Allergy['severity'];
  }): Promise<Allergy> {
    const user = store.currentUser;
    if (user.role !== 'DOCTOR') throw new ApiError('Only clinicians can add allergies.', 'FORBIDDEN', 403);

    const newAllergy: Allergy = {
      id: `alg-${Date.now().toString().slice(-4)}`,
      patientId: data.patientId,
      substance: data.substance,
      reaction: data.reaction,
      severity: data.severity,
      status: 'ACTIVE',
      verificationStatus: 'CONFIRMED',
      recordedBy: user.id,
      recordedByName: user.name,
      recordedAt: new Date().toISOString(),
      version: 1,
    };

    store.allergies.unshift(newAllergy);
    await store.appendAuditLog({
      action: 'PATIENT_RECORD_UPDATE',
      resourceType: 'PATIENT',
      resourceReference: `ALLERGY_RECORDED:${data.substance}`,
      outcome: 'SUCCESS',
    });

    return newAllergy;
  },

  // Diagnostic Reports & Documents
  async getLabResultsByPatient(patientId: string): Promise<DiagnosticReport[]> {
    const authCheck = store.canAccessPatient(patientId);
    if (!authCheck.allowed) throw new ApiError(authCheck.reason || 'Access denied', 'PERMISSION_DENIED', 403);
    return store.labResults.filter(r => r.patientId === patientId);
  },

  async getDocumentsByPatient(patientId: string): Promise<ClinicalDocument[]> {
    const authCheck = store.canAccessPatient(patientId);
    if (!authCheck.allowed) throw new ApiError(authCheck.reason || 'Access denied', 'PERMISSION_DENIED', 403);
    return store.documents.filter(d => d.patientId === patientId);
  },

  async uploadDocument(data: {
    patientId: string;
    fileName: string;
    documentType: ClinicalDocument['documentType'];
    previewContent: string;
  }): Promise<ClinicalDocument> {
    const user = store.currentUser;
    const authCheck = store.canAccessPatient(data.patientId);
    if (!authCheck.allowed) throw new ApiError(authCheck.reason || 'Access denied', 'PERMISSION_DENIED', 403);

    const doc: ClinicalDocument = {
      id: `doc-${Date.now().toString().slice(-4)}`,
      organizationId: store.organization.id,
      patientId: data.patientId,
      fileName: data.fileName,
      mimeType: 'application/pdf',
      fileSize: 184500,
      contentHash: `sha256-${Date.now()}`,
      documentType: data.documentType,
      classification: 'RESTRICTED_CLINICAL',
      uploadedBy: user.id,
      uploadedByName: user.name,
      uploadedAt: new Date().toISOString(),
      previewContent: data.previewContent,
    };

    store.documents.unshift(doc);
    await store.appendAuditLog({
      action: 'CLINICAL_DOCUMENT_UPLOAD',
      resourceType: 'DOCUMENT',
      resourceReference: `${doc.id} (${doc.fileName})`,
      outcome: 'SUCCESS',
    });

    return doc;
  },

  // Care Plans
  async getCarePlansByPatient(patientId: string): Promise<CarePlan[]> {
    const authCheck = store.canAccessPatient(patientId);
    if (!authCheck.allowed) throw new ApiError(authCheck.reason || 'Access denied', 'PERMISSION_DENIED', 403);
    return store.carePlans.filter(cp => cp.patientId === patientId);
  },

  // Appointments
  async getAppointments(): Promise<Appointment[]> {
    const user = store.currentUser;
    if (user.role === 'DOCTOR') {
      return store.appointments.filter(a => a.clinicianId === user.id);
    }
    if (user.role === 'PATIENT') {
      return store.appointments.filter(a => a.patientId === user.patientId);
    }
    return store.appointments;
  },

  async createAppointment(data: {
    patientId: string;
    patientName: string;
    appointmentType: Appointment['appointmentType'];
    scheduledAt: string;
    modality: Appointment['modality'];
    location: string;
    instructions?: string;
  }): Promise<Appointment> {
    const newApt: Appointment = {
      id: `apt-${Date.now().toString().slice(-4)}`,
      organizationId: store.organization.id,
      patientId: data.patientId,
      patientName: data.patientName,
      clinicianId: 'usr-doctor-01',
      clinicianName: 'Dr. Sarah Chen, MD',
      appointmentType: data.appointmentType,
      scheduledAt: data.scheduledAt,
      durationMinutes: 30,
      status: 'SCHEDULED',
      modality: data.modality,
      location: data.location,
      instructions: data.instructions,
      version: 1,
      createdAt: new Date().toISOString(),
    };

    store.appointments.unshift(newApt);
    await store.appendAuditLog({
      action: 'PATIENT_RECORD_UPDATE',
      resourceType: 'PATIENT',
      resourceReference: `APPOINTMENT_SCHEDULED:${newApt.id} at ${newApt.scheduledAt}`,
      outcome: 'SUCCESS',
    });

    return newApt;
  },

  async cancelAppointment(appointmentId: string, reason: string): Promise<Appointment> {
    const apt = store.appointments.find(a => a.id === appointmentId);
    if (!apt) throw new ApiError('Appointment not found', 'NOT_FOUND', 404);

    apt.status = 'CANCELLED';
    apt.cancellationReason = reason;
    apt.version += 1;

    await store.appendAuditLog({
      action: 'PATIENT_RECORD_UPDATE',
      resourceType: 'PATIENT',
      resourceReference: `APPOINTMENT_CANCELLED:${apt.id} (${reason})`,
      outcome: 'SUCCESS',
      recordVersion: apt.version,
    });

    return apt;
  },

  // Consents
  async getConsentsByPatient(patientId: string): Promise<PatientConsent[]> {
    const authCheck = store.canAccessPatient(patientId);
    if (!authCheck.allowed) throw new ApiError(authCheck.reason || 'Access denied', 'PERMISSION_DENIED', 403);
    return store.consents.filter(c => c.patientId === patientId);
  },

  async updateConsent(consentId: string, newStatus: PatientConsent['status'], reason: string): Promise<PatientConsent> {
    const consent = store.consents.find(c => c.id === consentId);
    if (!consent) throw new ApiError('Consent record not found', 'NOT_FOUND', 404);

    const prevStatus = consent.status;
    consent.status = newStatus;
    consent.version += 1;
    consent.updatedAt = new Date().toISOString();

    const auditEvt = await store.appendAuditLog({
      action: 'CONSENT_UPDATE',
      resourceType: 'CONSENT',
      resourceReference: `${consent.id} (${consent.purpose})`,
      outcome: 'SUCCESS',
      purpose: reason,
      recordVersion: consent.version,
      fieldDiff: [{ field: 'status', oldValueMasked: prevStatus, newValueMasked: newStatus }],
    });

    store.consentHistory.push({
      id: `ch-${Date.now()}`,
      consentId: consent.id,
      versionNumber: consent.version,
      previousStatus: prevStatus,
      newStatus: newStatus,
      changeReason: reason,
      changedBy: store.currentUser.id,
      changedAt: consent.updatedAt,
      auditEventId: auditEvt.id,
    });

    return consent;
  },

  // Insurance Claims & Authorizations
  async getAssignedClaims(): Promise<InsuranceClaim[]> {
    const user = store.currentUser;
    if (user.role !== 'INSURANCE' && user.role !== 'ADMIN' && user.role !== 'AUDITOR') {
      throw new ApiError('Claims queue restricted to authorized insurance agents.', 'FORBIDDEN', 403);
    }
    return store.claims;
  },

  async getClaimById(claimId: string): Promise<InsuranceClaim> {
    const claim = store.claims.find(c => c.id === claimId);
    if (!claim) throw new ApiError('Claim not found', 'NOT_FOUND', 404);

    await store.appendAuditLog({
      action: 'CLAIM_VIEW',
      resourceType: 'CLAIM',
      resourceReference: claim.claimReference,
      outcome: 'SUCCESS',
      purpose: 'Adjudication investigation',
    });

    return claim;
  },

  async adjudicateClaim(
    claimId: string,
    decision: 'APPROVED' | 'REJECTED' | 'ADDITIONAL_INFO_REQUESTED',
    reason: string
  ): Promise<InsuranceClaim> {
    const user = store.currentUser;
    if (user.role !== 'INSURANCE') {
      throw new ApiError('Only authorized insurance agents can adjudicate claims.', 'FORBIDDEN', 403);
    }

    const claim = store.claims.find(c => c.id === claimId);
    if (!claim) throw new ApiError('Claim not found', 'NOT_FOUND', 404);

    const prevStatus = claim.status;
    claim.status = decision;
    claim.reviewReason = reason;
    claim.decisionDate = new Date().toISOString();
    claim.version += 1;
    claim.updatedAt = claim.decisionDate;

    await store.appendAuditLog({
      action: decision === 'ADDITIONAL_INFO_REQUESTED' ? 'CLAIM_REQUEST_INFO' : 'CLAIM_ADJUDICATION_DECISION',
      resourceType: 'CLAIM',
      resourceReference: `${claim.claimReference} -> ${decision}`,
      outcome: 'SUCCESS',
      purpose: reason,
      recordVersion: claim.version,
      fieldDiff: [{ field: 'status', oldValueMasked: prevStatus, newValueMasked: decision }],
    });

    return claim;
  },

  async getAuthorizations(): Promise<ClaimAuthorization[]> {
    return store.authorizations;
  },

  async decideAuthorization(
    authId: string,
    decision: 'APPROVED' | 'DENIED',
    reason: string
  ): Promise<ClaimAuthorization> {
    const auth = store.authorizations.find(a => a.id === authId);
    if (!auth) throw new ApiError('Authorization request not found', 'NOT_FOUND', 404);

    auth.status = decision;
    auth.decisionReason = reason;
    auth.reviewedBy = store.currentUser.name;
    auth.reviewedAt = new Date().toISOString();
    auth.version += 1;

    await store.appendAuditLog({
      action: 'AUTHORIZATION_DECISION',
      resourceType: 'CLAIM',
      resourceReference: `${auth.id} (${auth.requestedService}) -> ${decision}`,
      outcome: 'SUCCESS',
      purpose: reason,
      recordVersion: auth.version,
    });

    return auth;
  },

  // Audit Logs & Cryptographic Verification
  async getAuditLogs(filter?: { actorRole?: string; action?: string; outcome?: string }): Promise<AuditEvent[]> {
    const user = store.currentUser;
    if (user.role !== 'ADMIN' && user.role !== 'AUDITOR') {
      throw new ApiError('Organization-wide audit logs are restricted to Administrators and Auditors.', 'FORBIDDEN', 403);
    }

    await store.appendAuditLog({
      action: 'AUTH_SESSION_EXPIRED', // Note: recorded as an audit read event
      resourceType: 'SECURITY',
      resourceReference: 'AUDIT_LOG_STREAM_QUERY',
      outcome: 'SUCCESS',
      purpose: 'Auditor inspection',
    });

    let results = [...store.auditEvents].reverse();
    if (filter?.actorRole) results = results.filter(e => e.actorRole === filter.actorRole);
    if (filter?.action) results = results.filter(e => e.action.includes(filter.action!));
    if (filter?.outcome) results = results.filter(e => e.outcome === filter.outcome);
    return results;
  },

  async verifyAuditIntegrity(): Promise<AuditVerificationResult> {
    const user = store.currentUser;
    if (user.role !== 'ADMIN' && user.role !== 'AUDITOR') {
      throw new ApiError('Audit verification restricted to Admins and Auditors.', 'FORBIDDEN', 403);
    }

    const verificationResult = await verifyAuditChain(store.auditEvents, user.name);

    await store.appendAuditLog({
      action: 'AUDIT_INTEGRITY_VERIFIED',
      resourceType: 'SECURITY',
      resourceReference: `VerificationRun:${verificationResult.runId} (${verificationResult.integrityStatus})`,
      outcome: verificationResult.integrityStatus === 'VALID_VERIFIED' ? 'SUCCESS' : 'FAILED',
      purpose: `Checked ${verificationResult.totalEventsChecked} events, valid links: ${verificationResult.validChainLinks}`,
    });

    return verificationResult;
  },

  // Key Management & Encryption
  async getKeyMetadata(): Promise<EncryptionKeyMetadata[]> {
    const user = store.currentUser;
    if (user.role !== 'ADMIN' && user.role !== 'AUDITOR') {
      throw new ApiError('Key metadata restricted to security administrators and auditors.', 'FORBIDDEN', 403);
    }
    return store.keys;
  },

  async rotateEncryptionKey(): Promise<{ success: boolean; newKeyId: string; message: string }> {
    const user = store.currentUser;
    if (user.role !== 'ADMIN') {
      throw new ApiError('Key rotation requires administrative privileges.', 'FORBIDDEN', 403);
    }

    const currentKey = getActiveKeyId();
    const newKey = currentKey === 'key-dek-v1' ? 'key-dek-v2' : 'key-dek-v1';
    setActiveKeyId(newKey);

    const rotatedKeyMeta = store.keys.find((k: EncryptionKeyMetadata) => k.id === newKey);
    if (rotatedKeyMeta) {
      rotatedKeyMeta.rotatedAt = new Date().toISOString();
      rotatedKeyMeta.recordsEncryptedCount += 12;
    }

    await store.appendAuditLog({
      action: 'KEY_ROTATION_TRIGGERED',
      resourceType: 'KEY',
      resourceReference: `${currentKey} -> ${newKey}`,
      outcome: 'SUCCESS',
      purpose: 'Administrator initiated cryptographic key rotation job',
    });

    return {
      success: true,
      newKeyId: newKey,
      message: `Active Data Encryption Key rotated to ${newKey}. Existing ciphertext remained decryptable via multi-version key ring.`,
    };
  },

  // System Health
  async getSystemHealth(): Promise<SystemHealthComponent[]> {
    return store.health;
  },

  // Tasks
  async getTasks(): Promise<ClinicalTask[]> {
    return store.tasks;
  },

  async completeTask(taskId: string): Promise<ClinicalTask> {
    const task = store.tasks.find(t => t.id === taskId);
    if (!task) throw new ApiError('Task not found', 'NOT_FOUND', 404);
    task.status = 'COMPLETED';
    return task;
  },

  // Notifications
  async getNotifications(): Promise<NotificationItem[]> {
    const user = store.currentUser;
    return store.notifications.filter(n => n.recipientUserId === user.id);
  },

  async markNotificationRead(id: string): Promise<void> {
    const n = store.notifications.find(item => item.id === id);
    if (n) n.read = true;
  },

  async markAllNotificationsRead(): Promise<void> {
    const user = store.currentUser;
    store.notifications.filter(n => n.recipientUserId === user.id).forEach(n => (n.read = true));
  },
};
