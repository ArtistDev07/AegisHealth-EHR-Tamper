import React, { useState, useEffect } from 'react';
import {
  Users,
  CalendarDays,
  FileText,
  Clock,
  Plus,
  ArrowRight,
  ShieldAlert,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  ChevronRight,
  Pill,
  Activity,
  HeartPulse,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Patient, ClinicalEncounter, Appointment, ClinicalTask } from '../../types/ehr';
import { api } from '../../services/api';
import { store } from '../../services/store';
import { useToast } from '../../components/ui/Toast';

export const DoctorDashboard: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [encounters, setEncounters] = useState<ClinicalEncounter[]>([]);
  const [tasks, setTasks] = useState<ClinicalTask[]>([]);
  const toast = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const p = await api.getPatients();
      const a = await api.getAppointments();
      const e = await api.getAllEncounters();
      const t = await api.getTasks();
      setPatients(p);
      setAppointments(a);
      setEncounters(e);
      setTasks(t);
    } catch (err: any) {
      toast.error('Failed to load dashboard', err.message);
    }
  };

  const todayAppointments = appointments.filter(a => a.scheduledAt.startsWith('2026-10-09'));

  return (
    <div className="space-y-6">
      {/* Top Banner / Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#142238] tracking-tight">Doctor dashboard</h1>
          <p className="text-xs text-[#596579] mt-1">
            Your clinical workspace for today · Friday, October 9, 2026
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onNavigate('/doctor/patients')}
            leftIcon={<Users className="w-4 h-4" />}
          >
            Find patient
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigate('/doctor/encounters/new')}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            New encounter
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-[#DCE3EC] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#596579]">
            <span>Assigned patients</span>
            <Users className="w-4 h-4 text-[#2457C5]" />
          </div>
          <div className="text-2xl font-bold text-[#172033] mt-2 font-mono tabular-nums">
            {patients.length}
          </div>
          <div className="text-[11px] text-[#15803D] mt-1">Active care assignments</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#DCE3EC] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#596579]">
            <span>Appointments today</span>
            <CalendarDays className="w-4 h-4 text-[#0F766E]" />
          </div>
          <div className="text-2xl font-bold text-[#172033] mt-2 font-mono tabular-nums">
            {todayAppointments.length}
          </div>
          <div className="text-[11px] text-[#596579] mt-1">Next: 11:00 AM (Alex Morgan)</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#DCE3EC] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#596579]">
            <span>Open encounters</span>
            <FileText className="w-4 h-4 text-[#B45309]" />
          </div>
          <div className="text-2xl font-bold text-[#172033] mt-2 font-mono tabular-nums">
            {encounters.filter(e => e.encounterStatus === 'DRAFT').length || 1}
          </div>
          <div className="text-[11px] text-[#B45309] mt-1">Pending clinical sign-off</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#DCE3EC] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#596579]">
            <span>Pending clinical tasks</span>
            <CheckCircle2 className="w-4 h-4 text-[#7C3AED]" />
          </div>
          <div className="text-2xl font-bold text-[#172033] mt-2 font-mono tabular-nums">
            {tasks.filter(t => t.status === 'PENDING').length}
          </div>
          <div className="text-[11px] text-[#596579] mt-1">Lab reviews & refills</div>
        </div>
      </div>

      {/* Main Grid: Today's Appointments & Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Appointments Section */}
        <div className="lg:col-span-2">
          <Card
            title="Today's appointments"
            subtitle="Scheduled visits for outpatient and telehealth consultation"
            headerAction={
              <Button
                variant="tertiary"
                size="sm"
                onClick={() => onNavigate('/doctor/appointments')}
              >
                View all
              </Button>
            }
          >
            {todayAppointments.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#596579]">
                No appointments are scheduled for today.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] text-[#596579] font-semibold border-b border-[#DCE3EC]">
                    <tr>
                      <th className="py-2.5 px-3">Time</th>
                      <th className="py-2.5 px-3">Patient</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {todayAppointments.map(apt => (
                      <tr key={apt.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-3 px-3 font-mono font-medium text-[#172033]">
                          {new Date(apt.scheduledAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-3 font-semibold text-[#172033]">
                          {apt.patientName}
                        </td>
                        <td className="py-3 px-3 text-[#596579] capitalize">
                          {apt.appointmentType.replace(/_/g, ' ').toLowerCase()} ({apt.modality})
                        </td>
                        <td className="py-3 px-3">
                          <StatusBadge status={apt.status} />
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onNavigate(`/doctor/patients/${apt.patientId}`)}
                          >
                            Open chart
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Clinical Tasks Column */}
        <div>
          <Card
            title="Clinical tasks"
            subtitle="Prioritized actions requiring physician review"
            headerAction={
              <Button variant="tertiary" size="sm" onClick={() => onNavigate('/doctor/tasks')}>
                View all
              </Button>
            }
          >
            <div className="space-y-3">
              {tasks.slice(0, 3).map(t => (
                <div
                  key={t.id}
                  className="p-3 rounded-lg border border-[#DCE3EC] bg-[#FAFCFF] flex items-start justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          t.priority === 'HIGH' ? 'bg-[#B91C1C]' : 'bg-[#2457C5]'
                        }`}
                      />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#596579]">
                        {t.category.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-[#172033]">{t.title}</div>
                    <div className="text-[11px] text-[#596579] mt-0.5">{t.patientName}</div>
                  </div>
                  <Button
                    size="sm"
                    variant={t.status === 'COMPLETED' ? 'secondary' : 'primary'}
                    onClick={async () => {
                      await api.completeTask(t.id);
                      loadData();
                      toast.success('Task completed');
                    }}
                  >
                    {t.status === 'COMPLETED' ? 'Done' : 'Sign'}
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Assigned Patients Quick Access */}
      <Card
        title="Assigned patients"
        subtitle="Quick access to active clinical patient records under your care"
        headerAction={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onNavigate('/doctor/patients')}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            All patients
          </Button>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {patients.map(p => (
            <div
              key={p.id}
              onClick={() => onNavigate(`/doctor/patients/${p.id}`)}
              className="p-4 rounded-xl border border-[#DCE3EC] hover:border-[#2457C5] bg-white transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-medium text-[#2457C5]">
                  {p.medicalRecordNumber}
                </span>
                <StatusBadge status={p.recordStatus} />
              </div>
              <h4 className="text-sm font-semibold text-[#172033] group-hover:text-[#2457C5] transition-colors">
                {p.demographics.firstName} {p.demographics.lastName}
              </h4>
              <p className="text-xs text-[#596579] mt-0.5">
                DOB: {p.demographics.dateOfBirth} · {p.demographics.gender}
              </p>
              <div className="mt-3 pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-xs text-[#2457C5] font-semibold">
                <span>View clinical chart</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export const PatientDirectory: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadPatients();
  }, [search]);

  const loadPatients = async () => {
    setIsLoading(true);
    try {
      const data = await api.getPatients(search);
      setPatients(data);
    } catch (err: any) {
      toast.error('Directory error', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = patients.filter(p => {
    if (statusFilter !== 'ALL' && p.recordStatus !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#142238] tracking-tight">Patients</h1>
          <p className="text-xs text-[#596579] mt-1">
            Find and manage patients assigned to your care.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-4 bg-white rounded-xl border border-[#DCE3EC] flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by patient name or permitted identifier..."
            className="w-full h-10 pl-9 pr-4 text-xs bg-[#F8FAFC] border border-[#DCE3EC] rounded-lg focus:outline-none focus:border-[#2457C5]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-10 px-3 text-xs bg-white border border-[#DCE3EC] rounded-lg text-[#172033]"
          >
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active records</option>
            <option value="RESTRICTED">Restricted charts</option>
          </select>
          <Button variant="secondary" size="sm" onClick={() => setSearch('')}>
            Reset
          </Button>
        </div>
      </div>

      {/* Directory Table */}
      <Card>
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#596579]">
            No patients match your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-[#596579] font-semibold border-b border-[#DCE3EC]">
                <tr>
                  <th className="py-3 px-4">Patient ID</th>
                  <th className="py-3 px-4">Patient name</th>
                  <th className="py-3 px-4">Date of birth</th>
                  <th className="py-3 px-4">Gender</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-[#2457C5]">
                      {p.medicalRecordNumber}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#172033]">
                      {p.demographics.firstName} {p.demographics.lastName}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#596579]">
                      {p.demographics.dateOfBirth}
                    </td>
                    <td className="py-3 px-4 text-[#596579]">{p.demographics.gender}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={p.recordStatus} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onNavigate(`/doctor/patients/${p.id}`)}
                      >
                        View record
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
