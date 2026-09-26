'use client';

import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { TableSkeleton } from './loading-skeleton';
import { EmptyState } from './empty-state';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (item: T) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  className?: string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading,
  emptyTitle = 'NO DATA AVAILABLE',
  emptyDescription,
  onRowClick,
  sortBy,
  sortOrder,
  onSort,
  className,
}: DataTableProps<T>) {
  if (loading) {
    return <TableSkeleton rows={5} cols={columns.length} />;
  }

  if (!data || data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className={cn('w-full overflow-x-auto rounded-sm border border-border/40 bg-surface-primary', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/40 bg-bg-primary/50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-6 py-4 text-left text-[10px] font-mono uppercase tracking-widest text-text-muted',
                  col.sortable && 'cursor-pointer hover:text-text-primary transition-colors',
                  col.className,
                )}
                onClick={() => col.sortable && onSort?.(col.key)}
              >
                <div className="flex items-center gap-2">
                  {col.header}
                  {col.sortable && (
                    sortBy === col.key ? (
                      sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronsUpDown className="h-3 w-3 opacity-30" />
                    )
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="font-mono text-xs">
          {data.map((item, i) => (
            <tr
              key={i}
              className={cn(
                'border-b border-border/20 transition-colors hover:bg-surface-secondary/50',
                onRowClick && 'cursor-pointer',
              )}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((col) => (
                <td key={col.key} className={cn('px-6 py-4 text-text-secondary', col.className)}>
                  {col.render ? col.render(item) : String(item[col.key] ?? '--')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
