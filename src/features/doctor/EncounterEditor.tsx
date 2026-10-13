import React, { useState, useEffect } from 'react';
import { Stethoscope, ArrowLeft, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { ClinicalEncounter } from '../../types/ehr';
import { api } from '../../services/api';
import { store } from '../../services/store';
import { useToast } from '../../components/ui/Toast';

interface EncounterEditorProps {
  encounterId?: string;
  preselectedPatientId?: string;
  onNavigate: (path: string) => void;
}

export const EncounterEditor: React.FC<EncounterEditorProps> = ({
  encounterId,
  preselectedPatientId,
  onNavigate,
}) => {
  const [existingEncounter, setExistingEncounter] = useState<ClinicalEncounter | null>(null);
  const [patientId, setPatientId] = useState(preselectedPatientId || store.patients[0]?.id || 'pat-101');
  const [encounterType, setEncounterType] = useState<ClinicalEncounter['encounterType']>('ROUTINE_FOLLOWUP');
  const [reasonForVisit, setReasonForVisit] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');
  const [diagnoses, setDiagnoses] = useState('I10 - Essential hypertension');
  const [isFinalized, setIsFinalized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const isEditMode = Boolean(encounterId);

  useEffect(() => {
    if (encounterId) {
      loadEncounter(encounterId);
    }
  }, [encounterId]);

  const loadEncounter = async (id: string) => {
    try {
      const enc = await api.getEncounterById(id);
      setExistingEncounter(enc);
      setPatientId(enc.patientId);
      setEncounterType(enc.encounterType);
      setReasonForVisit(enc.reasonForVisit);
      setClinicalNotes(enc.clinicalNotes);
      setAssessment(enc.assessment);
      setPlan(enc.plan);
      setDiagnoses(enc.diagnoses.join(', '));
      setIsFinalized(enc.encounterStatus === 'FINALIZED');
    } catch (err: any) {
      toast.error('Failed to load encounter', err.message);
    }
  };

  const handleSave = async (finalize: boolean) => {
    setIsLoading(true);
    try {
      if (isEditMode && existingEncounter) {
        // Concurrency control with expectedVersion
        const updated = await api.updateEncounter(existingEncounter.id, existingEncounter.version, {
          clinicalNotes,
          assessment,
          plan,
          diagnoses: diagnoses.split(',').map(s => s.trim()).filter(Boolean),
          isFinalized: finalize,
        });
        toast.success(
          finalize ? 'Encounter finalized' : 'Encounter changes saved',
          `Incremented to version v${updated.version}`
        );
        onNavigate(`/doctor/encounters/${updated.id}`);
      } else {
        const created = await api.createEncounter({
          patientId,
          encounterType,
          reasonForVisit,
          clinicalNotes,
          assessment,
          plan,
          diagnoses: diagnoses.split(',').map(s => s.trim()).filter(Boolean),
          isFinalized: finalize,
        });
        toast.success(
          finalize ? 'Encounter finalized' : 'Encounter draft saved',
          `Created record #${created.id}`
        );
        onNavigate(`/doctor/encounters/${created.id}`);
      }
    } catch (err: any) {
      toast.error('Error saving encounter', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedPatient = store.patients.find(p => p.id === patientId);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-[#596579]">
          <button
            onClick={() => onNavigate('/doctor/encounters')}
            className="hover:text-[#172033] flex items-center gap-1 cursor-pointer font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Encounters
          </button>
          <span>/</span>
          <span className="text-[#172033] font-semibold">
            {isEditMode ? `Edit Encounter #${encounterId}` : 'New Encounter'}
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#142238] tracking-tight">
            {isEditMode ? 'Edit clinical encounter' : 'New clinical encounter'}
          </h1>
          <p className="text-xs text-[#596579] mt-1">
            {isEditMode
              ? `Editing version v${existingEncounter?.version || 1} with optimistic concurrency control.`
              : 'Record a new clinical consultation for an authorized assigned patient.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={isLoading}
            onClick={() => handleSave(false)}
          >
            Save draft
          </Button>
          <Button
            variant="primary"
            size="sm"
            isLoading={isLoading}
            onClick={() => handleSave(true)}
            leftIcon={<ShieldCheck className="w-4 h-4" />}
          >
            Finalize & sign
          </Button>
        </div>
      </div>

      <Card title="Patient & Encounter Metadata">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {!isEditMode ? (
            <Select
              label="Assigned Patient"
              value={patientId}
              onChange={e => setPatientId(e.target.value)}
              options={store.patients.map(p => ({
                value: p.id,
                label: `${p.demographics.firstName} ${p.demographics.lastName} (${p.medicalRecordNumber})`,
              }))}
            />
          ) : (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#172033]">Patient Chart</label>
              <div className="p-2.5 bg-[#F8FAFC] border border-[#DCE3EC] rounded-lg text-xs font-semibold text-[#172033]">
                {selectedPatient?.demographics.firstName} {selectedPatient?.demographics.lastName} (
                {selectedPatient?.medicalRecordNumber})
              </div>
            </div>
          )}

          <Select
            label="Encounter Modality / Type"
            value={encounterType}
            onChange={e => setEncounterType(e.target.value as any)}
            options={[
              { value: 'ROUTINE_FOLLOWUP', label: 'Routine Ambulatory Follow-up' },
              { value: 'OUTPATIENT_CONSULT', label: 'Comprehensive Outpatient Consultation' },
              { value: 'EMERGENCY_EVALUATION', label: 'Emergency Room Evaluation' },
              { value: 'TELEHEALTH_SESSION', label: 'Encrypted Telehealth Session' },
              { value: 'SURGICAL_PREOP', label: 'Surgical Pre-Operative Assessment' },
            ]}
          />

          <div className="md:col-span-2">
            <Input
              label="Chief Complaint / Reason for Visit"
              required
              value={reasonForVisit}
              onChange={e => setReasonForVisit(e.target.value)}
              placeholder="e.g. Quarterly management of hypertension and medication evaluation"
            />
          </div>
        </div>
      </Card>

      <Card title="Clinical Documentation (SOAP Notes)" subtitle="Encrypted with AES-256-GCM envelope encryption">
        <div className="space-y-4">
          <Textarea
            label="Subjective & Objective Clinical Notes"
            required
            rows={5}
            value={clinicalNotes}
            onChange={e => setClinicalNotes(e.target.value)}
            placeholder="Document patient history, review of systems, physical examination, and vital sign correlations..."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Textarea
              label="Clinical Assessment (Diagnoses & Findings)"
              required
              rows={3}
              value={assessment}
              onChange={e => setAssessment(e.target.value)}
              placeholder="Document clinician assessment, differential, and primary conclusions..."
            />

            <Textarea
              label="Plan & Follow-up Instructions"
              required
              rows={3}
              value={plan}
              onChange={e => setPlan(e.target.value)}
              placeholder="Orders, medications, patient education, referrals, and return interval..."
            />
          </div>

          <Input
            label="ICD-10 Diagnostic Codes (Comma-separated)"
            value={diagnoses}
            onChange={e => setDiagnoses(e.target.value)}
            placeholder="e.g. I10, E11.9, Z00.00"
          />
        </div>
      </Card>
    </div>
  );
};
