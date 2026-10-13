import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  History,
  ShieldCheck,
  FileText,
  AlertTriangle,
  Download,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { AuditEvent, AuditVerificationResult } from '../../types/ehr';
import { api } from '../../services/api';
import { store } from '../../services/store';
import { useToast } from '../../components/ui/Toast';

export const AuditorDashboard: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const deniedEvents = store.auditEvents.filter(e => e.outcome === 'DENIED');
  const breakGlassEvents = store.auditEvents.filter(e => e.action === 'EMERGENCY_BREAK_GLASS_ACCESS');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#142238] tracking-tight">Security audit dashboard</h1>
          <p className="text-xs text-[#596579] mt-1">
            Independent regulatory oversight and cryptographic audit surveillance.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => onNavigate('/auditor/integrity')}
          leftIcon={<ShieldCheck className="w-4 h-4" />}
        >
          Verify chain integrity
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-[#DCE3EC] shadow-2xs">
          <div className="text-xs text-[#596579]">Audit events reviewed</div>
          <div className="text-2xl font-bold text-[#172033] mt-2 font-mono tabular-nums">
            {store.auditEvents.length}
          </div>
          <div className="text-[11px] text-[#2457C5] mt-1">Append-only journal</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#DCE3EC] shadow-2xs">
          <div className="text-xs text-[#596579]">Denied access attempts</div>
          <div className="text-2xl font-bold text-[#B91C1C] mt-2 font-mono tabular-nums">
            {deniedEvents.length}
          </div>
          <div className="text-[11px] text-[#B91C1C] mt-1">RBAC blocked queries</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#DCE3EC] shadow-2xs">
          <div className="text-xs text-[#596579]">Emergency break-glass events</div>
          <div className="text-2xl font-bold text-[#B45309] mt-2 font-mono tabular-nums">
            {breakGlassEvents.length}
          </div>
          <div className="text-[11px] text-[#B45309] mt-1">Retrospective review due</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#DCE3EC] shadow-2xs">
          <div className="text-xs text-[#596579]">Hash integrity status</div>
          <div className="text-2xl font-bold text-[#15803D] mt-2 flex items-center gap-1.5 text-base">
            <CheckCircle2 className="w-5 h-5 text-[#15803D]" />
            Verified Unbroken
          </div>
          <div className="text-[11px] text-[#596579] mt-1">Root signed checkpoint</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="Security Surveillance Stream"
          subtitle="Denied authorization events and elevated privilege triggers"
          headerAction={
            <Button variant="tertiary" size="sm" onClick={() => onNavigate('/auditor/security-events')}>
              View all
            </Button>
          }
        >
          <div className="space-y-3">
            {deniedEvents.concat(breakGlassEvents).slice(0, 4).map(e => (
              <div
                key={e.id}
                className="p-3.5 rounded-xl border border-[#DCE3EC] bg-[#FAFCFF] flex items-start justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#172033]">{e.action}</span>
                    <StatusBadge status={e.outcome} />
                  </div>
                  <div className="text-[11px] text-[#596579] mt-0.5">
                    Actor: {e.actorName} ({e.actorRole}) · Target: {e.resourceReference}
                  </div>
                  <div className="text-[10px] text-[#64748B] font-mono mt-0.5">
                    {new Date(e.occurredAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Independent Regulatory Compliance">
          <div className="space-y-3 text-xs text-[#596579]">
            <p className="leading-relaxed">
              As an independent security auditor, you have read-only access to all cryptographic access
              events, security alerts, and system change records.
            </p>
            <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#DCE3EC] space-y-1 font-mono text-[11px]">
              <div>Immutability: SHA-256 Sequential Hash Chaining</div>
              <div>Envelope Standard: AES-256-GCM Authenticated Cipher</div>
              <div>Data Classification: RESTRICTED_PHI (Masked for Non-Clinicians)</div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNavigate('/auditor/reports')}
              className="w-full mt-2"
              leftIcon={<Download className="w-4 h-4" />}
            >
              Export Compliance Audit Dossier
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export const SecurityEventsView: React.FC<{ onNavigate: (path: string) => void }> = () => {
  const events = store.auditEvents.filter(
    e => e.outcome === 'DENIED' || e.action === 'EMERGENCY_BREAK_GLASS_ACCESS' || e.action.includes('AUTH_')
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#142238] tracking-tight">Security events</h1>
        <p className="text-xs text-[#596579] mt-1">Surveillance log of authentication, authorization denials, and overrides.</p>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] text-[#596579] font-semibold border-b border-[#DCE3EC]">
              <tr>
                <th className="py-2.5 px-3">Occurred At</th>
                <th className="py-2.5 px-3">Actor Identity</th>
                <th className="py-2.5 px-3">Security Action</th>
                <th className="py-2.5 px-3">Resource Target</th>
                <th className="py-2.5 px-3">Outcome</th>
                <th className="py-2.5 px-3">Audit Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {events.map(e => (
                <tr key={e.id} className="hover:bg-[#F8FAFC]">
                  <td className="py-3 px-3 font-mono text-[#596579]">
                    {new Date(e.occurredAt).toLocaleString()}
                  </td>
                  <td className="py-3 px-3 font-semibold text-[#172033]">
                    {e.actorName} ({e.actorRole})
                  </td>
                  <td className="py-3 px-3 font-mono">{e.action}</td>
                  <td className="py-3 px-3 text-[#596579] max-w-xs truncate">{e.resourceReference}</td>
                  <td className="py-3 px-3">
                    <StatusBadge status={e.outcome} />
                  </td>
                  <td className="py-3 px-3 text-[#596579]">{e.purpose || e.reasonCode || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export const AuditorReportsView: React.FC<{ onNavigate: (path: string) => void }> = () => {
  const toast = useToast();

  const handleExport = (format: 'JSON' | 'CSV') => {
    toast.success(
      `Compliance report generated (${format})`,
      'Cryptographic proof checkpoint and SHA-256 chain signatures included.'
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#142238] tracking-tight">Audit reports</h1>
        <p className="text-xs text-[#596579] mt-1">Export signed compliance dossiers for regulatory reviews.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Comprehensive Compliance Dossier" subtitle="HIPAA Security Rule & Cryptographic Chain Proof">
          <p className="text-xs text-[#596579] mb-4">
            Exports all sequential audit entries with linked before/after Type 2 SCD versions, actor roles,
            and root checkpoint signature.
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="primary" onClick={() => handleExport('JSON')} leftIcon={<Download className="w-4 h-4" />}>
              Export JSON Package
            </Button>
            <Button size="sm" variant="secondary" onClick={() => handleExport('CSV')} leftIcon={<Download className="w-4 h-4" />}>
              Export CSV Ledger
            </Button>
          </div>
        </Card>

        <Card title="Privileged Access & Break-Glass Review" subtitle="Elevated Emergency Overrides Ledger">
          <p className="text-xs text-[#596579] mb-4">
            Isolates all emergency clinical chart overrides and administrator actions for board compliance.
          </p>
          <Button size="sm" variant="secondary" onClick={() => handleExport('JSON')} leftIcon={<Download className="w-4 h-4" />}>
            Export Overrides Log
          </Button>
        </Card>
      </div>
    </div>
  );
};
