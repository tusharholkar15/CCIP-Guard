'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { PageHeader } from '@/components/ui/page-header';
import { SearchBar } from '@/components/ui/search-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Pagination } from '@/components/ui/pagination';

import { useAuditLogs } from '@/hooks/useApi';
import { formatTimestamp } from '@bridgeguard/shared';
import { FileText, Clock, User, ShieldCheck } from 'lucide-react';

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { data, isLoading, error, refetch } = useAuditLogs({ page, pageSize: 20, search: search || undefined });

  return (
    <DashboardLayout title="Audit Log">
      <PageHeader title="Security Operations Audit" description="Immutable historical record of operator actions and automated responses.">
        <SearchBar
          value={search}
          onChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
          placeholder="Search Operator ID, Action..."
          className="w-80"
        />
      </PageHeader>

      {error ? (
        <ErrorState message="Unable to load audit logs." onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 rounded-sm animate-pulse bg-surface-primary border border-border/40" />
          ))}
        </div>
      ) : data?.data && data.data.length > 0 ? (
        <div className="bg-surface-primary rounded-sm border border-border/40 overflow-hidden">
          <div className="divide-y divide-border/40">
            {data.data.map((log: any) => (
              <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-6 hover:bg-surface-primary/80 transition-colors">
                
                <div className="flex items-center gap-6 min-w-0">
                  <div className="shrink-0">
                    <div className="h-12 w-12 rounded-sm bg-surface-primary border border-border/40 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-text-muted" />
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 min-w-0">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-mono font-bold text-text-primary tracking-wide uppercase">
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <span className={`px-2.5 py-1 text-xs font-mono font-bold uppercase tracking-widest rounded-sm border ${
                        log.status === 'SUCCESS' ? 'bg-status-healthy/10 text-status-healthy border-status-healthy/30' :
                        log.status === 'FAILED' ? 'bg-status-critical/10 text-status-critical border-status-critical/30' :
                        'bg-surface-primary text-text-muted border-border/40'
                      }`}>
                        {log.status}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-text-muted">
                      <div className="flex items-center gap-2 px-3 py-1 rounded-sm bg-surface-primary border border-border/40">
                        <User className="h-3 w-3" />
                        <span className="font-medium text-text-secondary">{log.operatorName}</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1 rounded-sm bg-surface-primary border border-border/40">
                        <span className="text-xs uppercase tracking-widest font-medium">Res</span>
                        <span className="font-mono font-medium text-text-secondary">{log.resource}/{log.resourceId?.slice(0, 8) || '--'}</span>
                      </div>
                    </div>

                    {log.details && (
                      <div className="text-xs text-text-muted font-mono max-w-3xl mt-2">
                        {log.details.isSimulation && (
                          <span className="inline-block px-2 py-0.5 rounded-sm text-xs font-medium bg-amber-500/10 border border-amber-500/30 text-amber-400 mr-2">
                            SIMULATION
                          </span>
                        )}
                        {log.details.signals && Array.isArray(log.details.signals) ? (
                          <span className="text-status-critical font-medium">
                            Signals: {log.details.signals.join(' + ')}
                            {log.details.evidence && Array.isArray(log.details.evidence) ? ` — ${log.details.evidence.join('; ')}` : ''}
                          </span>
                        ) : typeof log.details === 'object' ? (
                          log.details.reason || log.details.result || log.details.newStatus || log.details.type || JSON.stringify(log.details)
                        ) : (
                          String(log.details)
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="shrink-0 flex items-center gap-2 text-xs font-mono text-text-muted">
                  <Clock className="h-4 w-4" />
                  <span className="font-mono text-text-secondary">{formatTimestamp(log.timestamp)}</span>
                </div>
                
              </div>
            ))}
          </div>
          
          {data && (
            <div className="p-6 border-t border-border/40 bg-surface-primary">
              <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 px-6 rounded-sm border border-border/40 bg-surface-primary text-center">
          <div className="h-16 w-16 mb-6 rounded-sm bg-surface-primary flex items-center justify-center border border-border/40">
            <ShieldCheck className="h-8 w-8 text-text-muted" />
          </div>
          <h2 className="text-xl font-mono font-bold text-text-primary mb-2 tracking-wide">Audit Log Empty</h2>
          <p className="text-sm font-mono text-text-muted max-w-md">No security actions have been performed yet. Actions taken by operators or automated systems will be immutably recorded here.</p>
        </div>
      )}
    </DashboardLayout>
  );
}
