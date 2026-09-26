'use client';
// Trigger Fast Refresh 2



import { useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { MetricCard } from '@/components/ui/metric-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { SimulationModal } from '@/components/security/simulation-modal';
import { useDashboardStats, useChains, useMessages, useIncidents, useAlerts } from '@/hooks/useApi';
import { Network, MessageSquare, CheckCircle, AlertTriangle, Bell, Clock, Activity, ArrowRight, ShieldAlert, Cpu, Radio, Sparkles } from 'lucide-react';

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

function formatPercentage(num: number): string {
  return `${(num * 100).toFixed(1)}%`;
}

function formatLatency(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = s / 60;
  return `${m.toFixed(1)}m`;
}

export default function OverviewPage() {
  const [isSimModalOpen, setIsSimModalOpen] = useState(false);
  const { data: statsData, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useDashboardStats();
  const stats = statsData;
  const { data: chainsData, isLoading: chainsLoading } = useChains();
  const { data: messagesData, isLoading: messagesLoading } = useMessages({ pageSize: 5 });
  const { data: incidentsData, isLoading: incidentsLoading, refetch: refetchIncidents } = useIncidents({ status: 'OPEN', pageSize: 5 });
  const { data: alertsData, isLoading: alertsLoading } = useAlerts({ status: 'ACTIVE', pageSize: 5 });

  return (
    <DashboardLayout title="Overview">
      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <MetricCard
          label="Monitored Networks"
          value={stats?.networks !== undefined ? formatNumber(stats.networks) : '--'}
          icon={Network}
          loading={statsLoading}
          description="Active cross-chain endpoints"
          statusColor="info"
        />
        <MetricCard
          label="Total Messages"
          value={stats?.messages !== undefined ? formatNumber(stats.messages) : '--'}
          icon={MessageSquare}
          loading={statsLoading}
          description="CCIP transactions indexed"
          statusColor="neutral"
        />
        <MetricCard
          label="Delivery Success"
          value={stats?.successRate !== null && stats?.successRate !== undefined ? formatPercentage(stats.successRate) : '--'}
          icon={CheckCircle}
          loading={statsLoading}
          description="End-to-end execution rate"
          statusColor={stats?.successRate === 1 ? 'healthy' : 'warning'}
        />
        <MetricCard
          label="Avg Latency"
          value={stats?.averageLatency !== null && stats?.averageLatency !== undefined ? formatLatency(stats.averageLatency) : '--'}
          icon={Clock}
          loading={statsLoading}
          description="Global cross-chain delay"
          statusColor="info"
        />
      </div>

      {statsError && (
        <ErrorState
          message="Unable to load dashboard statistics."
          details={JSON.stringify(statsError)}
          onRetry={() => refetchStats()}
          className="mb-8"
        />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Column: Network & Messages */}
        <div className="xl:col-span-2 space-y-8">
          
          {/* Network Health */}
          <section className="bg-surface-primary border border-border/40 rounded-sm overflow-hidden">
            <div className="p-6 border-b border-border/40 bg-surface-primary flex items-center gap-4">
              <Activity className="h-5 w-5 text-status-healthy" />
              <h3 className="text-sm font-mono font-bold text-text-primary tracking-widest uppercase">NETWORK HEALTH</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {chainsLoading ? (
                  <>
                    <MetricCard label="" value="" loading />
                    <MetricCard label="" value="" loading />
                  </>
                ) : chainsData?.data && chainsData.data.length > 0 ? (
                  chainsData.data.map((chain: any) => (
                    <div key={chain.id} className="p-6 rounded-sm border border-border/40 bg-surface-primary hover:border-border/60 transition-colors group relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-status-info/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative z-10 flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <Cpu className="h-5 w-5 text-text-muted" />
                          <h4 className="text-sm font-mono font-bold text-text-primary uppercase tracking-widest">{chain.displayName}</h4>
                        </div>
                        <StatusBadge status={chain.status} />
                      </div>
                      <div className="relative z-10 grid grid-cols-2 gap-6">
                        <div>
                          <span className="text-xs uppercase tracking-widest font-bold text-text-muted block mb-2 font-mono">Chain ID</span>
                          <p className="font-mono text-sm text-text-secondary">{chain.chainId}</p>
                        </div>
                        <div>
                          <span className="text-xs uppercase tracking-widest font-bold text-text-muted block mb-2 font-mono">Telemetry</span>
                          <p className="font-mono text-sm text-text-secondary">{formatNumber(chain.messagesCount)} msg</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2">
                    <EmptyState title="No network telemetry" description="BridgeGuard is waiting for CCIP events." />
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Recent Messages */}
          <section className="bg-surface-primary border border-border/40 rounded-sm overflow-hidden">
            <div className="p-6 border-b border-border/40 bg-surface-primary flex items-center justify-between">
              <div className="flex items-center gap-4">
                <MessageSquare className="h-5 w-5 text-status-info" />
                <h3 className="text-sm font-mono font-bold text-text-primary tracking-widest uppercase">RECENT ACTIVITY</h3>
              </div>
              <Link href="/messages" className="text-xs font-mono font-bold uppercase tracking-widest text-status-info hover:text-status-info/80 transition-colors flex items-center gap-2">
                View All <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="p-0">
              {messagesLoading ? (
                <div className="p-6 animate-pulse space-y-6">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-16 rounded-sm bg-surface-primary border border-border/40" />
                  ))}
                </div>
              ) : messagesData?.data && messagesData.data.length > 0 ? (
                <div className="divide-y divide-border/40">
                  {messagesData.data.map((msg: any) => (
                    <div key={msg.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 hover:bg-surface-primary/80 transition-colors gap-6">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-4">
                          <span className="font-mono text-sm font-bold text-text-primary">
                            {msg.ccipMessageId ? `${msg.ccipMessageId.slice(0, 14)}...${msg.ccipMessageId.slice(-10)}` : '--'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-mono font-medium text-text-muted">
                          <span>{msg.sourceChainName || 'Unknown'}</span>
                          <ArrowRight className="h-3 w-3 text-border-light" />
                          <span>{msg.destinationChainName || 'Unknown'}</span>
                          <span className="mx-2 text-border-light">•</span>
                          <span>{new Date(msg.createdAt).toLocaleTimeString()}</span>
                        </div>
                      </div>
                      <div className="shrink-0">
                        <StatusBadge status={msg.state} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8">
                  <EmptyState title="No messages indexed yet" description="Live CCIP telemetry will appear here." />
                </div>
              )}
            </div>
          </section>

        </div>

        {/* Right Column: CCIP Demo + Security Center */}
        <div className="space-y-8">

          <section className="bg-surface-primary border border-border/40 rounded-sm overflow-hidden">
            <div className="p-6 border-b border-border/40 bg-surface-primary flex items-center justify-between">
              <div className="flex items-center gap-4">
                <ShieldAlert className="h-5 w-5 text-status-critical" />
                <h3 className="text-sm font-mono font-bold text-text-primary tracking-widest uppercase">ACTIVE INCIDENTS</h3>
              </div>
              <button
                onClick={() => setIsSimModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono font-bold tracking-widest rounded-sm bg-status-critical/15 text-status-critical border border-status-critical/30 hover:bg-status-critical/25 transition-all uppercase"
              >
                <Sparkles className="h-4 w-4" />
                <span>Simulate Threat</span>
              </button>
            </div>
            <div className="p-4">
              {incidentsLoading ? (
                <div className="p-4 animate-pulse space-y-4">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="h-24 rounded-sm bg-surface-primary border border-border/40" />
                  ))}
                </div>
              ) : incidentsData?.data && incidentsData.data.length > 0 ? (
                <div className="space-y-4 p-2">
                  {incidentsData.data.map((incident: any) => {
                    const isSim = incident.metadata?.isSimulation || incident.title?.includes('[SIMULATION]');
                    return (
                      <Link
                        key={incident.id}
                        href="/incidents"
                        className="block p-5 rounded-sm border border-border/40 bg-surface-primary hover:border-border/60 transition-all relative overflow-hidden group"
                      >
                        <div className="absolute left-0 top-0 w-1 h-full bg-status-critical" />
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-mono font-bold text-text-primary group-hover:text-status-info transition-colors truncate">
                            {incident.title}
                          </span>
                          <StatusBadge status={incident.severity} />
                        </div>
                        {isSim && (
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm text-xs font-mono font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-3">
                            <Radio className="h-3 w-3 animate-pulse text-amber-400" />
                            <span>SIMULATION</span>
                          </div>
                        )}
                        <p className="text-xs font-mono text-text-secondary line-clamp-2 leading-relaxed">{incident.detectionReason}</p>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <EmptyState title="No active incidents" description="Security posture is optimal." />
                  <button
                    onClick={() => setIsSimModalOpen(true)}
                    className="mt-6 inline-flex items-center gap-2 px-6 py-3 text-xs font-mono font-bold uppercase tracking-widest rounded-sm bg-status-critical text-white hover:bg-status-critical/90 transition-all"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Test Threat Simulator</span>
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className="bg-surface-primary border border-border/40 rounded-sm overflow-hidden">
            <div className="p-6 border-b border-border/40 bg-surface-primary flex items-center gap-4">
              <Bell className="h-5 w-5 text-status-warning" />
              <h3 className="text-sm font-mono font-bold text-text-primary tracking-widest uppercase">SYSTEM ALERTS</h3>
            </div>
            <div className="p-4">
              {alertsLoading ? (
                <div className="p-4 animate-pulse space-y-4">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="h-20 rounded-sm bg-surface-primary border border-border/40" />
                  ))}
                </div>
              ) : alertsData?.data && alertsData.data.length > 0 ? (
                <div className="space-y-4 p-2">
                  {alertsData.data.map((alert: any) => (
                    <div key={alert.id} className="p-5 rounded-sm border border-border/40 bg-surface-primary relative">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-mono font-bold text-text-primary uppercase tracking-widest">{alert.type.replace(/_/g, ' ')}</span>
                        <StatusBadge status={alert.status} />
                      </div>
                      <p className="text-xs font-mono text-text-secondary">{alert.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8">
                  <EmptyState title="No active alerts" description="All monitors are quiet." />
                </div>
              )}
            </div>
          </section>

        </div>
      </div>

      {/* Security Simulation Modal */}
      <SimulationModal
        isOpen={isSimModalOpen}
        onClose={() => setIsSimModalOpen(false)}
        onIncidentCreated={() => {
          refetchStats();
          refetchIncidents();
        }}
      />
    </DashboardLayout>
  );
}
