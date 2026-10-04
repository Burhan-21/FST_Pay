import React from 'react';
import type { SettlementStatus } from '../../types';

interface SettlementBadgeProps {
  status: SettlementStatus | string;
  size?: 'sm' | 'md';
  className?: string;
}

export const SettlementBadge: React.FC<SettlementBadgeProps> = ({
  status,
  size = 'sm',
  className = '',
}) => {
  const normalizedStatus = (status || 'PENDING').toUpperCase();

  const getStatusConfig = () => {
    switch (normalizedStatus) {
      case 'SETTLED':
      case 'COMPLETED':
      case 'SUCCESSFUL':
      case 'SUCCESS':
        return {
          label: normalizedStatus === 'SETTLED' ? 'Settled' : 'Successful',
          bgClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          dotClass: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]',
        };
      case 'PENDING':
      case 'PROCESSING':
        return {
          label: 'Pending',
          bgClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          dotClass: 'bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.6)]',
        };
      case 'FAILED':
      case 'DECLINED':
      case 'REJECTED':
        return {
          label: 'Failed',
          bgClass: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          dotClass: 'bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.6)]',
        };
      case 'CANCELLED':
      case 'CANCELED':
        return {
          label: 'Cancelled',
          bgClass: 'bg-slate-500/15 text-slate-400 dark:text-surface-400 border-slate-500/30',
          dotClass: 'bg-slate-400',
        };
      case 'DISPUTED':
        return {
          label: 'Disputed',
          bgClass: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
          dotClass: 'bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.6)]',
        };
      case 'REFUNDED':
        return {
          label: 'Refunded',
          bgClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
          dotClass: 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]',
        };
      default:
        return {
          label: normalizedStatus,
          bgClass: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
          dotClass: 'bg-slate-400',
        };
    }
  };

  const config = getStatusConfig();
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs sm:text-sm';

  return (
    <span
      role="status"
      aria-label={`Settlement status: ${config.label}`}
      className={`inline-flex items-center gap-1.5 rounded-full font-medium tracking-wide border backdrop-blur-sm transition-all duration-200 ${config.bgClass} ${sizeClasses} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`} />
      <span>{config.label}</span>
    </span>
  );
};
