'use client';

import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  Play,
  CheckCircle2,
  AlertTriangle,
  Info,
  Radio,
  Flame,
  ArrowRight,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import {
  useSimulationScenarios,
  useRunSimulationDetect,
  useRunSimulationIncident,
} from '@/hooks/useApi';
import { SecuritySignalsTree } from './security-signals-tree';

interface SimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIncidentCreated?: () => void;
}

export function SimulationModal({
  isOpen,
  onClose,
  onIncidentCreated,
}: SimulationModalProps) {
  const { data: scenariosData, isLoading: scenariosLoading } = useSimulationScenarios();
  const scenarios = scenariosData?.data || [];

  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(
    'multi-signal-burst-attack',
  );
  const [simulationResult, setSimulationResult] = useState<any | null>(null);
  const [createdIncidentResult, setCreatedIncidentResult] = useState<any | null>(null);

  const detectMutation = useRunSimulationDetect();
  const incidentMutation = useRunSimulationIncident();

  if (!isOpen) return null;

  const currentScenario = scenarios.find((s) => s.id === selectedScenarioId);

  const handleDryRun = async () => {
    setCreatedIncidentResult(null);
    try {
      const res = await detectMutation.mutateAsync({ scenarioId: selectedScenarioId });
      setSimulationResult(res.result);
    } catch (err: any) {
      console.error('Simulation dry run failed:', err);
    }
  };

  const handleDeployToSoc = async () => {
    try {
      const res = await incidentMutation.mutateAsync(selectedScenarioId);
      setCreatedIncidentResult(res);
      setSimulationResult(res.riskResult);
      if (onIncidentCreated) {
        onIncidentCreated();
      }
    } catch (err: any) {
      console.error('Simulation incident generation failed:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-bg-primary/90 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-sm border border-border/40 bg-surface-primary overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-border/40 bg-surface-primary flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-sm bg-status-critical/10 border border-status-critical/30 text-status-critical">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-mono font-bold text-text-primary tracking-widest uppercase flex items-center gap-3">
                <span>Security Threat Demonstration</span>
                <span className="px-3 py-1 rounded-sm text-xs font-mono font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  SAFE SIMULATION
                </span>
              </h2>
              <p className="text-sm font-mono text-text-muted mt-1">
                Multi-signal suspicious cross-chain correlation engine
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-sm hover:bg-surface-primary/80 text-text-muted hover:text-text-primary transition-colors border border-transparent hover:border-border/40"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Safety Callout Banner */}
        <div className="px-6 py-4 bg-amber-950/20 border-b border-amber-800/30 flex items-center gap-3 text-sm font-mono text-amber-300">
          <Radio className="h-5 w-5 shrink-0 text-amber-400 animate-pulse" />
          <span>
            <strong>SAFE SIMULATION GUARANTEE:</strong> Never sends blockchain
            transactions, never interacts with wallets, and never uses private keys.
          </span>
        </div>

        {/* Body Content */}
        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
          {/* Scenario Selector */}
          <div>
            <label className="text-xs font-mono uppercase tracking-widest text-text-muted font-bold block mb-4">
              Select Threat Scenario
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {scenarios.map((sc) => {
                const isSelected = sc.id === selectedScenarioId;
                const riskColor =
                  sc.expectedRiskLevel === 'HIGH'
                    ? 'text-status-critical border-status-critical/30 bg-status-critical/10'
                    : sc.expectedRiskLevel === 'MEDIUM'
                    ? 'text-status-warning border-status-warning/30 bg-status-warning/10'
                    : 'text-status-info border-status-info/30 bg-status-info/10';

                return (
                  <button
                    key={sc.id}
                    onClick={() => {
                      setSelectedScenarioId(sc.id);
                      setSimulationResult(null);
                      setCreatedIncidentResult(null);
                    }}
                    className={`p-4 rounded-sm border text-left transition-all ${
                      isSelected
                        ? 'border-status-info bg-surface-primary ring-1 ring-status-info/50'
                        : 'border-border/40 bg-surface-primary hover:border-border/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="font-mono font-bold text-sm text-text-primary truncate uppercase">
                        {sc.name}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-sm text-xs font-mono font-bold border ${riskColor}`}
                      >
                        {sc.expectedRiskLevel}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-text-muted line-clamp-2 leading-relaxed">
                      {sc.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scenario Details Card */}
          {currentScenario && (
            <div className="p-6 rounded-sm border border-border/40 bg-surface-primary space-y-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono uppercase tracking-widest text-text-muted font-bold">
                  Telemetry Parameters
                </span>
                <span className="text-xs font-mono text-status-info uppercase tracking-widest font-bold">
                  {currentScenario.category}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-mono">
                <div className="p-3 rounded-sm bg-surface-primary border border-border/40">
                  <span className="text-[10px] uppercase tracking-widest text-text-muted block mb-1">Route</span>
                  <span className="text-text-primary truncate block font-bold">
                    {currentScenario.context.sourceChainName} →{' '}
                    {currentScenario.context.destinationChainName}
                  </span>
                </div>

                <div className="p-3 rounded-sm bg-surface-primary border border-border/40">
                  <span className="text-[10px] uppercase tracking-widest text-text-muted block mb-1">Sender</span>
                  <span className="text-text-primary truncate block">
                    {currentScenario.context.sender?.slice(0, 10)}...
                  </span>
                </div>

                <div className="p-3 rounded-sm bg-surface-primary border border-border/40">
                  <span className="text-[10px] uppercase tracking-widest text-text-muted block mb-1">Receiver</span>
                  <span className="text-text-primary truncate block">
                    {currentScenario.context.receiver?.slice(0, 10)}...
                  </span>
                </div>

                <div className="p-3 rounded-sm bg-surface-primary border border-border/40">
                  <span className="text-[10px] uppercase tracking-widest text-text-muted block mb-1">Burst Count</span>
                  <span className="text-text-primary block font-bold">
                    {currentScenario.context.laneMessageCountWindow || 1} msgs /{' '}
                    {currentScenario.context.laneWindowSeconds || 60}s
                  </span>
                </div>

                <div className="p-3 rounded-sm bg-surface-primary border border-border/40">
                  <span className="text-[10px] uppercase tracking-widest text-text-muted block mb-1">Latency</span>
                  <span className="text-text-primary block font-bold">
                    {currentScenario.context.latencyMs || 0}ms
                  </span>
                </div>

                <div className="p-3 rounded-sm bg-surface-primary border border-border/40">
                  <span className="text-[10px] uppercase tracking-widest text-text-muted block mb-1">Expected Signals</span>
                  <span className="text-status-warning block font-bold">
                    {currentScenario.expectedSignals.length} signals
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action Trigger Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={handleDryRun}
              disabled={detectMutation.isPending || incidentMutation.isPending}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-sm border border-border/40 bg-surface-primary hover:bg-surface-primary/80 text-text-primary font-mono font-bold text-sm uppercase tracking-widest transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`h-5 w-5 ${detectMutation.isPending ? 'animate-spin' : ''}`}
              />
              <span>Run In-Memory Dry Run</span>
            </button>

            <button
              onClick={handleDeployToSoc}
              disabled={detectMutation.isPending || incidentMutation.isPending}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-sm bg-status-critical text-white font-mono font-bold text-sm uppercase tracking-widest hover:bg-status-critical/90 transition-all disabled:opacity-50"
            >
              <Play
                className={`h-5 w-5 fill-current ${
                  incidentMutation.isPending ? 'animate-pulse' : ''
                }`}
              />
              <span>Demonstrate Incident</span>
            </button>
          </div>

          {/* Notice after deploying incident */}
          {createdIncidentResult && (
            <div className="p-4 rounded-sm bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3 text-sm font-mono text-emerald-300">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-emerald-300 mb-1">
                  {createdIncidentResult.incident
                    ? 'Security incident and active alert successfully generated for SOC demonstration!'
                    : createdIncidentResult.message || 'Simulation evaluated.'}
                </p>
                <p className="text-emerald-400/80 text-xs">
                  Viewable under /incidents, /alerts, and /audit with the explicit{' '}
                  <span className="font-bold border-b border-emerald-400/50 pb-0.5">
                    SIMULATION — NOT LIVE BLOCKCHAIN ACTIVITY
                  </span>{' '}
                  badge.
                </p>
              </div>
            </div>
          )}

          {/* Result Tree View */}
          {simulationResult && (
            <div className="space-y-4">
              <div className="text-xs font-mono uppercase tracking-widest text-text-muted font-bold">
                Detection Engine Output
              </div>
              <SecuritySignalsTree
                riskLevel={simulationResult.riskLevel}
                signals={simulationResult.signals}
                evidence={simulationResult.evidence}
                route={simulationResult.lane}
                sourceChain={simulationResult.sourceChain}
                destinationChain={simulationResult.destinationChain}
                messageId={simulationResult.messageId}
                detectedAt={simulationResult.detectedAt}
                isSimulation={true}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border/40 bg-surface-primary flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-sm border border-border/40 bg-surface-primary hover:bg-surface-primary/80 text-sm font-mono font-bold uppercase tracking-widest text-text-muted hover:text-text-primary transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
