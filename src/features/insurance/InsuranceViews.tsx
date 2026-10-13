import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  FileCheck2,
  Shield,
  FolderOpen,
  History,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  FileText,
  Lock,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Textarea } from '../../components/ui/Input';
import { InsuranceClaim, ClaimAuthorization, InsurancePolicy, ClinicalDocument } from '../../types/ehr';
import { api } from '../../services/api';
import { store } from '../../services/store';
import { useToast } from '../../components/ui/Toast';

export const InsuranceDashboard: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [authorizations, setAuthorizations] = useState<ClaimAuthorization[]>([]);
  const toast = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const c = await api.getAssignedClaims();
      const a = await api.getAuthorizations();
      setClaims(c);
      setAuthorizations(a);
    } catch (err: any) {
      toast.error('Failed to load insurance dashboard', err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#142238] tracking-tight">Insurance dashboard</h1>
          <p className="text-xs text-[#596579] mt-1">
            Review your assigned claims and prior authorization workflows · Strict minimum-necessary disclosure applied
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-[#DCE3EC] shadow-2xs">
          <div className="text-xs text-[#596579]">Assigned claims</div>
          <div className="text-2xl font-bold text-[#172033] mt-2 font-mono tabular-nums">{claims.length}</div>
          <div className="text-[11px] text-[#2457C5] mt-1">Active adjudication scope</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#DCE3EC] shadow-2xs">
          <div className="text-xs text-[#596579]">Pending review</div>
          <div className="text-2xl font-bold text-[#172033] mt-2 font-mono tabular-nums">
            {claims.filter(c => c.status === 'PENDING_REVIEW').length}
          </div>
          <div className="text-[11px] text-[#B45309] mt-1">Requires adjuster action</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#DCE3EC] shadow-2xs">
          <div className="text-xs text-[#596579]">Pending authorizations</div>
          <div className="text-2xl font-bold text-[#172033] mt-2 font-mono tabular-nums">
            {authorizations.filter(a => a.status === 'PENDING_REVIEW').length}
          </div>
          <div className="text-[11px] text-[#596579] mt-1">Prior service verification</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#DCE3EC] shadow-2xs">
          <div className="text-xs text-[#596579]">Adjudicated / Approved</div>
          <div className="text-2xl font-bold text-[#172033] mt-2 font-mono tabular-nums">
            {claims.filter(c => c.status === 'APPROVED').length}
          </div>
          <div className="text-[11px] text-[#15803D] mt-1">Compliant payouts</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="Assigned Claims Queue"
          headerAction={
            <Button variant="tertiary" size="sm" onClick={() => onNavigate('/insurance/claims')}>
              View all
            </Button>
          }
        >
          <div className="space-y-3">
            {claims.map(claim => (
              <div
                key={claim.id}
                onClick={() => onNavigate(`/insurance/claims/${claim.id}`)}
                className="p-4 rounded-xl border border-[#DCE3EC] hover:border-[#2457C5] bg-[#FAFCFF] transition-all cursor-pointer flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[#2457C5]">
                      {claim.claimReference}
                    </span>
                    <StatusBadge status={claim.status} />
                  </div>
                  <div className="text-xs font-semibold text-[#172033] mt-1">
                    {claim.claimType.replace(/_/g, ' ')}
                  </div>
                  <div className="text-[11px] text-[#596579]">
                    Patient: {claim.patientName} · Amount: ${claim.requestedAmount.toLocaleString()} {claim.currency}
                  </div>
                </div>
                <Button variant="secondary" size="sm">
                  Review
                </Button>
              </div>
            ))}
          </div>
        </Card>

        <Card
          title="Prior Authorizations"
          headerAction={
            <Button variant="tertiary" size="sm" onClick={() => onNavigate('/insurance/authorizations')}>
              View all
            </Button>
          }
        >
          <div className="space-y-3">
            {authorizations.map(auth => (
              <div
                key={auth.id}
                className="p-4 rounded-xl border border-[#DCE3EC] bg-white flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#172033]">
                      {auth.requestType.replace(/_/g, ' ')}
                    </span>
                    <StatusBadge status={auth.status} />
                  </div>
                  <div className="text-xs text-[#596579] mt-1">{auth.requestedService}</div>
                  <div className="text-[11px] text-[#64748B]">Patient: {auth.patientName}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export const ClaimsList: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    loadClaims();
  }, []);

  const loadClaims = async () => {
    const data = await api.getAssignedClaims();
    setClaims(data);
  };

  const filtered = claims.filter(c => (statusFilter === 'ALL' ? true : c.status === statusFilter));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#142238] tracking-tight">Claims queue</h1>
          <p className="text-xs text-[#596579] mt-1">Assigned insurance claims requiring adjudication.</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-10 px-3 text-xs bg-white border border-[#DCE3EC] rounded-lg text-[#172033]"
        >
          <option value="ALL">All claim statuses</option>
          <option value="PENDING_REVIEW">Pending review</option>
          <option value="APPROVED">Approved claims</option>
          <option value="REJECTED">Rejected claims</option>
        </select>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] text-[#596579] font-semibold border-b border-[#DCE3EC]">
              <tr>
                <th className="py-2.5 px-3">Claim Reference</th>
                <th className="py-2.5 px-3">Patient</th>
                <th className="py-2.5 px-3">Policy Number</th>
                <th className="py-2.5 px-3">Submitted Date</th>
                <th className="py-2.5 px-3">Amount</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-[#F8FAFC]">
                  <td className="py-3 px-3 font-mono font-medium text-[#2457C5]">
                    {c.claimReference}
                  </td>
                  <td className="py-3 px-3 font-semibold text-[#172033]">{c.patientName}</td>
                  <td className="py-3 px-3 font-mono text-[#596579]">{c.policyNumber}</td>
                  <td className="py-3 px-3 font-mono text-[#596579]">
                    {new Date(c.submittedAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-[#172033]">
                    ${c.requestedAmount.toLocaleString()} {c.currency}
                  </td>
                  <td className="py-3 px-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="py-3 px-3 text-right">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onNavigate(`/insurance/claims/${c.id}`)}
                    >
                      Review claim
                    </Button>
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

export const ClaimDetail: React.FC<{ claimId: string; onNavigate: (path: string) => void }> = ({
  claimId,
  onNavigate,
}) => {
  const [claim, setClaim] = useState<InsuranceClaim | null>(null);
  const [decisionModal, setDecisionModal] = useState<{
    isOpen: boolean;
    type: 'APPROVED' | 'REJECTED' | 'ADDITIONAL_INFO_REQUESTED';
  }>({ isOpen: false, type: 'APPROVED' });
  const [decisionReason, setDecisionReason] = useState('Verified against clinical policy standards');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadClaim();
  }, [claimId]);

  const loadClaim = async () => {
    try {
      const c = await api.getClaimById(claimId);
      setClaim(c);
    } catch (err: any) {
      toast.error('Failed to load claim', err.message);
    }
  };

  const handleDecision = async () => {
    if (!claim) return;
    setIsLoading(true);
    try {
      const updated = await api.adjudicateClaim(claim.id, decisionModal.type, decisionReason);
      setClaim(updated);
      setDecisionModal({ isOpen: false, type: 'APPROVED' });
      toast.success(
        `Claim decision recorded: ${decisionModal.type}`,
        `Updated to version v${updated.version} with audit logging`
      );
    } catch (err: any) {
      toast.error('Adjudication failed', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!claim) {
    return <div className="py-12 text-center text-xs text-[#596579]">Loading claim details...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 text-xs text-[#596579]">
        <button
          onClick={() => onNavigate('/insurance/claims')}
          className="hover:text-[#172033] flex items-center gap-1 cursor-pointer font-medium"
        >
          Claims List
        </button>
        <span>/</span>
        <span className="text-[#172033] font-semibold">{claim.claimReference}</span>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-[#DCE3EC] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#142238]">{claim.claimReference}</h1>
            <StatusBadge status={claim.status} />
            <span className="text-xs font-mono text-[#596579] bg-[#F1F5F9] px-2 py-0.5 rounded">
              v{claim.version}
            </span>
          </div>
          <div className="text-xs text-[#596579] mt-1">
            Patient: <strong>{claim.patientName}</strong> · Policy: <strong>{claim.policyNumber}</strong>
          </div>
        </div>

        {claim.status === 'PENDING_REVIEW' && (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setDecisionReason('Requires additional operative report details');
                setDecisionModal({ isOpen: true, type: 'ADDITIONAL_INFO_REQUESTED' });
              }}
            >
              Request info
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                setDecisionReason('Excluded procedure under current group policy coverage');
                setDecisionModal({ isOpen: true, type: 'REJECTED' });
              }}
            >
              Reject claim
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setDecisionReason('Verified medical necessity per ICD-10 and CPT coding guidelines');
                setDecisionModal({ isOpen: true, type: 'APPROVED' });
              }}
            >
              Approve claim
            </Button>
          </div>
        )}
      </div>

      {/* Minimum-Necessary Evidence Panel */}
      <Card
        title="Authorized Minimum-Necessary Medical Evidence"
        subtitle="Only authorized claim-supporting fields are exposed per data minimization policies"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 bg-[#F8FAFC] rounded-lg border border-[#DCE3EC] space-y-2">
            <div className="text-[#596579]">
              Service Rendered: <strong className="text-[#172033]">{claim.minimumNecessaryEvidence.serviceRendered}</strong>
            </div>
            <div className="text-[#596579]">
              Service Date: <strong className="text-[#172033]">{claim.minimumNecessaryEvidence.serviceDate}</strong>
            </div>
            <div className="text-[#596579]">
              Billed Diagnoses:{' '}
              <span className="font-mono text-[#172033]">
                {claim.minimumNecessaryEvidence.billedDiagnosisCodes.join(', ')}
              </span>
            </div>
          </div>

          <div>
            <span className="font-semibold text-[#172033] block mb-1">Adjudication Evidence Summary:</span>
            <p className="text-[#596579] leading-relaxed">
              {claim.minimumNecessaryEvidence.adjudicationSummary}
            </p>
          </div>

          {claim.reviewReason && (
            <div className="p-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg text-[#B45309]">
              <strong>Recorded Adjudication Decision Note:</strong> {claim.reviewReason}
            </div>
          )}
        </div>
      </Card>

      {/* Adjudication Decision Modal */}
      <Modal
        isOpen={decisionModal.isOpen}
        onClose={() => setDecisionModal({ ...decisionModal, isOpen: false })}
        title={`Confirm Decision: ${decisionModal.type}`}
        subtitle="This action commits a versioned record and an immutable audit event"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDecisionModal({ ...decisionModal, isOpen: false })}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleDecision} isLoading={isLoading}>
              Commit Decision
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Textarea
            label="Formal Adjudication Reason / Justification"
            required
            rows={3}
            value={decisionReason}
            onChange={e => setDecisionReason(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
};

export const AuthorizationsList: React.FC<{ onNavigate: (path: string) => void }> = () => {
  const [authorizations, setAuthorizations] = useState<ClaimAuthorization[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await api.getAuthorizations();
    setAuthorizations(data);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#142238] tracking-tight">Authorizations</h1>
        <p className="text-xs text-[#596579] mt-1">Review pre-service authorization requests.</p>
      </div>

      <Card>
        <div className="divide-y divide-[#F1F5F9]">
          {authorizations.map(a => (
            <div key={a.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#172033]">{a.requestedService}</span>
                  <StatusBadge status={a.status} />
                </div>
                <div className="text-[11px] text-[#596579] mt-0.5">
                  Type: {a.requestType.replace(/_/g, ' ')} · Patient: {a.patientName} · Policy: {a.policyNumber}
                </div>
                {a.decisionReason && (
                  <div className="text-[11px] text-[#15803D] mt-1">Note: {a.decisionReason}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
