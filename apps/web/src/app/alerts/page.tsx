'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Pagination } from '@/components/ui/pagination';
import { ErrorState } from '@/components/ui/error-state';

import { useAlerts } from '@/hooks/useApi';
import { formatTimestamp } from '@bridgeguard/shared';
import { Bell } from 'lucide-react';

export default function AlertsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const { data, isLoading, error, refetch } = useAlerts({ page, pageSize: 15, status: statusFilter });

  const columns = [
    {
      key: 'type',
      header: 'Type',
      render: (a: any) => (
        <span
          className={`text-xs font-mono font-medium uppercase tracking-widest ${
            a.type === 'SUSPICIOUS_ACTIVITY'
              ? 'text-status-critical font-bold'
              : 'text-text-primary'
          }`}
        >
          {a.type.replace(/_/g, ' ')}
        </span>
      ),
    },
    { key: 'resource', header: 'Resource', render: (a: any) => <span className="text-xs font-mono font-medium text-text-secondary">{a.resource}</span> },
    {
      key: 'threshold',
      header: 'Threshold',
      render: (a: any) => (
        <span className="text-xs font-mono text-text-muted">
          {a.type === 'SUSPICIOUS_ACTIVITY' ? `${a.threshold} signals (HIGH)` : a.threshold}
        </span>
      ),
    },
    {
      key: 'observedValue',
      header: 'Observed',
      render: (a: any) => (
        <span
          className={`text-xs font-mono font-medium ${
            a.type === 'SUSPICIOUS_ACTIVITY' ? 'text-status-critical' : 'text-text-primary'
          }`}
        >
          {a.type === 'SUSPICIOUS_ACTIVITY' ? `${a.observedValue} signals` : a.observedValue}
        </span>
      ),
    },
    {
      key: 'message',
      header: 'Evidence / Message',
      render: (a: any) => (
        <span className="text-xs font-mono text-text-secondary line-clamp-1 max-w-sm" title={a.message}>
          {a.message}
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: (a: any) => <StatusBadge status={a.status} /> },
    { key: 'createdAt', header: 'Timestamp', render: (a: any) => <span className="text-xs font-mono text-text-muted">{formatTimestamp(a.createdAt)}</span> },
  ];

  const handleStatusChange = (s: string | undefined) => {
    setStatusFilter(s);
    setPage(1);
  };

  return (
    <DashboardLayout title="System Alerts">
      <PageHeader title="Alert Feed" description="Threshold monitoring and real-time alert notifications.">
        <div className="flex gap-2 bg-surface-primary p-2 rounded-sm border border-border/40">
          {[undefined, 'ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'].map((s) => (
            <button
              key={s ?? 'all'}
              onClick={() => handleStatusChange(s)}
              className={`px-4 py-2 text-xs font-mono font-medium rounded-sm transition-all ${
                statusFilter === s ? 'bg-status-info text-white' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {(s ?? 'ALL').replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </PageHeader>

      {error ? (
        <ErrorState message="Unable to load alerts." onRetry={() => refetch()} />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="rounded-sm border border-border/40 bg-surface-primary overflow-hidden">
            <DataTable 
              columns={columns} 
              data={data?.data || []} 
              loading={isLoading} 
              emptyTitle="No alerts triggered" 
              emptyDescription="All telemetry is within configured thresholds." 
            />
            {data && (
              <div className="p-6 border-t border-border/40 bg-surface-primary">
                <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
