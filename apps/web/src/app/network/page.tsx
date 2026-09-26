'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';

import { useChains, useLanes } from '@/hooks/useApi';
import { formatNumber } from '@bridgeguard/shared';
import { Network, Activity, ShieldCheck, ArrowRight, Cpu, ExternalLink, Route } from 'lucide-react';

export default function NetworkPage() {
  const { data: chainsData, isLoading: chainsLoading, error: chainsError, refetch: refetchChains } = useChains();
  const { data: lanesData, isLoading: lanesLoading, error: lanesError, refetch: refetchLanes } = useLanes();

  const [selectedLaneId, setSelectedLaneId] = useState<string>('');

  const lanes = lanesData?.data || [];
  const chains = chainsData?.data || [];

  // Default to Ethereum -> Arbitrum lane if available, else first lane
  const activeLane =
    lanes.find((l: any) => l.id === selectedLaneId) ||
    lanes.find((l: any) => l.sourceChainId === 1 && l.destinationChainId === 42161) ||
    lanes[0];

  const sourceChain = chains.find((c: any) => c.chainId === activeLane?.sourceChainId) || chains[0];
  const destChain = chains.find((c: any) => c.chainId === activeLane?.destinationChainId) || chains[1];

  const isLoading = chainsLoading || lanesLoading;
  const error = chainsError || lanesError;

  return (
    <DashboardLayout title="Network Topology">
      <PageHeader title="Cross-Chain Network" description="Live CCIP infrastructure visualization and endpoint health." />

      {error && (
        <ErrorState
          message="Unable to load network telemetry."
          onRetry={() => {
            refetchChains();
            refetchLanes();
          }}
          className="mb-8"
        />
      )}

      {/* Network Topology Visualization */}
      <div className="mb-10 p-8 rounded-sm border border-border/40 bg-surface-primary relative overflow-hidden">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Lane Selector Controls */}
        {lanes.length > 0 && (
          <div className="relative z-10 mb-8 flex flex-wrap items-center justify-between gap-6 pb-6 border-b border-border/40">
            <div className="flex items-center gap-3">
              <Route className="h-5 w-5 text-status-info" />
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-text-muted">ACTIVE TOPOLOGY ROUTE:</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {lanes.map((lane: any) => {
                const isSelected = activeLane?.id === lane.id;
                return (
                  <button
                    key={lane.id}
                    onClick={() => setSelectedLaneId(lane.id)}
                    className={`px-4 py-2 rounded-sm text-xs font-mono font-medium border transition-all flex items-center gap-2 ${
                      isSelected
                        ? 'bg-status-info/15 border-status-info/40 text-status-info'
                        : 'bg-surface-primary border-border/40 text-text-secondary hover:text-text-primary hover:border-border/60'
                    }`}
                  >
                    <span>{lane.sourceChainName}</span>
                    <ArrowRight className="h-4 w-4" />
                    <span>{lane.destinationChainName}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="relative z-10 flex flex-col items-center justify-center min-h-[300px]">
          {isLoading ? (
            <div className="animate-pulse flex flex-col md:flex-row gap-12 items-center">
              <div className="h-48 w-72 rounded-sm bg-surface-primary border border-border/40" />
              <div className="h-2 w-32 bg-surface-primary border border-border/40 rounded-sm" />
              <div className="h-48 w-72 rounded-sm bg-surface-primary border border-border/40" />
            </div>
          ) : sourceChain && destChain ? (
            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-0 w-full max-w-5xl mx-auto">
              {/* Source Chain */}
              <div className="flex-1 w-full relative group">
                <div className="absolute inset-0 bg-status-info/5 rounded-sm blur-xl group-hover:bg-status-info/10 transition-colors" />
                <div className="relative p-8 rounded-sm border border-border/40 bg-surface-primary hover:border-status-info/50 transition-colors">
                  <div className="flex items-start justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-sm bg-status-info/10 border border-status-info/20 flex items-center justify-center">
                        <Network className="h-7 w-7 text-status-info" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-mono font-bold text-text-primary tracking-wide">{sourceChain.displayName}</h3>
                        </div>
                        <p className="text-xs font-mono text-text-muted mt-1">Chain ID: {sourceChain.chainId}</p>
                      </div>
                    </div>
                    <StatusBadge status={sourceChain.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-6 pt-6 border-t border-border/40">
                    <div>
                      <span className="text-xs font-mono uppercase tracking-widest text-text-muted mb-2 block">Indexed Msgs</span>
                      <span className="text-base font-mono font-bold text-text-primary">{formatNumber(sourceChain.messagesCount)}</span>
                    </div>
                    <div>
                      <span className="text-xs font-mono uppercase tracking-widest text-text-muted mb-2 block">RPC Sync</span>
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-status-healthy" />
                        <span className="text-sm font-mono font-bold text-status-healthy">Live</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CCIP Lane Connection */}
              <div className="flex-shrink-0 w-2 md:w-40 h-40 md:h-2 flex flex-col md:flex-row items-center justify-center relative my-6 md:my-0">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full h-full md:h-[2px] md:w-full bg-border/40" />
                </div>

                {/* Animated Particles flowing right */}
                <div className="absolute hidden md:block w-full h-[2px] overflow-hidden">
                  <div
                    className="w-1/3 h-full bg-gradient-to-r from-transparent via-status-info to-transparent animate-[flowRight_2s_linear_infinite]"
                    style={{ animationName: 'flowRight' }}
                  />
                </div>
                <style
                  dangerouslySetInnerHTML={{
                    __html: `
                  @keyframes flowRight {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(300%); }
                  }
                `,
                  }}
                />

                <div className="relative z-10 px-4 py-2 rounded-sm bg-surface-primary border border-border/40 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-status-info" />
                  <span className="text-xs font-mono font-bold tracking-widest text-text-primary uppercase">CCIP V1.6</span>
                </div>
              </div>

              {/* Destination Chain */}
              <div className="flex-1 w-full relative group">
                <div className="absolute inset-0 bg-status-healthy/5 rounded-sm blur-xl group-hover:bg-status-healthy/10 transition-colors" />
                <div className="relative p-8 rounded-sm border border-border/40 bg-surface-primary hover:border-status-healthy/50 transition-colors">
                  <div className="flex items-start justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-sm bg-status-healthy/10 border border-status-healthy/20 flex items-center justify-center">
                        <Network className="h-7 w-7 text-status-healthy" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-mono font-bold text-text-primary tracking-wide">{destChain.displayName}</h3>
                        </div>
                        <p className="text-xs font-mono text-text-muted mt-1">Chain ID: {destChain.chainId}</p>
                      </div>
                    </div>
                    <StatusBadge status={destChain.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-6 pt-6 border-t border-border/40">
                    <div>
                      <span className="text-xs font-mono uppercase tracking-widest text-text-muted mb-2 block">Indexed Msgs</span>
                      <span className="text-base font-mono font-bold text-text-primary">{formatNumber(destChain.messagesCount)}</span>
                    </div>
                    <div>
                      <span className="text-xs font-mono uppercase tracking-widest text-text-muted mb-2 block">OffRamp Sync</span>
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-status-healthy" />
                        <span className="text-sm font-mono font-bold text-status-healthy">Live</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState title="No network telemetry available" description="Connect the indexer to begin monitoring." />
          )}
        </div>
      </div>

      {/* Monitored Network Endpoints Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Cpu className="h-5 w-5 text-status-info" />
            <h2 className="text-sm font-mono font-bold uppercase tracking-wide text-text-primary">
              Monitored Network Endpoints ({chains.length})
            </h2>
          </div>
          <span className="text-xs text-text-muted font-mono">CCIP Cross-Chain Targets</span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-56 rounded-sm animate-pulse bg-surface-primary border border-border/40" />
            ))}
          </div>
        ) : chains.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {chains.map((chain: any) => {
              return (
                <div
                  key={chain.id}
                  className="p-6 rounded-sm border border-border/40 bg-surface-primary hover:border-border/60 transition-all group relative overflow-hidden flex flex-col justify-between"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-status-info/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-mono font-bold text-text-primary group-hover:text-status-info transition-colors">
                          {chain.displayName}
                        </h3>
                      </div>
                      <StatusBadge status={chain.status} />
                    </div>

                    <div className="space-y-3 mt-6 pt-4 border-t border-border/40 text-xs font-mono">
                      <div className="flex justify-between items-center">
                        <span className="text-text-muted">Chain ID</span>
                        <span className="text-text-primary font-bold">{chain.chainId}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-text-muted">Status</span>
                        <div className="flex items-center gap-2">
                          <Activity className="h-3 w-3 text-status-healthy" />
                          <span className="text-status-healthy font-bold">Healthy</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-text-muted">Telemetry</span>
                        <span className="text-text-secondary">{formatNumber(chain.messagesCount)} msg</span>
                      </div>
                    </div>
                  </div>

                  {chain.explorerUrl && (
                    <div className="relative z-10 mt-6 pt-4 border-t border-border/40">
                      <a
                        href={chain.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-mono font-bold text-status-info hover:text-status-info/80 transition-colors flex items-center gap-2"
                      >
                        <span>View Block Explorer</span>
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState title="No chains registered" description="No network endpoint records found in database." />
        )}
      </div>
    </DashboardLayout>
  );
}
