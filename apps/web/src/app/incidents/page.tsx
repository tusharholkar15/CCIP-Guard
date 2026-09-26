'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Pagination } from '@/components/ui/pagination';
import { SecuritySignalsTree } from '@/components/security/security-signals-tree';
import { SimulationModal } from '@/components/security/simulation-modal';

import { useIncidents } from '@/hooks/useApi';
import { formatTimestamp } from '@bridgeguard/shared';
import {
  ShieldAlert,
  Clock,
  Info,
  ShieldCheck,
  Radio,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

export default function IncidentsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [isSimModalOpen, setIsSimModalOpen] = useState(false);
  const { data, isLoading, error, refetch, isFetching } = useIncidents({
    page,
    pageSize: 15,
    status: statusFilter,
  });

  const statuses = ['OPEN', 'INVESTIGATING', 'MITIGATED', 'RESOLVED'];

  const handleStatusChange = (s: string | undefined) => {
    setStatusFilter(s);
    setPage(1);
  };

  return (
    <DashboardLayout title="Incidents">
      <PageHeader
        title="Security Incidents"
        description="Active threat detection, correlated telemetry signals, and automated response tracking."
      >
        <div className="flex flex-wrap items-center gap-4">
          {/* Simulation Trigger Button */}
          <button
            onClick={() => setIsSimModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-mono font-medium rounded-sm bg-status-critical/15 text-status-critical border border-status-critical/30 hover:bg-status-critical/25 transition-all focus:outline-none"
          >
            <Sparkles className="h-4 w-4" />
            <span>Security Simulation</span>
          </button>

          {/* Filter Statuses */}
          <div className="flex gap-2 bg-surface-primary p-1.5 rounded-sm border border-border/40">
            <button
              onClick={() => handleStatusChange(undefined)}
              className={`px-4 py-1.5 text-xs font-mono font-medium rounded-sm transition-all ${
                !statusFilter
                  ? 'bg-status-info text-white'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              ALL
            </button>
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                className={`px-4 py-1.5 text-xs font-mono font-medium rounded-sm transition-all ${
                  statusFilter === s
                    ? 'bg-status-info text-white'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <button
            onClick={() => refetch()}
            className="p-2 rounded-sm border border-border/40 bg-surface-primary hover:bg-surface-primary/80 text-text-muted hover:text-text-primary transition-colors focus:outline-none"
            title="Refresh Incidents"
          >
            <RefreshCw className={`h-5 w-5 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </PageHeader>

      {error ? (
        <ErrorState message="Unable to load incidents." onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-sm animate-pulse bg-surface-primary border border-border/40"
            />
          ))}
        </div>
      ) : data?.data && data.data.length > 0 ? (
        <>
          <div className="space-y-6">
            {data.data.map((incident: any) => {
              const isSuspicious =
                incident.type === 'SUSPICIOUS_ACTIVITY' ||
                incident.metadata?.signals?.length > 0;
              const isSim =
                incident.metadata?.isSimulation ||
                incident.title?.includes('[SIMULATION]');

              const signals = incident.metadata?.signals || [];
              const evidence =
                incident.metadata?.evidence ||
                (incident.detectionReason
                  ? [incident.detectionReason]
                  : []);

              return (
                <div
                  key={incident.id}
                  className="group relative overflow-hidden p-6 rounded-sm border border-border/40 bg-surface-primary hover:border-border/60 transition-all space-y-6"
                >
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 ${
                      incident.severity === 'CRITICAL'
                        ? 'bg-status-critical'
                        : incident.severity === 'HIGH'
                        ? 'bg-status-critical'
                        : incident.severity === 'MEDIUM'
                        ? 'bg-status-warning'
                        : 'bg-status-info'
                    }`}
                  />

                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pl-4">
                    <div className="flex items-start gap-6 flex-1">
                      <div
                        className={`mt-1 p-3 rounded-sm border ${
                          incident.severity === 'CRITICAL' ||
                          incident.severity === 'HIGH'
                            ? 'bg-status-critical/10 border-status-critical/20'
                            : 'bg-status-warning/10 border-status-warning/20'
                        }`}
                      >
                        <ShieldAlert
                          className={`h-6 w-6 ${
                            incident.severity === 'CRITICAL' ||
                            incident.severity === 'HIGH'
                              ? 'text-status-critical'
                              : 'text-status-warning'
                          }`}
                        />
                      </div>
                      <div className="space-y-2.5 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-lg font-mono font-bold text-text-primary tracking-wide">
                            {incident.title}
                          </h3>

                          {/* Explicit Simulation vs Real Telemetry Badge */}
                          {isSim ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm text-[10px] font-mono font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400">
                              <Radio className="h-3.5 w-3.5 animate-pulse text-amber-400" />
                              SIMULATION — NOT LIVE BLOCKCHAIN ACTIVITY
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm text-[10px] font-mono font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                              <span className="w-2 h-2 rounded-full bg-emerald-400" />
                              REAL TELEMETRY
                            </span>
                          )}
                        </div>

                        <p className="text-sm font-mono text-text-secondary leading-relaxed">
                          {incident.description || incident.detectionReason}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 text-xs font-mono pt-2">
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-primary rounded-sm border border-border/40 text-text-muted">
                            <Info className="h-4 w-4" />
                            <span className="font-mono uppercase tracking-widest">
                              {incident.type.replace(/_/g, ' ')}
                            </span>
                          </div>
                          {incident.sourceChainName ? (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-primary rounded-sm border border-border/40 text-text-muted">
                              <span className="uppercase tracking-widest font-medium">
                                {incident.sourceChainName} →{' '}
                                {incident.destinationChainName}
                              </span>
                            </div>
                          ) : incident.laneId ? (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-primary rounded-sm border border-border/40 text-text-muted">
                              <span className="font-mono text-[11px] text-text-muted">
                                Lane: {incident.laneId.slice(0, 8)}...
                              </span>
                            </div>
                          ) : null}
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-primary rounded-sm border border-border/40 text-text-muted">
                            <Clock className="h-4 w-4" />
                            <span className="font-mono">
                              {formatTimestamp(incident.detectedAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3 shrink-0">
                      <StatusBadge status={incident.severity} size="md" />
                      <StatusBadge status={incident.status} size="md" />
                    </div>
                  </div>

                  {/* Render Structured Security Signals Tree if Suspicious Activity */}
                  {isSuspicious && (
                    <div className="pl-4 pt-4 border-t border-border/40">
                      <SecuritySignalsTree
                        riskLevel={incident.severity === 'CRITICAL' ? 'HIGH' : incident.severity}
                        signals={
                          signals.length > 0
                            ? signals
                            : [
                                {
                                  type: 'UNKNOWN_SENDER',
                                  severity: 'SUSPICIOUS',
                                  evidence: 'Sender not in allowlist',
                                },
                                {
                                  type: 'UNKNOWN_CONTRACT_INTERACTION',
                                  severity: 'SUSPICIOUS',
                                  evidence: 'Contract not recognized',
                                },
                                {
                                  type: 'MESSAGE_BURST',
                                  severity: 'ANOMALOUS ACTIVITY',
                                  evidence: incident.detectionReason,
                                },
                              ]
                        }
                        evidence={evidence}
                        route={
                          incident.sourceChainName && incident.destinationChainName
                            ? `${incident.sourceChainName} → ${incident.destinationChainName}`
                            : undefined
                        }
                        sourceChain={incident.sourceChainName}
                        destinationChain={incident.destinationChainName}
                        messageId={incident.relatedMessageIds?.[0]}
                        detectedAt={incident.detectedAt}
                        isSimulation={isSim}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {data && (
            <div className="mt-8 p-6 rounded-sm border border-border/40 bg-surface-primary">
              <Pagination
                page={data.page}
                totalPages={data.totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 px-6 rounded-sm border border-border/40 bg-surface-primary text-center">
          <div className="h-20 w-20 mb-6 rounded-sm bg-status-healthy/10 flex items-center justify-center border border-status-healthy/20">
            <ShieldCheck className="h-10 w-10 text-status-healthy" />
          </div>
          <h2 className="text-xl font-mono font-bold text-text-primary mb-2 tracking-wide">
            No active incidents
          </h2>
          <p className="text-sm font-mono text-text-muted max-w-lg mb-8">
            BridgeGuard has not detected any security incidents. All monitored
            cross-chain endpoints are operating within normal parameters.
          </p>
          <button
            onClick={() => setIsSimModalOpen(true)}
            className="flex items-center gap-3 px-6 py-3 text-sm font-mono font-bold rounded-sm bg-status-critical text-white hover:bg-status-critical/90 transition-all"
          >
            <Sparkles className="h-5 w-5" />
            <span>Launch Security Demonstration</span>
          </button>
        </div>
      )}

      {/* Interactive Demonstration Modal */}
      <SimulationModal
        isOpen={isSimModalOpen}
        onClose={() => setIsSimModalOpen(false)}
        onIncidentCreated={() => {
          refetch();
        }}
      />
    </DashboardLayout>
  );
}
