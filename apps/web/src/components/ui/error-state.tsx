'use client';

import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';

interface ErrorStateProps {
  title?: string;
  message: string;
  details?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ title = 'SYSTEM ERROR', message, details, onRetry, className }: ErrorStateProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className={cn('flex flex-col items-center justify-center py-24 px-6 border border-status-critical/20 rounded-sm bg-surface-primary', className)}>
      <div className="rounded-sm border border-status-critical/30 bg-status-critical/10 p-4 mb-6">
        <AlertTriangle className="h-6 w-6 text-status-critical" />
      </div>
      <h3 className="text-sm font-mono uppercase tracking-widest text-status-critical mb-2">{title}</h3>
      <p className="text-xs font-mono text-text-muted text-center max-w-md mb-8">{message}</p>
      <div className="flex items-center gap-4">
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-6 py-2 text-xs font-mono uppercase tracking-wider rounded-sm bg-surface-secondary text-text-primary hover:bg-surface-tertiary border border-border/40 transition-colors"
          >
            Retry
          </button>
        )}
        {details && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="px-6 py-2 text-xs font-mono uppercase tracking-wider rounded-sm text-text-muted hover:text-text-primary border border-transparent hover:border-border/40 transition-colors"
          >
            {showDetails ? 'Hide' : 'Show'} Trace
          </button>
        )}
      </div>
      {showDetails && details && (
        <pre className="mt-8 p-6 rounded-sm bg-bg-primary text-[10px] text-text-secondary font-mono max-w-2xl w-full overflow-auto border border-border/40 shadow-inner">
          {details}
        </pre>
      )}
    </div>
  );
}
