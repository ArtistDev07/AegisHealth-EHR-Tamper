import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select, Textarea } from '../ui/Input';
import { store } from '../../services/store';
import { useToast } from '../ui/Toast';

interface BreakGlassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BreakGlassModal: React.FC<BreakGlassModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [selectedPatientId, setSelectedPatientId] = useState(store.patients[3]?.id || 'pat-104');
  const [justification, setJustification] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handleRequest = async () => {
    if (!justification.trim() || justification.trim().length < 15) {
      toast.error('Clinical justification must be at least 15 characters describing the medical urgency.');
      return;
    }

    setIsLoading(true);
    try {
      await store.requestBreakGlassAccess(selectedPatientId, justification);
      toast.warning(
        'Emergency Break-Glass Access Granted',
        'Time-bound 1-hour access active. High-priority security audit event created.'
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Emergency access request failed', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Request Emergency Break-Glass Access"
      subtitle="Privileged override for unassigned or restricted medical charts"
      maxWidth="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleRequest} isLoading={isLoading}>
            Authorize Emergency Access
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="p-3.5 bg-[#FEF2F2] border border-[#FECACA] rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-[#B91C1C] shrink-0 mt-0.5" />
          <div className="text-xs text-[#991B1B]">
            <strong className="font-semibold block mb-0.5">MANDATORY REGULATORY COMPLIANCE NOTICE:</strong>
            Emergency break-glass access immediately generates a prominent, immutable audit event with
            cryptographic hash verification. Security operations and compliance teams are automatically
            notified for retrospective clinical audit.
          </div>
        </div>

        <Select
          label="Select Unassigned / Restricted Patient"
          value={selectedPatientId}
          onChange={e => setSelectedPatientId(e.target.value)}
          options={store.patients.map(p => ({
            value: p.id,
            label: `${p.demographics.firstName} ${p.demographics.lastName} (${p.medicalRecordNumber}) - ${p.recordStatus}`,
          }))}
        />

        <Textarea
          label="Clinical Reason & Medical Urgency"
          required
          rows={3}
          value={justification}
          onChange={e => setJustification(e.target.value)}
          placeholder="e.g., Acute emergency room admission; attending unavailable; rapid cardiopulmonary stabilization required."
          helperText="Minimum 15 characters. State the precise clinical circumstance."
        />
      </div>
    </Modal>
  );
};
