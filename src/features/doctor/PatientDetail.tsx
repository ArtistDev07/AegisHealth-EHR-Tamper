import React, { useState, useEffect } from 'react';
import {
  FileText,
  Activity,
  HeartPulse,
  Pill,
  ShieldAlert,
  CalendarDays,
  FolderOpen,
  ClipboardList,
  ShieldCheck,
  History,
  User,
  Plus,
  Pencil,
  ArrowLeft,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { StatusBadge } from '../../components/ui/StatusBadge';
import {
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
  PatientConsent,
} from '../../types/ehr';
import { api } from '../../services/api';
import { store } from '../../services/store';
import { useToast } from '../../components/ui/Toast';

interface PatientDetailProps {
  patientId: string;
  initialTab?: string;
  onNavigate: (path: string) => void;
}

export const PatientDetail: React.FC<PatientDetailProps> = ({
  patientId,
  initialTab = 'overview',
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [encounters, setEncounters] = useState<ClinicalEncounter[]>([]);
  const [vitals, setVitals] = useState<VitalSign[]>([]);
  const [conditions, setConditions] = useState<ClinicalCondition[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [labResults, setLabResults] = useState<DiagnosticReport[]>([]);
  const [documents, setDocuments] = useState<ClinicalDocument[]>([]);
  const [carePlans, setCarePlans] = useState<CarePlan[]>([]);
  const [consents, setConsents] = useState<PatientConsent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isEditDemographicsOpen, setIsEditDemographicsOpen] = useState(false);
  const [isAddVitalOpen, setIsAddVitalOpen] = useState(false);
  const [isAddConditionOpen, setIsAddConditionOpen] = useState(false);
  const [isAddMedOpen, setIsAddMedOpen] = useState(false);
  const [isAddAllergyOpen, setIsAddAllergyOpen] = useState(false);
  const [isUploadDocOpen, setIsUploadDocOpen] = useState(false);
  const [isScheduleAptOpen, setIsScheduleAptOpen] = useState(false);

  // Demographics form
  const [demoForm, setDemoForm] = useState({
    phone: '',
    addressLine1: '',
    city: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
  });

  // Vital form
  const [vitalForm, setVitalForm] = useState({
    type: 'BLOOD_PRESSURE' as VitalSign['type'],
    value: '120/80',
    unit: 'mmHg',
  });

  // Condition form
  const [condForm, setCondForm] = useState({
    code: 'I10',
    displayName: 'Essential hypertension',
    onsetDate: '2026-01-01',
    notes: '',
  });

  // Medication form
  const [medForm, setMedForm] = useState({
    name: 'Amlodipine',
    strength: '5 mg',
    dosageInstructions: 'Take 1 tablet daily',
    route: 'ORAL' as Medication['route'],
    startDate: '2026-10-09',
  });

  // Allergy form
  const [allergyForm, setAllergyForm] = useState({
    substance: 'Latex',
    reaction: 'Contact dermatitis',
    severity: 'MODERATE' as Allergy['severity'],
  });

  // Document form
  const [docForm, setDocForm] = useState({
    fileName: 'External_Consultation_Letter.pdf',
    documentType: 'DISCHARGE_SUMMARY' as ClinicalDocument['documentType'],
    previewContent: 'External hospital consultation note scanned into EHR.',
  });

  // Appointment form
  const [aptForm, setAptForm] = useState({
    appointmentType: 'ROUTINE_CHECKUP' as Appointment['appointmentType'],
    scheduledAt: '2026-10-16T10:00:00Z',
    modality: 'IN_PERSON' as Appointment['modality'],
    location: 'Suite 402 - Examination Room 1',
  });

  const toast = useToast();

  useEffect(() => {
    loadPatientData();
  }, [patientId]);

  const loadPatientData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const p = await api.getPatientById(patientId);
      setPatient(p);
      setDemoForm({
        phone: p.demographics.phone,
        addressLine1: p.demographics.addressLine1,
        city: p.demographics.city,
        emergencyContactName: p.demographics.emergencyContactName,
        emergencyContactPhone: p.demographics.emergencyContactPhone,
      });

      const [enc, vit, cond, med, alg, labs, docs, cps, cns] = await Promise.all([
        api.getEncountersByPatient(patientId),
        api.getVitalsByPatient(patientId),
        api.getConditionsByPatient(patientId),
        api.getMedicationsByPatient(patientId),
        api.getAllergiesByPatient(patientId),
        api.getLabResultsByPatient(patientId),
        api.getDocumentsByPatient(patientId),
        api.getCarePlansByPatient(patientId),
        api.getConsentsByPatient(patientId),
      ]);

      setEncounters(enc);
      setVitals(vit);
      setConditions(cond);
      setMedications(med);
      setAllergies(alg);
      setLabResults(labs);
      setDocuments(docs);
      setCarePlans(cps);
      setConsents(cns);
    } catch (err: any) {
      setError(err.message || 'Access denied to this patient chart');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDemographics = async () => {
    if (!patient) return;
    try {
      const updated = await api.updatePatientDemographics(patient.id, patient.version, demoForm);
      setPatient(updated);
      setIsEditDemographicsOpen(false);
      toast.success('Demographics updated', `Recorded version v${updated.version}`);
    } catch (err: any) {
      toast.error('Failed to update demographics', err.message);
    }
  };

  const handleAddVital = async () => {
    if (!patient) return;
    try {
      await api.createVital({
        patientId: patient.id,
        type: vitalForm.type,
        value: vitalForm.value,
        unit: vitalForm.unit,
      });
      setIsAddVitalOpen(false);
      loadPatientData();
      toast.success('Vital sign recorded');
    } catch (err: any) {
      toast.error('Failed to record vital', err.message);
    }
  };

  const handleAddCondition = async () => {
    if (!patient) return;
    try {
      await api.addCondition({
        patientId: patient.id,
        code: condForm.code,
        displayName: condForm.displayName,
        onsetDate: condForm.onsetDate,
        notes: condForm.notes,
      });
      setIsAddConditionOpen(false);
      loadPatientData();
      toast.success('Condition documented');
    } catch (err: any) {
      toast.error('Failed to add condition', err.message);
    }
  };

  const handleAddMedication = async () => {
    if (!patient) return;
    try {
      await api.addMedication({
        patientId: patient.id,
        name: medForm.name,
        strength: medForm.strength,
        dosageInstructions: medForm.dosageInstructions,
        route: medForm.route,
        startDate: medForm.startDate,
      });
      setIsAddMedOpen(false);
      loadPatientData();
      toast.success('Medication added');
    } catch (err: any) {
      toast.error('Failed to add medication', err.message);
    }
  };

  const handleAddAllergy = async () => {
    if (!patient) return;
    try {
      await api.addAllergy({
        patientId: patient.id,
        substance: allergyForm.substance,
        reaction: allergyForm.reaction,
        severity: allergyForm.severity,
      });
      setIsAddAllergyOpen(false);
      loadPatientData();
      toast.success('Allergy recorded');
    } catch (err: any) {
      toast.error('Failed to add allergy', err.message);
    }
  };

  const handleUploadDoc = async () => {
    if (!patient) return;
    try {
      await api.uploadDocument({
        patientId: patient.id,
        fileName: docForm.fileName,
        documentType: docForm.documentType,
        previewContent: docForm.previewContent,
      });
      setIsUploadDocOpen(false);
      loadPatientData();
      toast.success('Document uploaded');
    } catch (err: any) {
      toast.error('Failed to upload document', err.message);
    }
  };

  const handleScheduleApt = async () => {
    if (!patient) return;
    try {
      await api.createAppointment({
        patientId: patient.id,
        patientName: `${patient.demographics.firstName} ${patient.demographics.lastName}`,
        appointmentType: aptForm.appointmentType,
        scheduledAt: aptForm.scheduledAt,
        modality: aptForm.modality,
        location: aptForm.location,
      });
      setIsScheduleAptOpen(false);
      loadPatientData();
      toast.success('Appointment scheduled');
    } catch (err: any) {
      toast.error('Failed to schedule appointment', err.message);
    }
  };

  if (isLoading) {
    return <div className="py-16 text-center text-xs text-[#596579]">Loading clinical chart...</div>;
  }

  if (error || !patient) {
    return (
      <div className="py-16 text-center max-w-md mx-auto space-y-4">
        <div className="w-12 h-12 rounded-xl bg-[#FEF2F2] text-[#B91C1C] flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-[#142238]">Access Restricted</h2>
        <p className="text-xs text-[#596579]">{error || 'Unable to open patient record.'}</p>
        <div className="flex justify-center gap-2">
          <Button variant="secondary" onClick={() => onNavigate('/doctor/patients')}>
            Back to patient list
          </Button>
          {store.currentUser.role === 'DOCTOR' && (
            <Button
              variant="danger"
              onClick={async () => {
                try {
                  await store.requestBreakGlassAccess(
                    patientId,
                    'Acute clinical emergency assessment'
                  );
                  loadPatientData();
                  toast.warning('Emergency access activated');
                } catch (e: any) {
                  toast.error(e.message);
                }
              }}
            >
              Break-Glass Access
            </Button>
          )}
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Clinical Overview' },
    { id: 'demographics', label: 'Demographics' },
    { id: 'encounters', label: `Encounters (${encounters.length})` },
    { id: 'vitals', label: `Vitals (${vitals.length})` },
    { id: 'conditions', label: `Conditions (${conditions.length})` },
    { id: 'medications', label: `Medications (${medications.length})` },
    { id: 'allergies', label: `Allergies (${allergies.length})` },
    { id: 'lab-results', label: `Lab Results (${labResults.length})` },
    { id: 'documents', label: `Documents (${documents.length})` },
    { id: 'care-plans', label: `Care Plans (${carePlans.length})` },
    { id: 'consents', label: `Consents (${consents.length})` },
  ];

  return (
    <div className="space-y-6">
      {/* Back button & top breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[#596579]">
        <button
          onClick={() => onNavigate('/doctor/patients')}
          className="hover:text-[#172033] flex items-center gap-1 cursor-pointer font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Patient Directory
        </button>
        <span>/</span>
        <span className="text-[#172033] font-semibold">{patient.medicalRecordNumber}</span>
      </div>

      {/* Patient Identity Banner */}
      <div className="bg-white p-6 rounded-2xl border border-[#DCE3EC] shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-[#EAF0FF] text-[#2457C5] flex items-center justify-center font-bold text-xl shrink-0">
              {patient.demographics.firstName[0]}
              {patient.demographics.lastName[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-[#142238]">
                  {patient.demographics.firstName} {patient.demographics.lastName}
                </h1>
                <StatusBadge status={patient.recordStatus} />
                <span className="text-xs font-mono text-[#596579] bg-[#F1F5F9] px-2 py-0.5 rounded">
                  v{patient.version} SCD
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-[#596579]">
                <span>MRN: <strong className="font-mono text-[#172033]">{patient.medicalRecordNumber}</strong></span>
                <span>·</span>
                <span>DOB: <strong>{patient.demographics.dateOfBirth}</strong></span>
                <span>·</span>
                <span>Gender: <strong>{patient.demographics.gender}</strong></span>
                <span>·</span>
                <span>Blood Type: <strong>{patient.demographics.bloodType}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsScheduleAptOpen(true)}
              leftIcon={<CalendarDays className="w-4 h-4" />}
            >
              Schedule
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onNavigate(`/doctor/encounters/new?patientId=${patient.id}`)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              New Encounter
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-[#DCE3EC] overflow-x-auto pb-1 text-xs">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-3 py-2 font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === t.id
                ? 'bg-[#2457C5] text-white shadow-2xs font-semibold'
                : 'text-[#596579] hover:text-[#172033] hover:bg-[#F1F5F9]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Clinical Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Active Conditions */}
            <Card
              title="Active Conditions"
              headerAction={
                <Button variant="tertiary" size="sm" onClick={() => setIsAddConditionOpen(true)}>
                  Add
                </Button>
              }
            >
              <div className="divide-y divide-[#F1F5F9]">
                {conditions.map(c => (
                  <div key={c.id} className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between">
                    <div>
                      <div className="text-xs font-semibold text-[#172033]">{c.displayName}</div>
                      <div className="text-[11px] text-[#596579]">
                        Code: {c.code} · Onset: {c.onsetDate}
                      </div>
                      {c.notes && <div className="text-[11px] text-[#596579] mt-0.5">{c.notes}</div>}
                    </div>
                    <StatusBadge status={c.clinicalStatus} />
                  </div>
                ))}
              </div>
            </Card>

            {/* Current Medications */}
            <Card
              title="Current Medications"
              headerAction={
                <Button variant="tertiary" size="sm" onClick={() => setIsAddMedOpen(true)}>
                  Prescribe
                </Button>
              }
            >
              <div className="divide-y divide-[#F1F5F9]">
                {medications.map(m => (
                  <div key={m.id} className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between">
                    <div>
                      <div className="text-xs font-semibold text-[#172033]">
                        {m.name} {m.strength}
                      </div>
                      <div className="text-[11px] text-[#596579]">{m.dosageInstructions}</div>
                    </div>
                    <StatusBadge status={m.status} />
                  </div>
                ))}
              </div>
            </Card>

            {/* Recent Encounters */}
            <Card
              title="Recent Clinical Encounters"
              headerAction={
                <Button
                  variant="tertiary"
                  size="sm"
                  onClick={() => onNavigate(`/doctor/encounters/new?patientId=${patient.id}`)}
                >
                  New Encounter
                </Button>
              }
            >
              <div className="space-y-3">
                {encounters.map(enc => (
                  <div
                    key={enc.id}
                    onClick={() => onNavigate(`/doctor/encounters/${enc.id}`)}
                    className="p-3.5 rounded-xl border border-[#DCE3EC] hover:border-[#2457C5] bg-[#FAFCFF] transition-all cursor-pointer flex items-start justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#172033]">
                          {enc.encounterType.replace(/_/g, ' ')}
                        </span>
                        <StatusBadge status={enc.encounterStatus} />
                      </div>
                      <p className="text-xs text-[#596579] mt-1 line-clamp-1">{enc.reasonForVisit}</p>
                      <div className="text-[11px] text-[#64748B] mt-1 font-mono">
                        {new Date(enc.encounterDate).toLocaleDateString()} by {enc.clinicianName}
                      </div>
                    </div>
                    <Button variant="secondary" size="sm">
                      Open
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Recorded Allergies */}
            <Card
              title="Allergies & Adverse Reactions"
              headerAction={
                <Button variant="tertiary" size="sm" onClick={() => setIsAddAllergyOpen(true)}>
                  Add
                </Button>
              }
            >
              <div className="space-y-2.5">
                {allergies.map(a => (
                  <div key={a.id} className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#991B1B]">{a.substance}</span>
                      <StatusBadge status={a.severity} />
                    </div>
                    <div className="text-[11px] text-[#7F1D1D] mt-1">{a.reaction}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Latest Vitals */}
            <Card
              title="Latest Vitals"
              headerAction={
                <Button variant="tertiary" size="sm" onClick={() => setIsAddVitalOpen(true)}>
                  Record
                </Button>
              }
            >
              <div className="grid grid-cols-2 gap-3">
                {vitals.slice(0, 4).map(v => (
                  <div key={v.id} className="p-3 rounded-xl bg-[#F8FAFC] border border-[#DCE3EC]">
                    <div className="text-[10px] uppercase font-semibold text-[#596579]">
                      {v.type.replace(/_/g, ' ')}
                    </div>
                    <div className="text-base font-bold text-[#172033] mt-1 font-mono">
                      {v.value} <span className="text-xs font-normal text-[#596579]">{v.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: Demographics */}
      {activeTab === 'demographics' && (
        <Card
          title="Patient Demographics"
          subtitle="Envelope-encrypted personally identifiable information"
          headerAction={
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Pencil className="w-3.5 h-3.5" />}
              onClick={() => setIsEditDemographicsOpen(true)}
            >
              Edit demographics
            </Button>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#DCE3EC]">
              <span className="text-[#596579] block">Full Name</span>
              <span className="text-[#172033] font-semibold text-sm">
                {patient.demographics.firstName} {patient.demographics.middleName || ''}{' '}
                {patient.demographics.lastName}
              </span>
            </div>

            <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#DCE3EC]">
              <span className="text-[#596579] block">Date of Birth / Age</span>
              <span className="text-[#172033] font-semibold font-mono text-sm">
                {patient.demographics.dateOfBirth} (38 yrs)
              </span>
            </div>

            <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#DCE3EC]">
              <span className="text-[#596579] block">Encrypted Phone Number</span>
              <span className="text-[#172033] font-semibold font-mono">
                {patient.demographics.phone}
              </span>
            </div>

            <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#DCE3EC]">
              <span className="text-[#596579] block">Primary Email</span>
              <span className="text-[#172033] font-semibold">{patient.demographics.email}</span>
            </div>

            <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#DCE3EC] md:col-span-2">
              <span className="text-[#596579] block">Residential Address</span>
              <span className="text-[#172033] font-semibold">
                {patient.demographics.addressLine1}, {patient.demographics.city},{' '}
                {patient.demographics.state} {patient.demographics.postalCode},{' '}
                {patient.demographics.country}
              </span>
            </div>

            <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#DCE3EC]">
              <span className="text-[#596579] block">Emergency Contact</span>
              <span className="text-[#172033] font-semibold">
                {patient.demographics.emergencyContactName} ({patient.demographics.emergencyContactRelationship})
              </span>
            </div>

            <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#DCE3EC]">
              <span className="text-[#596579] block">Emergency Phone</span>
              <span className="text-[#172033] font-semibold font-mono">
                {patient.demographics.emergencyContactPhone}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Tab 3: Encounters */}
      {activeTab === 'encounters' && (
        <Card
          title="Clinical Encounters History"
          headerAction={
            <Button
              variant="primary"
              size="sm"
              onClick={() => onNavigate(`/doctor/encounters/new?patientId=${patient.id}`)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              New encounter
            </Button>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-[#596579] font-semibold border-b border-[#DCE3EC]">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Encounter Type</th>
                  <th className="py-2.5 px-3">Clinician</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Version</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {encounters.map(enc => (
                  <tr key={enc.id} className="hover:bg-[#F8FAFC]">
                    <td className="py-3 px-3 font-mono font-medium">
                      {new Date(enc.encounterDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 font-semibold text-[#172033]">
                      {enc.encounterType.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-3 text-[#596579]">{enc.clinicianName}</td>
                    <td className="py-3 px-3">
                      <StatusBadge status={enc.encounterStatus} />
                    </td>
                    <td className="py-3 px-3 font-mono">v{enc.version}</td>
                    <td className="py-3 px-3 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onNavigate(`/doctor/encounters/${enc.id}`)}
                      >
                        Open Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 4: Vitals */}
      {activeTab === 'vitals' && (
        <Card
          title="Vital Signs & Clinical Observations"
          headerAction={
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddVitalOpen(true)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Record observation
            </Button>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-[#596579] font-semibold border-b border-[#DCE3EC]">
                <tr>
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Measurement</th>
                  <th className="py-2.5 px-3">Recorded Value</th>
                  <th className="py-2.5 px-3">Reference Range</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {vitals.map(v => (
                  <tr key={v.id} className="hover:bg-[#F8FAFC]">
                    <td className="py-3 px-3 font-mono text-[#596579]">
                      {new Date(v.recordedAt).toLocaleString([], {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="py-3 px-3 font-semibold text-[#172033]">
                      {v.type.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-3 font-bold text-[#172033] font-mono">
                      {v.value} {v.unit}
                    </td>
                    <td className="py-3 px-3 text-[#596579] font-mono">{v.referenceRange || '—'}</td>
                    <td className="py-3 px-3">
                      <StatusBadge status={v.status} />
                    </td>
                    <td className="py-3 px-3 text-[#596579]">{v.recordedByName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 8: Lab Results */}
      {activeTab === 'lab-results' && (
        <div className="space-y-4">
          {labResults.map(rep => (
            <Card key={rep.id} title={rep.testName} subtitle={`Reported: ${new Date(rep.reportedDate).toLocaleDateString()} · Facility: ${rep.performingFacility}`}>
              <div className="space-y-3">
                <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#DCE3EC] text-xs">
                  <span className="font-semibold text-[#172033] block mb-0.5">Clinical Summary:</span>
                  <span className="text-[#596579]">{rep.resultSummary}</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAFC] text-[#596579] border-b border-[#DCE3EC]">
                      <tr>
                        <th className="py-2 px-3">Analyte / Component</th>
                        <th className="py-2 px-3">Value</th>
                        <th className="py-2 px-3">Units</th>
                        <th className="py-2 px-3">Reference Range</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      {rep.values.map(val => (
                        <tr key={val.test}>
                          <td className="py-2 px-3 font-medium text-[#172033]">{val.test}</td>
                          <td className="py-2 px-3 font-bold font-mono text-[#172033]">{val.result}</td>
                          <td className="py-2 px-3 text-[#596579]">{val.unit}</td>
                          <td className="py-2 px-3 font-mono text-[#596579]">{val.range}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Tab 9: Documents */}
      {activeTab === 'documents' && (
        <Card
          title="Clinical Documents"
          subtitle="Encrypted object storage attachments with SHA-256 hash validation"
          headerAction={
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsUploadDocOpen(true)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Upload document
            </Button>
          }
        >
          <div className="space-y-3">
            {documents.map(d => (
              <div
                key={d.id}
                className="p-4 rounded-xl border border-[#DCE3EC] bg-white flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-[#172033]">{d.fileName}</div>
                  <div className="text-[11px] text-[#596579] mt-0.5">
                    {d.documentType.replace(/_/g, ' ')} · {(d.fileSize / 1024).toFixed(1)} KB ·
                    Uploaded {new Date(d.uploadedAt).toLocaleDateString()}
                  </div>
                  <div className="text-[10px] text-[#64748B] font-mono mt-0.5 truncate max-w-md">
                    Hash: {d.contentHash}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    toast.info('Document Decrypted & Verified', d.previewContent || 'Preview active.');
                  }}
                >
                  View Preview
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tab 11: Consents */}
      {activeTab === 'consents' && (
        <Card title="Patient Consents" subtitle="Authorized processing scopes and disclosures">
          <div className="space-y-3">
            {consents.map(c => (
              <div
                key={c.id}
                className="p-4 rounded-xl border border-[#DCE3EC] bg-white flex items-start justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-[#172033]">
                    {c.purpose.replace(/_/g, ' ')}
                  </div>
                  <div className="text-[11px] text-[#596579] mt-0.5">
                    Recipient: {c.recipientOrganization}
                  </div>
                  <div className="text-[11px] text-[#596579]">
                    Scope: {c.dataScope.replace(/_/g, ' ')} · Effective: {c.effectiveFrom}
                  </div>
                </div>
                <StatusBadge status={c.status} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Modals */}
      {/* 1. Edit Demographics Modal */}
      <Modal
        isOpen={isEditDemographicsOpen}
        onClose={() => setIsEditDemographicsOpen(false)}
        title="Edit Patient Demographics"
        subtitle="Generates Type 2 SCD Record Version"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsEditDemographicsOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveDemographics}>
              Save and increment version
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label="Phone Number"
            value={demoForm.phone}
            onChange={e => setDemoForm({ ...demoForm, phone: e.target.value })}
          />
          <Input
            label="Street Address"
            value={demoForm.addressLine1}
            onChange={e => setDemoForm({ ...demoForm, addressLine1: e.target.value })}
          />
          <Input
            label="City"
            value={demoForm.city}
            onChange={e => setDemoForm({ ...demoForm, city: e.target.value })}
          />
          <Input
            label="Emergency Contact Name"
            value={demoForm.emergencyContactName}
            onChange={e => setDemoForm({ ...demoForm, emergencyContactName: e.target.value })}
          />
          <Input
            label="Emergency Contact Phone"
            value={demoForm.emergencyContactPhone}
            onChange={e => setDemoForm({ ...demoForm, emergencyContactPhone: e.target.value })}
          />
        </div>
      </Modal>

      {/* 2. Add Vital Modal */}
      <Modal
        isOpen={isAddVitalOpen}
        onClose={() => setIsAddVitalOpen(false)}
        title="Record Vital Observation"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsAddVitalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddVital}>
              Record Observation
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Select
            label="Observation Type"
            value={vitalForm.type}
            onChange={e => setVitalForm({ ...vitalForm, type: e.target.value as any })}
            options={[
              { value: 'BLOOD_PRESSURE', label: 'Blood Pressure (mmHg)' },
              { value: 'HEART_RATE', label: 'Heart Rate (bpm)' },
              { value: 'TEMPERATURE', label: 'Body Temperature (°F)' },
              { value: 'OXYGEN_SATURATION', label: 'Oxygen Saturation (%)' },
              { value: 'BODY_WEIGHT', label: 'Body Weight (kg)' },
            ]}
          />
          <Input
            label="Measurement Value"
            required
            value={vitalForm.value}
            onChange={e => setVitalForm({ ...vitalForm, value: e.target.value })}
            placeholder="e.g. 120/80 or 98.6"
          />
          <Input
            label="Unit"
            value={vitalForm.unit}
            onChange={e => setVitalForm({ ...vitalForm, unit: e.target.value })}
          />
        </div>
      </Modal>

      {/* 3. Add Condition Modal */}
      <Modal
        isOpen={isAddConditionOpen}
        onClose={() => setIsAddConditionOpen(false)}
        title="Add Clinical Condition"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsAddConditionOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddCondition}>
              Add Condition
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label="ICD-10 Code"
            required
            value={condForm.code}
            onChange={e => setCondForm({ ...condForm, code: e.target.value })}
            placeholder="e.g., E11.9"
          />
          <Input
            label="Display Name"
            required
            value={condForm.displayName}
            onChange={e => setCondForm({ ...condForm, displayName: e.target.value })}
            placeholder="e.g., Type 2 Diabetes"
          />
          <Input
            label="Onset Date"
            type="date"
            value={condForm.onsetDate}
            onChange={e => setCondForm({ ...condForm, onsetDate: e.target.value })}
          />
          <Textarea
            label="Physician Notes"
            value={condForm.notes}
            onChange={e => setCondForm({ ...condForm, notes: e.target.value })}
          />
        </div>
      </Modal>

      {/* 4. Add Medication Modal */}
      <Modal
        isOpen={isAddMedOpen}
        onClose={() => setIsAddMedOpen(false)}
        title="Prescribe Medication"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsAddMedOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddMedication}>
              Prescribe Medication
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label="Medication Name"
            required
            value={medForm.name}
            onChange={e => setMedForm({ ...medForm, name: e.target.value })}
            placeholder="e.g., Atorvastatin"
          />
          <Input
            label="Strength"
            required
            value={medForm.strength}
            onChange={e => setMedForm({ ...medForm, strength: e.target.value })}
            placeholder="e.g., 20 mg"
          />
          <Input
            label="Dosage Instructions"
            required
            value={medForm.dosageInstructions}
            onChange={e => setMedForm({ ...medForm, dosageInstructions: e.target.value })}
            placeholder="e.g., Take 1 tablet nightly"
          />
          <Select
            label="Administration Route"
            value={medForm.route}
            onChange={e => setMedForm({ ...medForm, route: e.target.value as any })}
            options={[
              { value: 'ORAL', label: 'Oral' },
              { value: 'INTRAVENOUS', label: 'Intravenous' },
              { value: 'INHALATION', label: 'Inhalation' },
              { value: 'TOPICAL', label: 'Topical' },
            ]}
          />
        </div>
      </Modal>

      {/* 5. Add Allergy Modal */}
      <Modal
        isOpen={isAddAllergyOpen}
        onClose={() => setIsAddAllergyOpen(false)}
        title="Record Substance Allergy"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsAddAllergyOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddAllergy}>
              Save Allergy
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label="Substance"
            required
            value={allergyForm.substance}
            onChange={e => setAllergyForm({ ...allergyForm, substance: e.target.value })}
            placeholder="e.g., Peanuts, Sulfa"
          />
          <Input
            label="Reaction Manifestation"
            required
            value={allergyForm.reaction}
            onChange={e => setAllergyForm({ ...allergyForm, reaction: e.target.value })}
            placeholder="e.g., Facial hives, bronchospasm"
          />
          <Select
            label="Severity"
            value={allergyForm.severity}
            onChange={e => setAllergyForm({ ...allergyForm, severity: e.target.value as any })}
            options={[
              { value: 'MILD', label: 'Mild' },
              { value: 'MODERATE', label: 'Moderate' },
              { value: 'SEVERE_ANAPHYLAXIS', label: 'Severe / Anaphylaxis' },
            ]}
          />
        </div>
      </Modal>

      {/* 6. Upload Document Modal */}
      <Modal
        isOpen={isUploadDocOpen}
        onClose={() => setIsUploadDocOpen(false)}
        title="Upload Clinical Document"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsUploadDocOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleUploadDoc}>
              Upload Document
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label="File Name"
            required
            value={docForm.fileName}
            onChange={e => setDocForm({ ...docForm, fileName: e.target.value })}
          />
          <Select
            label="Document Classification"
            value={docForm.documentType}
            onChange={e => setDocForm({ ...docForm, documentType: e.target.value as any })}
            options={[
              { value: 'DISCHARGE_SUMMARY', label: 'Discharge Summary' },
              { value: 'OPERATIVE_REPORT', label: 'Operative Report' },
              { value: 'LAB_PANEL', label: 'Laboratory Panel' },
              { value: 'INSURANCE_EVIDENCE', label: 'Insurance Claim Evidence' },
            ]}
          />
          <Textarea
            label="Document Description / Abstract"
            rows={3}
            value={docForm.previewContent}
            onChange={e => setDocForm({ ...docForm, previewContent: e.target.value })}
          />
        </div>
      </Modal>

      {/* 7. Schedule Appointment Modal */}
      <Modal
        isOpen={isScheduleAptOpen}
        onClose={() => setIsScheduleAptOpen(false)}
        title="Schedule Clinical Appointment"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsScheduleAptOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleScheduleApt}>
              Schedule Appointment
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Select
            label="Visit Modality"
            value={aptForm.modality}
            onChange={e => setAptForm({ ...aptForm, modality: e.target.value as any })}
            options={[
              { value: 'IN_PERSON', label: 'In-Person Ambulatory Clinic' },
              { value: 'TELEHEALTH', label: 'Encrypted Telehealth Session' },
            ]}
          />
          <Select
            label="Appointment Type"
            value={aptForm.appointmentType}
            onChange={e => setAptForm({ ...aptForm, appointmentType: e.target.value as any })}
            options={[
              { value: 'ROUTINE_CHECKUP', label: 'Routine Ambulatory Checkup' },
              { value: 'SPECIALIST_CONSULT', label: 'Specialist Consultation' },
              { value: 'LAB_FOLLOWUP', label: 'Lab Results Review' },
            ]}
          />
          <Input
            label="Scheduled Date and Time (ISO)"
            type="text"
            value={aptForm.scheduledAt}
            onChange={e => setAptForm({ ...aptForm, scheduledAt: e.target.value })}
          />
          <Input
            label="Clinic Room / Location"
            value={aptForm.location}
            onChange={e => setAptForm({ ...aptForm, location: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  );
};
