'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';

import { useLanes } from '@/hooks/useApi';
import { formatNumber, formatLatency, chainIdToSelector } from '@bridgeguard/shared';
import { Route, ArrowRight, TrendingUp, AlertCircle, Activity, ShieldCheck } from 'lucide-react';

function getSelectorStr(chainId: number): string | null {
  try {
    const sel = chainIdToSelector(chainId);
    return sel && sel !== BigInt(0) ? sel.toString() : null;
  } catch {
    return null;
  }
}

export default function LanesPage() {
  const { data, isLoading, error, refetch } = useLanes();

  return (
    <DashboardLayout title="CCIP Lanes">
      <PageHeader title="Lane Metrics" description="Cross-chain lane health, throughput, and latency percentiles." />

      {error ? (
        <ErrorState message="Unable to load lane data." onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-64 rounded-sm animate-pulse bg-surface-primary border border-border/40" />
          ))}
        </div>
      ) : data?.data && data.data.length > 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {data.data.map((lane: any) => {
            const srcSelector = getSelectorStr(lane.sourceChainId);
            const dstSelector = getSelectorStr(lane.destinationChainId);

            return (
              <div key={lane.id} className="rounded-sm border border-border/40 bg-surface-primary overflow-hidden transition-all group flex flex-col justify-between">
                <div className="p-8 border-b border-border/40 bg-surface-primary">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-sm bg-status-info/10 border border-status-info/20">
                        <Route className="h-5 w-5 text-status-info" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wide">{lane.sourceChainName}</h3>
                          <ArrowRight className="h-4 w-4 text-text-muted" />
                          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wide">{lane.destinationChainName}</h3>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-mono text-text-muted mt-1.5 flex-wrap">
                          <span>
                            Chain <strong className="text-text-primary">{lane.sourceChainId}</strong>
                          </span>
                          <span>→</span>
                          <span>
                            Chain <strong className="text-text-primary">{lane.destinationChainId}</strong>
                          </span>
                          <span className="text-border-light">•</span>
                          <span className="flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3 text-status-info" />
                            <span>CCIP v1.6</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <StatusBadge status={lane.status} />
                    </div>
                  </div>

                  {/* CCIP Selector Configuration Bar */}
                  {(srcSelector || dstSelector) && (
                    <div className="mb-6 px-4 py-3 rounded-sm bg-surface-primary border border-border/40 text-xs font-mono flex flex-wrap items-center justify-between gap-2 text-text-muted">
                      {srcSelector && (
                        <div>
                          <span className="text-xs uppercase text-text-muted mr-1">Src Selector:</span>
                          <span className="text-text-primary">{srcSelector}</span>
                        </div>
                      )}
                      {dstSelector && (
                        <div>
                          <span className="text-xs uppercase text-text-muted mr-1">Dst Selector:</span>
                          <span className="text-text-primary">{dstSelector}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-6 pt-2">
                    <div className="bg-surface-primary p-4 rounded-sm border border-border/40">
                      <div className="flex items-center gap-1.5 mb-1 text-text-muted">
                        <Activity className="h-3 w-3" />
                        <span className="text-xs font-mono uppercase tracking-widest font-medium">Messages</span>
                      </div>
                      <p className="text-xl font-mono text-text-primary">{formatNumber(lane.messageCount)}</p>
                    </div>
                    <div className="bg-surface-primary p-4 rounded-sm border border-border/40">
                      <div className="flex items-center gap-1.5 mb-1 text-status-critical">
                        <AlertCircle className="h-3 w-3" />
                        <span className="text-xs font-mono uppercase tracking-widest font-medium">Failures</span>
                      </div>
                      <p className="text-xl font-mono text-text-primary">{formatNumber(lane.failureCount)}</p>
                    </div>
                    <div className="bg-surface-primary p-4 rounded-sm border border-border/40">
                      <div className="flex items-center gap-1.5 mb-1 text-status-warning">
                        <TrendingUp className="h-3 w-3" />
                        <span className="text-xs font-mono uppercase tracking-widest font-medium">Backlog</span>
                      </div>
                      <p className="text-xl font-mono text-text-primary">{formatNumber(lane.backlog)}</p>
                    </div>
                  </div>
                </div>

                <div className="p-8 bg-surface-primary">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-mono font-medium text-text-muted uppercase tracking-widest">Latency Distribution</h4>
                    <span className="text-xs font-mono text-text-muted">Lane ID: {lane.id.slice(0, 8)}...</span>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    {[
                      { label: 'P50', value: lane.latencyP50, color: 'text-text-primary' },
                      { label: 'P90', value: lane.latencyP90, color: 'text-text-primary' },
                      { label: 'P95', value: lane.latencyP95, color: 'text-status-warning' },
                      { label: 'P99', value: lane.latencyP99, color: 'text-status-critical' },
                    ].map((p) => (
                      <div key={p.label} className="flex flex-col gap-1 items-center justify-center p-4 rounded-sm border border-border/40 bg-surface-primary relative overflow-hidden transition-colors">
                        <span className="text-xs font-mono font-medium text-text-muted">{p.label}</span>
                        <span className={`text-sm font-mono font-medium ${p.color}`}>{formatLatency(p.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState title="No lanes active" description="Lanes will appear when cross-chain traffic is detected." />
      )}
    </DashboardLayout>
  );
}
