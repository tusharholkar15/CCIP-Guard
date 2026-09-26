'use client';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems?: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, totalPages, totalItems, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1 && !totalItems) return null;

  return (
    <div className={cn('flex items-center justify-between px-6 py-4 border-t border-border/40 bg-surface-primary', className)}>
      <p className="text-xs font-mono text-text-muted uppercase tracking-wider">
        Page <span className="text-text-primary">{page}</span> of{' '}
        <span className="text-text-primary">{Math.max(1, totalPages)}</span>
        {totalItems !== undefined && (
          <span className="ml-2 text-text-secondary">[{totalItems} TOTAL]</span>
        )}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
          className="p-2 rounded-sm border border-border/40 text-text-secondary hover:text-text-primary hover:bg-surface-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="First page"
          title="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-2 rounded-sm border border-border/40 text-text-secondary hover:text-text-primary hover:bg-surface-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
          title="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-2 rounded-sm border border-border/40 text-text-secondary hover:text-text-primary hover:bg-surface-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
          title="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages}
          className="p-2 rounded-sm border border-border/40 text-text-secondary hover:text-text-primary hover:bg-surface-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Last page"
          title="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
