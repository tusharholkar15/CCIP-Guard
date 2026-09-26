'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Pagination } from '@/components/ui/pagination';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

import { useResponses, useApproveResponse, useRejectResponse } from '@/hooks/useApi';
import { formatTimestamp } from '@bridgeguard/shared';
import { Shield, AlertTriangle, ShieldOff, CheckCircle2, User, Clock, ShieldBan } from 'lucide-react';

export default function ResponsesPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const { data, isLoading, error, refetch } = useResponses({ page, pageSize: 15, status: statusFilter });
  const approveMutation = useApproveResponse();
  const rejectMutation = useRejectResponse();
  const [confirmAction, setConfirmAction] = useState<{ type: 'approve' | 'reject'; id: string } | null>(null);

  const handleConfirm = async () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'approve') {
      await approveMutation.mutateAsync(confirmAction.id);
    } else {
      await rejectMutation.mutateAsync({ id: confirmAction.id });
    }
    setConfirmAction(null);
  };

  return (
    <DashboardLayout title="Responses">
      <PageHeader title="Response Center" description="Controlled cross-chain response proposals and operator approvals.">
        <div className="flex gap-2 bg-surface-primary p-2 rounded-sm border border-border/40">
          {[undefined, 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXECUTION_DISABLED'].map((s) => (
            <button
              key={s ?? 'all'}
              onClick={() => {
                setStatusFilter(s);
                setPage(1);
              }}
              className={`px-4 py-2 text-xs font-mono font-medium rounded-sm transition-all ${
                statusFilter === s ? 'bg-status-info text-white' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {(s ?? 'ALL').replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </PageHeader>

      {/* SOC Banner */}
      <div className="mb-8 p-6 rounded-sm border border-border/40 bg-surface-primary relative overflow-hidden group flex items-center justify-between">
        <div className="absolute inset-0 bg-status-info/5 group-hover:bg-status-info/10 transition-colors" />
        <div className="relative z-10 flex items-center gap-6">
          <div className="p-4 rounded-sm bg-status-info/10 border border-status-info/20">
            <ShieldOff className="h-6 w-6 text-status-info" />
          </div>
          <div>
            <div className="flex items-center gap-4 mb-2">
              <h3 className="text-sm font-mono font-bold tracking-widest text-text-primary uppercase">Execution Disabled</h3>
              <span className="px-3 py-1 rounded-sm text-[10px] font-mono font-bold tracking-widest bg-status-info/20 text-status-info uppercase border border-status-info/30">Safe Mode</span>
            </div>
            <p className="text-xs font-mono text-text-muted">Response execution is disabled. BridgeGuard only creates controlled proposals and does not automatically sign or submit blockchain transactions.</p>
          </div>
        </div>
      </div>

      {error ? (
        <ErrorState message="Unable to load response proposals." onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 rounded-sm animate-pulse bg-surface-primary border border-border/40" />
          ))}
        </div>
      ) : data?.data && data.data.length > 0 ? (
        <>
          <div className="space-y-6">
            {data.data.map((proposal: any) => (
              <div key={proposal.id} className="p-8 rounded-sm border border-border/40 bg-surface-primary hover:border-border/60 transition-all">
                
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-6">
                    <div className="p-4 rounded-sm bg-surface-primary border border-border/40">
                      <Shield className="h-6 w-6 text-text-primary" />
                    </div>
                    <div>
                      <h3 className="text-base font-mono font-bold text-text-primary tracking-wide mb-2">{proposal.target}</h3>
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 rounded-sm bg-surface-primary border border-border/40 text-[10px] font-mono text-text-muted uppercase">
                          {proposal.type.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3 shrink-0">
                    <StatusBadge status={proposal.status} size="md" />
                    <StatusBadge status={proposal.executionMode} />
                  </div>
                </div>
                
                <div className="p-6 rounded-sm bg-surface-primary border border-border/40 mb-6">
                  <p className="text-sm text-text-secondary leading-relaxed font-mono whitespace-pre-wrap">{proposal.reason}</p>
                </div>
                
                <div className="flex items-center justify-between border-t border-border/40 pt-6">
                  <div className="flex flex-wrap items-center gap-6 text-xs font-mono text-text-muted">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>Operator: <span className="text-text-primary font-medium">{proposal.createdBy}</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span className="font-mono">{formatTimestamp(proposal.createdAt)}</span>
                    </div>
                  </div>
                  
                  {proposal.status === 'PENDING_APPROVAL' && (
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setConfirmAction({ type: 'reject', id: proposal.id })}
                        className="px-6 py-2.5 text-xs font-mono font-bold rounded-sm border border-status-critical/30 bg-status-critical/10 text-status-critical hover:bg-status-critical/20 hover:border-status-critical/50 transition-all uppercase tracking-wide flex items-center gap-2"
                      >
                        <ShieldBan className="h-4 w-4" /> Reject
                      </button>
                      <button
                        onClick={() => setConfirmAction({ type: 'approve', id: proposal.id })}
                        className="px-6 py-2.5 text-xs font-mono font-bold rounded-sm border border-status-info/30 bg-status-info/10 text-status-info hover:bg-status-info/20 hover:border-status-info/50 transition-all uppercase tracking-wide flex items-center gap-2"
                      >
                        <CheckCircle2 className="h-4 w-4" /> Approve
                      </button>
                    </div>
                  )}
                </div>
                
              </div>
            ))}
          </div>
          {data && (
            <div className="mt-8 p-6 rounded-sm border border-border/40 bg-surface-primary">
              <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 px-6 rounded-sm border border-border/40 bg-surface-primary text-center">
          <div className="h-20 w-20 mb-6 rounded-sm bg-status-info/10 flex items-center justify-center border border-status-info/20">
            <Shield className="h-10 w-10 text-status-info" />
          </div>
          <h2 className="text-xl font-mono font-bold text-text-primary mb-2 tracking-wide">No response proposals</h2>
          <p className="text-sm font-mono text-text-muted max-w-lg">Response proposals will appear here when an incident triggers an automated security response.</p>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirm}
        title={confirmAction?.type === 'approve' ? 'Approve Response Proposal' : 'Reject Response Proposal'}
        description={confirmAction?.type === 'approve'
          ? 'This will approve the response proposal. In Safe Mode, no on-chain action will be taken.'
          : 'This will reject the response proposal. It cannot be undone.'
        }
        confirmText={confirmAction?.type === 'approve' ? 'Approve' : 'Reject'}
        variant={confirmAction?.type === 'reject' ? 'danger' : 'default'}
        loading={approveMutation.isPending || rejectMutation.isPending}
      />
    </DashboardLayout>
  );
}
