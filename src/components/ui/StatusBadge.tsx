import React from 'react';

export type StatusType =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'verified'
  | 'restricted';

interface StatusBadgeProps {
  status: StatusType | string;
  label?: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, className = '' }) => {
  const normalized = (status || '').toLowerCase();

  let colorStyles = 'text-[#596579] bg-[#F1F5F9] border-[#DCE3EC]';
  let dotColor = 'bg-[#64748B]';

  if (normalized.includes('success') || normalized.includes('active') || normalized.includes('verified') || normalized.includes('normal') || normalized.includes('approved') || normalized.includes('completed') || normalized.includes('finalized')) {
    colorStyles = 'text-[#15803D] bg-[#F0FDF4] border-[#BBF7D0]';
    dotColor = 'bg-[#15803D]';
  } else if (normalized.includes('warning') || normalized.includes('pending') || normalized.includes('elevated') || normalized.includes('scheduled')) {
    colorStyles = 'text-[#B45309] bg-[#FFFBEB] border-[#FDE68A]';
    dotColor = 'bg-[#B45309]';
  } else if (normalized.includes('danger') || normalized.includes('critical') || normalized.includes('denied') || normalized.includes('failed') || normalized.includes('tamper') || normalized.includes('cancelled') || normalized.includes('rejected')) {
    colorStyles = 'text-[#B91C1C] bg-[#FEF2F2] border-[#FECACA]';
    dotColor = 'bg-[#B91C1C]';
  } else if (normalized.includes('info') || normalized.includes('draft') || normalized.includes('in_progress')) {
    colorStyles = 'text-[#1D4ED8] bg-[#EFF6FF] border-[#BFDBFE]';
    dotColor = 'bg-[#1D4ED8]';
  } else if (normalized.includes('restricted')) {
    colorStyles = 'text-[#4C1D95] bg-[#F5F3FF] border-[#DDD6FE]';
    dotColor = 'bg-[#6D28D9]';
  }

  const displayText = label || status.replace(/_/g, ' ');

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded border ${colorStyles} whitespace-nowrap shrink-0 ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} aria-hidden="true" />
      <span className="capitalize">{displayText}</span>
    </span>
  );
};
