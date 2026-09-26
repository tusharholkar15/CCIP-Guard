'use client';

import React from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  Clock,
  Radio,
  FileCheck2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { formatTimestamp } from '@bridgeguard/shared';

export interface SecuritySignalItem {
  type: string;
  severity: string;
  title?: string;
  description?: string;
  observedValue?: number | string;
  threshold?: number | string;
  evidence?: string;
}

export interface SecuritySignalsTreeProps {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  signals: SecuritySignalItem[];
  evidence?: string[];
  route?: string;
  sourceChain?: string;
  destinationChain?: string;
  messageId?: string | null;
  detectedAt?: string;
  isSimulation?: boolean;
  className?: string;
  showExplainability?: boolean;
}

export function SecuritySignalsTree({
  riskLevel,
  signals = [],
  evidence = [],
  route,
  sourceChain,
  destinationChain,
  messageId,
  detectedAt,
  isSimulation = false,
  className = '',
  showExplainability = true,
}: SecuritySignalsTreeProps) {
  const [explainOpen, setExplainOpen] = React.useState(false);

  const routeDisplay =
    route ||
    (sourceChain && destinationChain
      ? `${sourceChain} → ${destinationChain}`
      : 'Cross-Chain Route');

  // Format signal label
  const formatSignalName = (type: string) => {
    return type.replace(/_/g, ' ').toUpperCase();
  };

  const riskBadgeColor =
    riskLevel === 'HIGH'
      ? 'text-status-critical border-status-critical/30 bg-status-critical/10'
      : riskLevel === 'MEDIUM'
      ? 'text-status-warning border-status-warning/30 bg-status-warning/10'
      : 'text-status-info border-status-info/30 bg-status-info/10';

  return (
    <div
      className={`rounded-sm border border-border/40 bg-surface-primary p-6 space-y-6 font-mono ${className}`}
    >
      {/* Top Header: Badge, Type, Simulation Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-4">
          <span
            className={`px-3 py-1 rounded-sm text-xs font-mono font-bold tracking-widest border ${riskBadgeColor}`}
          >
            {riskLevel} RISK
          </span>
          <span className="text-xs font-mono text-text-muted uppercase tracking-widest font-bold">
            {signals.length} {signals.length === 1 ? 'SIGNAL' : 'SIGNALS'} CORRELATED
          </span>
        </div>

        {/* DISTINGUISH REAL TELEMETRY vs SIMULATION */}
        {isSimulation ? (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm text-xs font-mono font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Radio className="h-4 w-4 animate-pulse text-amber-400" />
            <span>SIMULATION — NOT LIVE BLOCKCHAIN ACTIVITY</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm text-xs font-mono font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>REAL TELEMETRY</span>
          </div>
        )}
      </div>

      {/* Tree Visualization */}
      <div className="space-y-3">
        <div className="text-xs font-mono uppercase tracking-widest text-text-muted font-bold flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-text-muted" />
          <span>SECURITY SIGNALS</span>
        </div>

        <div className="p-4 bg-surface-primary rounded-sm border border-border/40 font-mono text-sm text-text-primary">
          <div className="font-bold tracking-widest text-text-primary mb-2">
            {riskLevel} RISK
          </div>
          {signals.map((sig, idx) => {
            const isLast = idx === signals.length - 1;
            const prefix = isLast ? '└── ' : '├── ';
            return (
              <div key={idx} className="flex items-start gap-2 py-1 pl-2">
                <span className="text-text-muted select-none">{prefix}</span>
                <span className="font-bold text-text-primary tracking-wide">
                  {formatSignalName(sig.type)}
                </span>
                {sig.severity && (
                  <span className="text-xs text-text-muted ml-2 font-bold tracking-widest">
                    ({sig.severity})
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Evidence & Route Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
        {/* Evidence List */}
        <div className="p-4 bg-surface-primary rounded-sm border border-border/40 space-y-3">
          <div className="font-mono text-xs uppercase tracking-widest text-text-muted font-bold">
            Evidence:
          </div>
          {evidence && evidence.length > 0 ? (
            <ul className="space-y-2 text-text-secondary list-disc list-inside">
              {evidence.map((ev, i) => (
                <li key={i} className="leading-relaxed">
                  <span className="font-mono text-xs text-text-primary">
                    {ev}
                  </span>
                </li>
              ))}
            </ul>
          ) : signals.length > 0 ? (
            <ul className="space-y-2 text-text-secondary list-disc list-inside">
              {signals.map((s, i) => (
                <li key={i} className="leading-relaxed">
                  <span className="font-mono text-xs text-text-primary">
                    {s.evidence || s.description}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-text-muted italic text-xs">No evidence recorded</p>
          )}
        </div>

        {/* Route and Metadata */}
        <div className="p-4 bg-surface-primary rounded-sm border border-border/40 space-y-4">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-text-muted font-bold mb-1">
              Route:
            </div>
            <div className="font-bold text-text-primary">
              {routeDisplay}
            </div>
          </div>

          {messageId && (
            <div>
              <div className="font-mono text-xs uppercase tracking-widest text-text-muted font-bold mb-1">
                Message ID:
              </div>
              <div className="font-mono text-xs text-text-secondary truncate">
                {messageId}
              </div>
            </div>
          )}

          {detectedAt && (
            <div className="flex items-center gap-2 text-text-muted text-xs font-mono font-bold mt-2 pt-2 border-t border-border/40">
              <Clock className="h-4 w-4" />
              <span>{formatTimestamp(detectedAt)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Explainability Accordion */}
      {showExplainability && (
        <div className="border-t border-border/40 pt-4">
          <button
            onClick={() => setExplainOpen(!explainOpen)}
            className="flex items-center justify-between w-full py-2 text-sm text-text-muted hover:text-text-primary transition-colors focus:outline-none"
          >
            <div className="flex items-center gap-3">
              <FileCheck2 className="h-4 w-4 text-status-info" />
              <span className="font-mono font-bold tracking-widest uppercase">
                Explainability & Detection Rationale
              </span>
            </div>
            {explainOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>

          {explainOpen && (
            <div className="mt-4 p-4 rounded-sm bg-surface-primary border border-border/40 space-y-4 text-xs font-mono">
              <div>
                <span className="font-bold text-text-primary block uppercase tracking-widest mb-1">
                  WHAT happened?
                </span>
                <p className="text-text-secondary leading-relaxed">
                  BridgeGuard correlated {signals.length} anomalous signals on{' '}
                  {routeDisplay}, triggering a{' '}
                  <span className="font-bold text-status-critical">
                    {riskLevel} RISK
                  </span>{' '}
                  security posture alert.
                </p>
              </div>

              <div>
                <span className="font-bold text-text-primary block uppercase tracking-widest mb-1">
                  WHY was it suspicious?
                </span>
                <p className="text-text-secondary leading-relaxed">
                  BridgeGuard does not label individual weak signals as
                  malicious. Detection occurs when multiple independent signals
                  (allowlist divergence, frequency anomalies, or volume spikes)
                  correlate simultaneously.
                </p>
              </div>

              <div>
                <span className="font-bold text-text-primary block uppercase tracking-widest mb-1">
                  WHAT evidence triggered detection?
                </span>
                <p className="text-text-secondary leading-relaxed">
                  {evidence.length > 0 ? evidence.join(' • ') : 'Configured detector thresholds exceeded.'}
                </p>
              </div>

              <div className="flex flex-wrap gap-6 pt-3 mt-3 border-t border-border/40 text-xs font-bold text-text-muted uppercase tracking-widest">
                <span>Lane: {routeDisplay}</span>
                {detectedAt && <span>Detected: {formatTimestamp(detectedAt)}</span>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
