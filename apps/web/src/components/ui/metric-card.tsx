'use client';

import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  className?: string;
  loading?: boolean;
  description?: string;
  statusColor?: 'healthy' | 'warning' | 'critical' | 'info' | 'neutral';
}

export function MetricCard({ 
  label, 
  value, 
  icon: Icon, 
  trend, 
  trendUp, 
  className, 
  loading,
  description,
  statusColor = 'neutral'
}: MetricCardProps) {
  if (loading) {
    return (
      <div className={cn('rounded-sm border border-border/40 bg-surface-primary p-6 relative overflow-hidden', className)}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-24 rounded bg-surface-secondary" />
          <div className="h-10 w-32 rounded bg-surface-secondary" />
          <div className="h-3 w-40 rounded bg-surface-secondary" />
        </div>
      </div>
    );
  }

  const statusTextMap = {
    healthy: 'text-status-healthy',
    warning: 'text-status-warning',
    critical: 'text-status-critical',
    info: 'text-status-info',
    neutral: 'text-text-muted',
  };

  return (
    <div className={cn(
      'rounded-sm border border-border/40 bg-surface-primary p-6 transition-all duration-300 relative group flex flex-col',
      className
    )}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-mono uppercase tracking-widest text-text-muted">{label}</p>
        {Icon && (
          <div className="text-text-muted group-hover:text-text-secondary transition-colors">
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      
      <div className="flex flex-col gap-2 mt-auto">
        <div className="flex items-baseline gap-3">
          <p className="text-3xl font-medium text-text-primary tracking-tight font-mono">{value}</p>
          {trend && (
            <span className={cn('text-xs font-mono px-2 py-0.5 rounded-sm bg-surface-secondary border', 
              trendUp 
                ? 'text-status-healthy border-status-healthy/20' 
                : 'text-status-critical border-status-critical/20'
            )}>
              {trendUp ? '↑' : '↓'} {trend}
            </span>
          )}
        </div>
        
        {description && (
          <p className="text-xs text-text-muted font-mono">{description}</p>
        )}
      </div>
    </div>
  );
}
