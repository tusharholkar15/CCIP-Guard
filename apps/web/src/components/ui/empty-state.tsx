'use client';

import { cn } from '@/lib/utils';
import { type LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-24 px-6 border border-border/40 rounded-sm bg-surface-primary', className)}>
      <div className="rounded-sm border border-border/40 bg-surface-secondary p-4 mb-6">
        <Icon className="h-6 w-6 text-text-muted" />
      </div>
      <h3 className="text-sm font-mono uppercase tracking-widest text-text-primary mb-2">{title}</h3>
      {description && <p className="text-xs font-mono text-text-muted text-center max-w-md">{description}</p>}
      {action && <div className="mt-8">{action}</div>}
    </div>
  );
}
