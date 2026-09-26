'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TechnicalValueProps {
  value: string | null | undefined;
  truncate?: boolean;
  chars?: number;
  className?: string;
  copyable?: boolean;
}

export function TechnicalValue({
  value,
  truncate = true,
  chars = 6,
  className,
  copyable = false,
}: TechnicalValueProps) {
  const [copied, setCopied] = useState(false);

  if (!value || value === '--') return <span className="text-text-muted font-mono">--</span>;

  const displayValue = truncate && value.length > chars * 2 + 2
    ? `${value.slice(0, chars + 2)}...${value.slice(-chars)}`
    : value;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <span
      className={cn('inline-flex items-center gap-2 font-mono text-xs text-text-primary bg-surface-secondary px-2 py-1 rounded-sm border border-border/40 group/tech transition-colors hover:border-border', className)}
      title={value}
    >
      <span>{displayValue}</span>
      {copyable && (
        <button
          type="button"
          onClick={handleCopy}
          className="p-1 rounded-sm hover:bg-surface-tertiary text-text-muted hover:text-text-primary transition-colors focus:outline-none"
          title={copied ? 'Copied!' : 'Copy full hash'}
          aria-label="Copy to clipboard"
        >
          {copied ? (
            <Check className="h-3 w-3 text-status-healthy" />
          ) : (
            <Copy className="h-3 w-3 opacity-60 group-hover/tech:opacity-100 transition-opacity" />
          )}
        </button>
      )}
    </span>
  );
}
