import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  History,
  KeyRound,
  Activity,
  HardDriveDownload,
  Settings,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileDown,
  UserPlus,
  Lock,
  Search,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { StatusBadge } from '../../components/ui/StatusBadge';
import {
  User,
  AuditEvent,
  AuditVerificationResult,
  EncryptionKeyMetadata,
  SystemHealthComponent,
} from '../../types/ehr';
import { api } from '../../services/api';
import { store } from '../../services/store';
import { useToast } from '../../components/ui/Toast';

export const AdminDashboard: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#142238] tracking-tight">Administration dashboard</h1>
        <p className="text-xs text-[#596579] mt-1">
          Manage access, security operations, encryption keys, and system infrastructure.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-[#DCE3EC] shadow-2xs">
          <div className="text-xs text-[#596579]">Active users</div>
          <div className="text-2xl font-bold text-[#172033] mt-2 font-mono tabular-nums">
            {store.users.length}
          </div>
          <div className="text-[11px] text-[#15803D] mt-1">5 core roles assigned</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#DCE3EC] shadow-2xs">
          <div className="text-xs text-[#596579]">Total audit events</div>
          <div className="text-2xl font-bold text-[#172033] mt-2 font-mono tabular-nums">
            {store.auditEvents.length}
          </div>
          <div className="text-[11px] text-[#2457C5] mt-1">Unbroken SHA-256 chain</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#DCE3EC] shadow-2xs">
          <div className="text-xs text-[#596579]">Active DEK key version</div>
          <div className="text-2xl font-bold text-[#172033] mt-2 font-mono">
            {store.keys[0]?.id || 'key-dek-v1'}
          </div>
          <div className="text-[11px] text-[#0F766E] mt-1">AES-256-GCM authenticated</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#DCE3EC] shadow-2xs">
          <div className="text-xs text-[#596579]">System health status</div>
          <div className="text-2xl font-bold text-[#15803D] mt-2 flex items-center gap-1.5 text-lg">
            <CheckCircle2 className="w-5 h-5 text-[#15803D]" />
            100% Operational
          </div>
          <div className="text-[11px] text-[#596579] mt-1">Multi-AZ primary standby</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="Security & System Health Overview"
          headerAction={
            <Button variant="tertiary" size="sm" onClick={() => onNavigate('/admin/system-health')}>
              View details
            </Button>
          }
        >
          <div className="space-y-3">
            {store.health.map(h => (
              <div key={h.id} className="p-3 bg-[#F8FAFC] rounded-lg border border-[#DCE3EC] flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-[#172033]">{h.name}</div>
                  <div className="text-[11px] text-[#596579]">{h.message}</div>
                </div>
                <StatusBadge status={h.status} />
              </div>
            ))}
          </div>
        </Card>

        <Card
          title="Quick Administration Tasks"
          subtitle="Privileged configuration workflows"
        >
          <div className="space-y-2.5">
            {[
              { title: 'Cryptographic Audit Verification', path: '/admin/audit/integrity', desc: 'Scan hash chain for tampering or discrepancies' },
              { title: 'User Provisioning & Roles', path: '/admin/users', desc: 'Invite staff and configure role-based access scopes' },
              { title: 'Envelope Key Rotation', path: '/admin/encryption', desc: 'Rotate active DEKs and inspect KMS metadata' },
              { title: 'Backup & Recovery Testing', path: '/admin/backup-recovery', desc: 'Review RPO/RTO compliance and test restore readiness' },
            ].map(task => (
              <button
                key={task.title}
                onClick={() => onNavigate(task.path)}
                className="w-full text-left p-3 rounded-lg border border-[#DCE3EC] hover:border-[#2457C5] hover:bg-[#F8FAFC] transition-colors cursor-pointer group flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-semibold text-[#172033] group-hover:text-[#2457C5]">
                    {task.title}
                  </div>
                  <div className="text-[11px] text-[#596579]">{task.desc}</div>
                </div>
                <Button size="sm" variant="secondary">
                  Open
                </Button>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export const UserManagement: React.FC<{ onNavigate: (path: string) => void }> = () => {
  const [users, setUsers] = useState<User[]>(store.users);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    role: 'DOCTOR' as User['role'],
  });
  const toast = useToast();

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const newUser: User = {
      id: `usr-${Date.now().toString().slice(-4)}`,
      organizationId: store.organization.id,
      name: inviteForm.name,
      email: inviteForm.email,
      role: inviteForm.role,
      mfaEnabled: true,
      accountStatus: 'INVITED',
      createdAt: new Date().toISOString(),
    };
    store.users.unshift(newUser);
    setUsers([...store.users]);
    setIsInviteOpen(false);
    toast.success('Invitation sent', `One-time hashed activation token generated for ${newUser.email}`);
  };

  const handleToggleStatus = (userId: string) => {
    const user = store.users.find(u => u.id === userId);
    if (!user) return;
    user.accountStatus = user.accountStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setUsers([...store.users]);
    toast.warning(`User account status updated: ${user.accountStatus}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#142238] tracking-tight">User management</h1>
          <p className="text-xs text-[#596579] mt-1">Manage personnel, role assignments, and authentication status.</p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsInviteOpen(true)}
          leftIcon={<UserPlus className="w-4 h-4" />}
        >
          Invite user
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] text-[#596579] font-semibold border-b border-[#DCE3EC]">
              <tr>
                <th className="py-2.5 px-3">Name</th>
                <th className="py-2.5 px-3">Email Address</th>
                <th className="py-2.5 px-3">Assigned Role</th>
                <th className="py-2.5 px-3">MFA Status</th>
                <th className="py-2.5 px-3">Account Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-[#F8FAFC]">
                  <td className="py-3 px-3 font-semibold text-[#172033]">{u.name}</td>
                  <td className="py-3 px-3 font-mono text-[#596579]">{u.email}</td>
                  <td className="py-3 px-3 capitalize font-medium">{u.role.toLowerCase()}</td>
                  <td className="py-3 px-3">
                    <span className="text-[11px] font-medium text-[#15803D] bg-[#F0FDF4] px-2 py-0.5 rounded border border-[#BBF7D0]">
                      Hardware TOTP
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <StatusBadge status={u.accountStatus} />
                  </td>
                  <td className="py-3 px-3 text-right">
                    <Button
                      size="sm"
                      variant={u.accountStatus === 'ACTIVE' ? 'secondary' : 'primary'}
                      onClick={() => handleToggleStatus(u.id)}
                    >
                      {u.accountStatus === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        title="Invite a User"
        subtitle="Issues a single-use cryptographically hashed token"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsInviteOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleInvite}>
              Send invitation
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label="Full Name"
            required
            value={inviteForm.name}
            onChange={e => setInviteForm({ ...inviteForm, name: e.target.value })}
            placeholder="Dr. Jane Doe"
          />
          <Input
            label="Work Email Address"
            required
            type="email"
            value={inviteForm.email}
            onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
            placeholder="jane_doe@aegishealth.org"
          />
          <Select
            label="Role Assignment"
            value={inviteForm.role}
            onChange={e => setInviteForm({ ...inviteForm, role: e.target.value as any })}
            options={[
              { value: 'DOCTOR', label: 'Doctor / Clinician' },
              { value: 'PATIENT', label: 'Patient' },
              { value: 'INSURANCE', label: 'Insurance Adjuster' },
              { value: 'ADMIN', label: 'System Administrator' },
              { value: 'AUDITOR', label: 'Security Auditor' },
            ]}
          />
        </div>
      </Modal>
    </div>
  );
};

export const RolesPermissions: React.FC<{ onNavigate: (path: string) => void }> = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#142238] tracking-tight">Roles & permissions</h1>
        <p className="text-xs text-[#596579] mt-1">Granular RBAC catalog and permission definitions.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {store.roles.map(r => (
          <Card key={r.id} title={r.name} subtitle={r.description}>
            <div className="space-y-2 mt-2">
              <span className="text-[11px] font-semibold text-[#596579] uppercase tracking-wider block">
                Explicit Grants ({r.permissions.length}):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {r.permissions.map(p => (
                  <span
                    key={p}
                    className="text-[11px] font-mono px-2 py-0.5 bg-[#F1F5F9] border border-[#DCE3EC] text-[#172033] rounded"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export const AdminAuditLogs: React.FC<{ onNavigate: (path: string) => void }> = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    const data = await api.getAuditLogs();
    setEvents(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#142238] tracking-tight">Audit logs</h1>
          <p className="text-xs text-[#596579] mt-1">
            Append-only, SHA-256 tamper-evident historical audit stream.
          </p>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] text-[#596579] font-semibold border-b border-[#DCE3EC]">
              <tr>
                <th className="py-2.5 px-3">Timestamp (UTC)</th>
                <th className="py-2.5 px-3">Actor</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Resource</th>
                <th className="py-2.5 px-3">Outcome</th>
                <th className="py-2.5 px-3 font-mono">Event Hash</th>
                <th className="py-2.5 px-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {events.map(e => (
                <tr key={e.id} className="hover:bg-[#F8FAFC]">
                  <td className="py-3 px-3 font-mono text-[#596579]">
                    {new Date(e.occurredAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}
                  </td>
                  <td className="py-3 px-3 font-semibold text-[#172033]">
                    {e.actorName} ({e.actorRole})
                  </td>
                  <td className="py-3 px-3 font-mono">{e.action}</td>
                  <td className="py-3 px-3 text-[#596579] max-w-[160px] truncate">{e.resourceReference}</td>
                  <td className="py-3 px-3">
                    <StatusBadge status={e.outcome} />
                  </td>
                  <td className="py-3 px-3 font-mono text-[10px] text-[#2457C5]">
                    {e.eventHash.slice(0, 14)}...
                  </td>
                  <td className="py-3 px-3 text-right">
                    <Button size="sm" variant="secondary" onClick={() => setSelectedEvent(e)}>
                      Inspect
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Inspect Event Modal */}
      {selectedEvent && (
        <Modal
          isOpen={Boolean(selectedEvent)}
          onClose={() => setSelectedEvent(null)}
          title={`Audit Event: ${selectedEvent.id}`}
          subtitle="Cryptographic verification metadata"
          footer={
            <Button variant="secondary" onClick={() => setSelectedEvent(null)}>
              Close
            </Button>
          }
        >
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#DCE3EC] font-mono space-y-1">
              <div><strong>Action:</strong> {selectedEvent.action}</div>
              <div><strong>Actor:</strong> {selectedEvent.actorName} ({selectedEvent.actorRole})</div>
              <div><strong>Occurred:</strong> {selectedEvent.occurredAt}</div>
              <div><strong>Resource:</strong> {selectedEvent.resourceReference}</div>
              <div><strong>Outcome:</strong> {selectedEvent.outcome}</div>
              {selectedEvent.purpose && <div><strong>Purpose:</strong> {selectedEvent.purpose}</div>}
            </div>

            <div className="p-3 bg-[#FAFCFF] rounded-lg border border-[#BFDBFE] space-y-2">
              <span className="font-semibold text-[#172033] block">SHA-256 Hash Chain Proof:</span>
              <div className="font-mono text-[11px] break-all">
                <span className="text-[#596579] block">Previous Event Hash:</span>
                <span className="text-[#172033]">{selectedEvent.previousEventHash}</span>
              </div>
              <div className="font-mono text-[11px] break-all">
                <span className="text-[#596579] block">Current Event Hash:</span>
                <span className="text-[#2457C5] font-semibold">{selectedEvent.eventHash}</span>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export const IntegrityVerification: React.FC<{ onNavigate: (path: string) => void }> = () => {
  const [result, setResult] = useState<AuditVerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const toast = useToast();

  const handleRunVerification = async () => {
    setIsVerifying(true);
    try {
      const res = await api.verifyAuditIntegrity();
      setResult(res);
      if (res.integrityStatus === 'VALID_VERIFIED') {
        toast.success(
          'Verification completed',
          `All ${res.totalEventsChecked} events verified. Zero discrepancies.`
        );
      } else {
        toast.error(
          'Integrity Discrepancy Detected!',
          `${res.discrepanciesCount} corrupted blocks identified in hash chain!`
        );
      }
    } catch (err: any) {
      toast.error('Verification failed', err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSimulateTamper = () => {
    if (store.auditEvents.length > 2) {
      const target = store.auditEvents[1];
      store.simulateTamperEvent(target.id);
      toast.warning('Tamper simulation executed in memory', `Altered event ${target.id}. Run verification now.`);
    }
  };

  const handleResetClean = () => {
    store.resetStore();
    setResult(null);
    toast.success('Clean cryptographic chain restored');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#142238] tracking-tight">Audit integrity verification</h1>
          <p className="text-xs text-[#596579] mt-1">
            Mathematical proof of audit trail immutability via sequential SHA-256 hash recalculation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSimulateTamper}
          >
            Simulate Tamper
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleResetClean}
          >
            Reset Chain
          </Button>
          <Button
            variant="primary"
            size="sm"
            isLoading={isVerifying}
            onClick={handleRunVerification}
            leftIcon={<ShieldCheck className="w-4 h-4" />}
          >
            Run verification
          </Button>
        </div>
      </div>

      {result && (
        <Card title="Verification Execution Report">
          <div className="space-y-4">
            <div
              className={`p-4 rounded-xl border flex items-center justify-between ${
                result.integrityStatus === 'VALID_VERIFIED'
                  ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]'
                  : 'bg-[#FEF2F2] border-[#FECACA] text-[#B91C1C]'
              }`}
            >
              <div className="flex items-center gap-3">
                {result.integrityStatus === 'VALID_VERIFIED' ? (
                  <CheckCircle2 className="w-6 h-6 text-[#15803D]" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-[#B91C1C]" />
                )}
                <div>
                  <h3 className="text-sm font-bold">
                    {result.integrityStatus === 'VALID_VERIFIED'
                      ? 'Integrity Verified: Chain Unbroken'
                      : 'Cryptographic Failure: Tampering Detected!'}
                  </h3>
                  <p className="text-xs mt-0.5">
                    Checked {result.totalEventsChecked} sequential blocks · Valid links:{' '}
                    {result.validChainLinks} · Discrepancies: {result.discrepanciesCount}
                  </p>
                </div>
              </div>
              <StatusBadge status={result.integrityStatus} />
            </div>

            {result.discrepancies.length > 0 && (
              <div className="p-4 bg-[#FEF2F2] border border-[#FECACA] rounded-xl space-y-2">
                <span className="text-xs font-bold text-[#991B1B] block">
                  Identified Malicious Node Modifications:
                </span>
                {result.discrepancies.map(d => (
                  <div key={d.eventId} className="text-xs font-mono text-[#7F1D1D] bg-white p-3 rounded-lg border border-[#FECACA] space-y-1">
                    <div><strong>Event ID:</strong> {d.eventId}</div>
                    <div><strong>Violation:</strong> {d.failureReason}</div>
                    <div className="break-all"><strong>Calculated Valid Hash:</strong> {d.expectedHash}</div>
                    <div className="break-all"><strong>Corrupted Block Hash:</strong> {d.storedHash}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#DCE3EC] text-xs font-mono text-[#596579] space-y-1">
              <div>Run ID: {result.runId}</div>
              <div>Executed At: {result.executedAt}</div>
              <div>Verified By: {result.verifiedBy}</div>
              <div className="truncate">Root Checkpoint Hash: {result.checkpointHash}</div>
            </div>
          </div>
        </Card>
      )}

      {!result && (
        <div className="p-12 text-center bg-white rounded-xl border border-[#DCE3EC] space-y-3">
          <ShieldCheck className="w-12 h-12 text-[#2457C5] mx-auto" />
          <h3 className="text-base font-bold text-[#172033]">Audit Chain Ready for Verification</h3>
          <p className="text-xs text-[#596579] max-w-md mx-auto">
            Click "Run verification" above to perform an end-to-end cryptographic walk of all SHA-256
            audit records.
          </p>
        </div>
      )}
    </div>
  );
};

export const EncryptionManagement: React.FC<{ onNavigate: (path: string) => void }> = () => {
  const [keys, setKeys] = useState<EncryptionKeyMetadata[]>(store.keys);
  const [isRotating, setIsRotating] = useState(false);
  const toast = useToast();

  const handleRotate = async () => {
    setIsRotating(true);
    try {
      const res = await api.rotateEncryptionKey();
      setKeys([...store.keys]);
      toast.success('Key rotation completed', res.message);
    } catch (err: any) {
      toast.error('Rotation failed', err.message);
    } finally {
      setIsRotating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#142238] tracking-tight">Encryption management</h1>
          <p className="text-xs text-[#596579] mt-1">
            Envelope encryption key metadata and active data encryption keys (DEK).
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          isLoading={isRotating}
          onClick={handleRotate}
          leftIcon={<RefreshCw className="w-4 h-4" />}
        >
          Rotate Active Key
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {keys.map(k => (
          <Card key={k.id} title={k.id} subtitle={k.purpose}>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#596579]">Algorithm</span>
                <span className="font-mono font-bold text-[#172033]">{k.algorithm}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#596579]">Provider</span>
                <span className="text-[#172033]">{k.provider}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#596579]">Version</span>
                <span className="font-mono text-[#172033]">v{k.keyVersion}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#596579]">Encrypted Records</span>
                <span className="font-mono font-bold text-[#2457C5]">{k.recordsEncryptedCount}</span>
              </div>
              <div className="pt-2 border-t border-[#F1F5F9]">
                <StatusBadge status={k.status} />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
