import {
  type SecuritySignal,
  type SecurityRiskLevel,
  type CorrelatedRiskResult,
  type SecurityTelemetryContext,
  type DetectorConfig,
} from './types.js';
import { DEFAULT_DETECTOR_CONFIG } from './config.js';
import { evaluateAllDetectors } from './detectors.js';

/**
 * Calculates correlated risk level based on the count of distinct anomalous signals.
 * Configurable thresholds:
 * - 0 signals: 'LOW' (normal)
 * - 1 signal:  'LOW' (suspicious / isolated anomaly, never labeled high-risk or malicious alone)
 * - 2 signals: 'MEDIUM' (suspicious multi-factor anomaly)
 * - 3+ signals: 'HIGH' (high-risk cross-chain activity)
 */
export function calculateRiskLevel(
  signalCount: number,
  config: DetectorConfig = DEFAULT_DETECTOR_CONFIG,
): SecurityRiskLevel {
  if (signalCount >= config.riskThresholds.high) {
    return 'HIGH';
  }
  if (signalCount >= config.riskThresholds.medium) {
    return 'MEDIUM';
  }
  return 'LOW';
}

/**
 * Correlates detected security signals and returns structured risk analysis
 * with strictly measurable evidence.
 */
export function correlateSignals(
  signals: SecuritySignal[],
  context: SecurityTelemetryContext,
  config: DetectorConfig = DEFAULT_DETECTOR_CONFIG,
  isSimulation: boolean = false,
): CorrelatedRiskResult {
  const signalCount = signals.length;
  const riskLevel = calculateRiskLevel(signalCount, config);

  const laneDescription = `${context.sourceChainName} → ${context.destinationChainName}`;
  const evidenceList = signals.map((s) => s.evidence);

  return {
    riskLevel,
    signalCount,
    signals,
    lane: laneDescription,
    laneId: context.laneId,
    messageId: context.messageId,
    sourceChain: context.sourceChainName,
    destinationChain: context.destinationChainName,
    evidence: evidenceList,
    detectedAt: new Date().toISOString(),
    isSimulation,
  };
}

/**
 * Full end-to-end evaluation pipeline: runs all detectors on the telemetry context
 * and returns the correlated risk result.
 */
export function analyzeTelemetryRisk(
  context: SecurityTelemetryContext,
  config: DetectorConfig = DEFAULT_DETECTOR_CONFIG,
  isSimulation: boolean = false,
): CorrelatedRiskResult {
  const signals = evaluateAllDetectors(context, config);
  return correlateSignals(signals, context, config, isSimulation);
}
