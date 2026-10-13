import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  FileText,
  Activity,
  Pill,
  ShieldCheck,
  History,
  Lock,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  FolderOpen,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/ui/StatusBadge';
import {
  Patient,
  Appointment,
  Medication,
  DiagnosticReport,
  PatientConsent,
  AuditEvent,
} from '../../types/ehr';
import { api } from '../../services/api';
import { store } from '../../services/store';
import { useToast } from '../../components/ui/Toast';

export const PatientDashboard: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [reports, setReports] = useState<DiagnosticReport[]>([]);
  const [consents, setConsents] = useState<PatientConsent[]>([]);
  const toast = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const p = await api.getPatientById('pat-101');
      setPatient(p);
      const [apts, meds, reps, cns] = await Promise.all([
        api.getAppointments(),
        api.getMedicationsByPatient('pat-101'),
        api.getLabResultsByPatient('pat-101'),
        api.getConsentsByPatient('pat-101'),
      ]);
      setAppointments(apts);
      setMedications(meds);
      setReports(reps);
      setConsents(cns);
    } catch (err: any) {
      toast.error('Failed to load patient dashboard', err.message);
    }
  };

  const upcomingApt = appointments.find(a => a.status === 'SCHEDULED');

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-[#DCE3EC] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#142238] tracking-tight">
              My health dashboard
            </h1>
            <p className="text-xs text-[#596579] mt-1">
              Your health information, organized in one secure place · Welcome back, Alex
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onNavigate('/patient/access-history')}
            leftIcon={<History className="w-4 h-4" />}
          >
            Who accessed my records
          </Button>
        </div>
      </div>

      {/* Summary KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-[#DCE3EC] shadow-2xs">
          <div className="text-xs text-[#596579]">Upcoming appointments</div>
          <div className="text-2xl font-bold text-[#172033] mt-2 font-mono tabular-nums">
            {appointments.filter(a => a.status === 'SCHEDULED').length}
          </div>
          <div className="text-[11px] text-[#0F766E] mt-1">Next: Today at 11:00 AM</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#DCE3EC] shadow-2xs">
          <div className="text-xs text-[#596579]">Available reports</div>
          <div className="text-2xl font-bold text-[#172033] mt-2 font-mono tabular-nums">
            {reports.length}
          </div>
          <div className="text-[11px] text-[#15803D] mt-1">HbA1c & CMP-14 finalized</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#DCE3EC] shadow-2xs">
          <div className="text-xs text-[#596579]">Current medications</div>
          <div className="text-2xl font-bold text-[#172033] mt-2 font-mono tabular-nums">
            {medications.filter(m => m.status === 'ACTIVE').length}
          </div>
          <div className="text-[11px] text-[#596579] mt-1">Active daily regimens</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#DCE3EC] shadow-2xs">
          <div className="text-xs text-[#596579]">Active consent directives</div>
          <div className="text-2xl font-bold text-[#172033] mt-2 font-mono tabular-nums">
            {consents.filter(c => c.status === 'ACTIVE').length}
          </div>
          <div className="text-[11px] text-[#2457C5] mt-1">Direct care & Claims verified</div>
        </div>
      </div>

      {/* Main sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming Appointment Spotlight */}
          {upcomingApt && (
            <Card title="Upcoming Appointment">
              <div className="p-4 rounded-xl bg-[#FAFCFF] border border-[#BFDBFE] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#172033]">
                      {upcomingApt.appointmentType.replace(/_/g, ' ')}
                    </span>
                    <StatusBadge status={upcomingApt.status} />
                  </div>
                  <div className="text-xs text-[#596579] mt-1">
                    Clinician: {upcomingApt.clinicianName}
                  </div>
                  <div className="text-xs text-[#596579]">
                    Time: {new Date(upcomingApt.scheduledAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                  <div className="text-xs text-[#596579]">
                    Location: {upcomingApt.location}
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onNavigate('/patient/appointments')}
                >
                  Manage visit
                </Button>
              </div>
            </Card>
          )}

          {/* Recent Lab Results */}
          <Card
            title="Recent Diagnostic Reports"
            subtitle="Authoritative laboratory results from certified diagnostic centers"
            headerAction={
              <Button variant="tertiary" size="sm" onClick={() => onNavigate('/patient/records')}>
                All records
              </Button>
            }
          >
            <div className="space-y-3">
              {reports.map(r => (
                <div
                  key={r.id}
                  className="p-3.5 rounded-xl border border-[#DCE3EC] hover:bg-[#F8FAFC] transition-colors flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-[#172033]">{r.testName}</div>
                    <div className="text-[11px] text-[#596579] mt-0.5">
                      Reported {new Date(r.reportedDate).toLocaleDateString()} · {r.performingFacility}
                    </div>
                  </div>
                  <StatusBadge status={r.interpretation} />
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Quick Health Records Hub */}
        <div>
          <Card title="My Health Records">
            <div className="space-y-2">
              {[
                { title: 'Clinical Encounters', desc: 'Consultations & physician visit notes' },
                { title: 'Vital Signs', desc: 'Blood pressure, weight, glucose' },
                { title: 'Recorded Conditions', desc: 'Chronic & active health conditions' },
                { title: 'Medications', desc: 'Active prescriptions and dosage instructions' },
                { title: 'Allergies', desc: 'Documented substances & reaction history' },
                { title: 'Clinical Documents', desc: 'Discharge summaries & attachments' },
              ].map(item => (
                <button
                  key={item.title}
                  onClick={() => onNavigate('/patient/records')}
                  className="w-full text-left p-3 rounded-lg border border-[#DCE3EC] hover:border-[#2457C5] hover:bg-[#F8FAFC] transition-colors cursor-pointer group flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-semibold text-[#172033] group-hover:text-[#2457C5]">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-[#596579]">{item.desc}</div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[#94A3B8] group-hover:text-[#2457C5]" />
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export const PatientRecordsHub: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#142238] tracking-tight">My health records</h1>
        <p className="text-xs text-[#596579] mt-1">
          Review your verified clinical history, clinician-authored diagnoses, test results, and medications.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { title: 'Demographics & Profile', path: '/patient/settings', icon: FileText, desc: 'Verified identity and emergency contacts' },
          { title: 'Clinical Encounters', path: '/doctor/patients/pat-101', icon: FileCheck2, desc: 'Doctor consultations and SOAP assessments' },
          { title: 'Vital Signs', path: '/doctor/patients/pat-101', icon: Activity, desc: 'Blood pressure, heart rate, and weight trends' },
          { title: 'Conditions & Diagnoses', path: '/doctor/patients/pat-101', icon: Activity, desc: 'Physician-documented ICD-10 medical conditions' },
          { title: 'Medications List', path: '/doctor/patients/pat-101', icon: Pill, desc: 'Active prescriptions and dosage schedules' },
          { title: 'Laboratory Results', path: '/doctor/patients/pat-101', icon: FolderOpen, desc: 'HbA1c, CMP-14, and pathology reports' },
          { title: 'Clinical Documents', path: '/doctor/patients/pat-101', icon: FolderOpen, desc: 'Discharge summaries and hospital records' },
          { title: 'Care Plans', path: '/doctor/patients/pat-101', icon: CheckCircle2, desc: 'Cardiovascular and diabetes wellness targets' },
          { title: 'Consents & Privacy', path: '/patient/consents', icon: ShieldCheck, desc: 'Manage authorizations for third parties' },
        ].map(cat => {
          const Icon = cat.icon;
          return (
            <div
              key={cat.title}
              onClick={() => onNavigate(cat.path)}
              className="p-5 bg-white rounded-xl border border-[#DCE3EC] hover:border-[#2457C5] shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-lg bg-[#EAF0FF] text-[#2457C5] flex items-center justify-center mb-3">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-[#172033] group-hover:text-[#2457C5] transition-colors">
                {cat.title}
              </h3>
              <p className="text-xs text-[#596579] mt-1">{cat.desc}</p>
              <div className="mt-4 flex items-center text-xs text-[#2457C5] font-semibold">
                <span>View records</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const PatientAppointments: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activeTab, setActiveTab] = useState<'UPCOMING' | 'PAST' | 'CANCELLED'>('UPCOMING');
  const [cancellingAptId, setCancellingAptId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('Personal schedule conflict');
  const toast = useToast();

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    const data = await api.getAppointments();
    setAppointments(data);
  };

  const handleCancel = async () => {
    if (!cancellingAptId) return;
    try {
      await api.cancelAppointment(cancellingAptId, cancelReason);
      toast.success('Appointment cancelled', 'Audit record generated.');
      setCancellingAptId(null);
      loadAppointments();
    } catch (err: any) {
      toast.error('Failed to cancel appointment', err.message);
    }
  };

  const filtered = appointments.filter(a => {
    if (activeTab === 'UPCOMING') return a.status === 'SCHEDULED' || a.status === 'CHECKED_IN';
    if (activeTab === 'PAST') return a.status === 'COMPLETED';
    if (activeTab === 'CANCELLED') return a.status === 'CANCELLED';
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#142238] tracking-tight">My appointments</h1>
          <p className="text-xs text-[#596579] mt-1">Review your upcoming and past medical visits.</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-[#DCE3EC] pb-2 text-xs">
        {(['UPCOMING', 'PAST', 'CANCELLED'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium rounded-lg transition-colors cursor-pointer ${
              activeTab === tab
                ? 'bg-[#2457C5] text-white shadow-2xs font-semibold'
                : 'text-[#596579] hover:bg-[#F1F5F9]'
            }`}
          >
            {tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#596579]">
            No {activeTab.toLowerCase()} appointments found.
          </div>
        ) : (
          filtered.map(apt => (
            <div
              key={apt.id}
              className="p-5 bg-white rounded-xl border border-[#DCE3EC] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#172033]">
                    {apt.appointmentType.replace(/_/g, ' ')}
                  </span>
                  <StatusBadge status={apt.status} />
                </div>
                <div className="text-xs text-[#596579] mt-1">
                  Clinician: {apt.clinicianName} · Modality: {apt.modality}
                </div>
                <div className="text-xs font-mono text-[#596579]">
                  {new Date(apt.scheduledAt).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })}
                </div>
                <div className="text-xs text-[#596579] mt-0.5">{apt.location}</div>
                {apt.cancellationReason && (
                  <div className="text-xs text-[#B91C1C] mt-1 font-medium">
                    Reason: {apt.cancellationReason}
                  </div>
                )}
              </div>

              {apt.status === 'SCHEDULED' && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setCancellingAptId(apt.id)}
                >
                  Cancel appointment
                </Button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={Boolean(cancellingAptId)}
        onClose={() => setCancellingAptId(null)}
        title="Confirm Cancellation"
        subtitle="This operation will be recorded in the patient access history"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancellingAptId(null)}>
              Keep appointment
            </Button>
            <Button variant="danger" onClick={handleCancel}>
              Confirm cancellation
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-[#596579]">
            Are you sure you want to cancel this appointment? Please state a reason for the clinical schedule:
          </p>
          <input
            type="text"
            className="w-full h-10 px-3 text-xs bg-white border border-[#DCE3EC] rounded-lg"
            value={cancelReason}
            onChange={e => setCancelReason(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
};

export const PatientConsents: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const [consents, setConsents] = useState<PatientConsent[]>([]);
  const toast = useToast();

  useEffect(() => {
    loadConsents();
  }, []);

  const loadConsents = async () => {
    const data = await api.getConsentsByPatient('pat-101');
    setConsents(data);
  };

  const handleToggleConsent = async (consent: PatientConsent) => {
    const newStatus = consent.status === 'ACTIVE' ? 'REVOKED' : 'ACTIVE';
    try {
      await api.updateConsent(
        consent.id,
        newStatus,
        `Patient portal user requested ${newStatus.toLowerCase()} status`
      );
      toast.success(
        `Consent ${newStatus === 'ACTIVE' ? 'activated' : 'revoked'}`,
        'Prospective effect recorded. Historical disclosures remain logged.'
      );
      loadConsents();
    } catch (err: any) {
      toast.error('Failed to update consent', err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#142238] tracking-tight">Consents & privacy</h1>
        <p className="text-xs text-[#596579] mt-1">
          Review and manage applicable permissions for your health information disclosures.
        </p>
      </div>

      <div className="space-y-4">
        {consents.map(c => (
          <Card key={c.id}>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#172033]">
                    {c.purpose.replace(/_/g, ' ')}
                  </span>
                  <StatusBadge status={c.status} />
                  <span className="text-[11px] font-mono text-[#596579] bg-[#F1F5F9] px-2 py-0.5 rounded">
                    v{c.version}
                  </span>
                </div>
                <div className="text-xs text-[#596579] mt-1">
                  Recipient Organization: <strong>{c.recipientOrganization}</strong>
                </div>
                <div className="text-xs text-[#596579]">
                  Data Scope: <strong>{c.dataScope.replace(/_/g, ' ')}</strong>
                </div>
                <div className="text-xs text-[#596579]">
                  Effective Date: {c.effectiveFrom} · Source: {c.recordedSource}
                </div>
              </div>

              <Button
                variant={c.status === 'ACTIVE' ? 'danger' : 'primary'}
                size="sm"
                onClick={() => handleToggleConsent(c)}
              >
                {c.status === 'ACTIVE' ? 'Revoke consent' : 'Reactivate consent'}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export const PatientAccessHistory: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const events = store.auditEvents.filter(
    e => e.resourceReference.includes('pat-101') || e.resourceReference.includes('Alex Morgan') || e.resourceReference.includes('PAT-101')
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#142238] tracking-tight">Who accessed my records</h1>
        <p className="text-xs text-[#596579] mt-1">
          Review available information about access and clinical views of your health records.
        </p>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] text-[#596579] font-semibold border-b border-[#DCE3EC]">
              <tr>
                <th className="py-2.5 px-3">Date & Time</th>
                <th className="py-2.5 px-3">Authorized Actor</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Purpose</th>
                <th className="py-2.5 px-3">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {events.map(e => (
                <tr key={e.id} className="hover:bg-[#F8FAFC]">
                  <td className="py-3 px-3 font-mono text-[#596579]">
                    {new Date(e.occurredAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="py-3 px-3 font-semibold text-[#172033]">{e.actorName}</td>
                  <td className="py-3 px-3 capitalize text-[#596579]">{e.actorRole.toLowerCase()}</td>
                  <td className="py-3 px-3 font-mono">{e.action}</td>
                  <td className="py-3 px-3 text-[#596579]">{e.purpose || 'Direct clinical care'}</td>
                  <td className="py-3 px-3">
                    <StatusBadge status={e.outcome} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
