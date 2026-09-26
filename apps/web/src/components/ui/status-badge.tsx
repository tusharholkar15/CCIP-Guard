'use client';

import { cn } from '@/lib/utils';

const statusStyles: Record<string, string> = {
  HEALTHY: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10',
  ACTIVE: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10',
  DELIVERED: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10',
  SUCCESS: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10',
  RESOLVED: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10',
  APPROVED: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10',
  EXECUTED: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10',
  OPEN: 'text-red-400 border-red-500/20 bg-red-500/10',
  CRITICAL: 'text-red-400 border-red-500/20 bg-red-500/10',
  FAILED: 'text-red-400 border-red-500/20 bg-red-500/10',
  TIMEOUT: 'text-red-400 border-red-500/20 bg-red-500/10',
  DOWN: 'text-red-400 border-red-500/20 bg-red-500/10',
  REJECTED: 'text-red-400 border-red-500/20 bg-red-500/10',
  REORGED: 'text-red-400 border-red-500/20 bg-red-500/10',
  DEGRADED: 'text-amber-400 border-amber-500/20 bg-amber-500/10',
  WARNING: 'text-amber-400 border-amber-500/20 bg-amber-500/10',
  INVESTIGATING: 'text-amber-400 border-amber-500/20 bg-amber-500/10',
  MITIGATED: 'text-amber-400 border-amber-500/20 bg-amber-500/10',
  PENDING_APPROVAL: 'text-amber-400 border-amber-500/20 bg-amber-500/10',
  ACKNOWLEDGED: 'text-blue-400 border-blue-500/20 bg-blue-500/10',
  DISCOVERED: 'text-blue-400 border-blue-500/20 bg-blue-500/10',
  SENT: 'text-blue-400 border-blue-500/20 bg-blue-500/10',
  COMMITTED: 'text-blue-400 border-blue-500/20 bg-blue-500/10',
  PROCESSING: 'text-blue-400 border-blue-500/20 bg-blue-500/10',
  DESTINATION_DETECTED: 'text-blue-400 border-blue-500/20 bg-blue-500/10',
  EXECUTION_STARTED: 'text-blue-400 border-blue-500/20 bg-blue-500/10',
  INACTIVE: 'text-text-muted border-border/40 bg-surface-secondary',
  UNKNOWN: 'text-text-muted border-border/40 bg-surface-secondary',
  EXECUTION_DISABLED: 'text-text-muted border-border/40 bg-surface-secondary',
  SIMULATION: 'text-purple-400 border-purple-500/20 bg-purple-500/10',
  DISABLED: 'text-text-muted border-border/40 bg-surface-secondary',
  HIGH: 'text-red-400 border-red-500/20 bg-red-500/10',
  MEDIUM: 'text-amber-400 border-amber-500/20 bg-amber-500/10',
  LOW: 'text-blue-400 border-blue-500/20 bg-blue-500/10',
};

interface StatusBadgeProps {
  status: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, className, size = 'sm' }: StatusBadgeProps) {
  const style = statusStyles[status] || 'text-text-muted border-border/40 bg-surface-secondary';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm border font-mono uppercase tracking-wider',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs',
        style,
        className,
      )}
    >
      <span className={cn(
        'mr-2 rounded-full',
        size === 'sm' ? 'h-1 w-1' : 'h-1.5 w-1.5',
        status === 'HEALTHY' || status === 'ACTIVE' || status === 'DELIVERED' || status === 'SUCCESS' || status === 'RESOLVED' || status === 'APPROVED' || status === 'EXECUTED'
          ? 'bg-emerald-400'
          : status === 'OPEN' || status === 'CRITICAL' || status === 'FAILED' || status === 'TIMEOUT' || status === 'DOWN' || status === 'REJECTED' || status === 'HIGH' || status === 'REORGED'
          ? 'bg-red-400'
          : status === 'DEGRADED' || status === 'WARNING' || status === 'INVESTIGATING' || status === 'MITIGATED' || status === 'PENDING_APPROVAL' || status === 'MEDIUM'
          ? 'bg-amber-400'
          : status === 'SIMULATION'
          ? 'bg-purple-400'
          : 'bg-text-muted',
      )} />
      {status.replace(/_/g, ' ')}
    </span>
  );
}
