import {
  SecuritySignalType,
  type SecuritySignal,
  type SecurityTelemetryContext,
  type DetectorConfig,
} from './types';
import { DEFAULT_DETECTOR_CONFIG } from './config';

/**
 * Signal A: UNKNOWN_SENDER
 * Detects when a sender address is not recognized/allowlisted for the monitored environment.
 */
export function detectUnknownSender(
  context: SecurityTelemetryContext,
  config: DetectorConfig = DEFAULT_DETECTOR_CONFIG,
): SecuritySignal | null {
  if (!context.sender) return null;

  const senderNormalized = context.sender.toLowerCase();
  const isAllowlisted = config.knownSenders.some(
    (addr) => addr.toLowerCase() === senderNormalized,
  );

  if (!isAllowlisted) {
    return {
      type: SecuritySignalType.UNKNOWN_SENDER,
      severity: 'SUSPICIOUS',
      title: 'Unknown Sender Detected',
      description: 'Transaction sender is not in the recognized allowlist for this environment.',
      observedValue: context.sender,
      threshold: `${config.knownSenders.length} allowlisted senders`,
      evidence: `Sender ${context.sender} is not present in the allowlisted environment senders set (${config.knownSenders.length} configured).`,
      timestamp: new Date().toISOString(),
    };
  }

  return null;
}

/**
 * Signal B: UNKNOWN_CONTRACT_INTERACTION
 * Detects interaction with a contract/address not present in the configured trusted/known contract set.
 */
export function detectUnknownContract(
  context: SecurityTelemetryContext,
  config: DetectorConfig = DEFAULT_DETECTOR_CONFIG,
): SecuritySignal | null {
  if (!context.receiver) return null;

  const receiverNormalized = context.receiver.toLowerCase();
  const isTrusted = config.trustedContracts.some(
    (addr) => addr.toLowerCase() === receiverNormalized,
  );

  if (!isTrusted) {
    return {
      type: SecuritySignalType.UNKNOWN_CONTRACT_INTERACTION,
      severity: 'SUSPICIOUS',
      title: 'Unknown Contract Interaction',
      description: 'Destination target/receiver contract is not in the trusted contract set.',
      observedValue: context.receiver,
      threshold: `${config.trustedContracts.length} trusted contracts`,
      evidence: `Receiver contract ${context.receiver} is not recognized in the configured trusted contract set (${config.trustedContracts.length} known).`,
      timestamp: new Date().toISOString(),
    };
  }

  return null;
}

/**
 * Signal C: LARGE_TRANSFER
 * Detects unusually large token/value movement using a configurable threshold.
 */
export function detectLargeTransfer(
  context: SecurityTelemetryContext,
  config: DetectorConfig = DEFAULT_DETECTOR_CONFIG,
): SecuritySignal | null {
  if (context.feeTokenAmount === undefined || context.feeTokenAmount === null) return null;

  let amountWei: bigint;
  try {
    amountWei =
      typeof context.feeTokenAmount === 'bigint'
        ? context.feeTokenAmount
        : BigInt(context.feeTokenAmount.toString());
  } catch {
    return null;
  }

  if (amountWei > config.largeTransferThresholdWei) {
    const formattedObserved = (Number(amountWei / 10n ** 15n) / 1000).toFixed(3);
    const formattedThreshold = (
      Number(config.largeTransferThresholdWei / 10n ** 15n) / 1000
    ).toFixed(3);

    return {
      type: SecuritySignalType.LARGE_TRANSFER,
      severity: 'ANOMALOUS ACTIVITY',
      title: 'Large Value Transfer',
      description: 'Transfer value significantly exceeds the standard baseline threshold.',
      observedValue: amountWei.toString(),
      threshold: config.largeTransferThresholdWei.toString(),
      evidence: `Transfer amount of ${amountWei.toString()} wei (~${formattedObserved} tokens) exceeds configured threshold of ${config.largeTransferThresholdWei.toString()} wei (~${formattedThreshold} tokens).`,
      timestamp: new Date().toISOString(),
    };
  }

  return null;
}

/**
 * Signal D: MESSAGE_BURST
 * Detects abnormal message frequency within a short time window.
 */
export function detectMessageBurst(
  context: SecurityTelemetryContext,
  config: DetectorConfig = DEFAULT_DETECTOR_CONFIG,
): SecuritySignal | null {
  const burstCount =
    context.senderMessageCountWindow ?? context.laneMessageCountWindow;
  const windowSec =
    context.laneWindowSeconds ?? config.messageBurstWindowSeconds;

  if (burstCount !== undefined && burstCount > config.messageBurstThreshold) {
    return {
      type: SecuritySignalType.MESSAGE_BURST,
      severity: 'ANOMALOUS ACTIVITY',
      title: 'Message Burst Detected',
      description: 'Abnormally high message rate observed within a brief time window.',
      observedValue: `${burstCount} msgs / ${windowSec}s`,
      threshold: `${config.messageBurstThreshold} msgs / ${windowSec}s`,
      evidence: `Message burst detected: ${burstCount} messages observed within ${windowSec} seconds (threshold: ${config.messageBurstThreshold}).`,
      timestamp: new Date().toISOString(),
    };
  }

  return null;
}

/**
 * Signal E: FAILURE_SPIKE
 * Detects sudden increase in cross-chain execution failures.
 */
export function detectFailureSpike(
  context: SecurityTelemetryContext,
  config: DetectorConfig = DEFAULT_DETECTOR_CONFIG,
): SecuritySignal | null {
  const failureRate = context.laneFailureRate;
  const failureCount = context.laneFailureCount ?? 0;

  if (
    failureRate !== undefined &&
    failureRate > config.failureSpikeRateThreshold &&
    failureCount >= config.failureSpikeMinCount
  ) {
    return {
      type: SecuritySignalType.FAILURE_SPIKE,
      severity: 'HIGH RISK',
      title: 'Cross-Chain Failure Spike',
      description: 'Sudden spike in cross-chain message execution or delivery failures.',
      observedValue: `${(failureRate * 100).toFixed(1)}% (${failureCount} failures)`,
      threshold: `${(config.failureSpikeRateThreshold * 100).toFixed(1)}%`,
      evidence: `Cross-chain failure spike: ${failureCount} failed deliveries (${(failureRate * 100).toFixed(1)}% failure rate) exceeds threshold of ${(config.failureSpikeRateThreshold * 100).toFixed(1)}%.`,
      timestamp: new Date().toISOString(),
    };
  }

  return null;
}

/**
 * Signal F: LATENCY_ANOMALY
 * Detects abnormal cross-chain latency relative to the existing lane baseline.
 */
export function detectLatencyAnomaly(
  context: SecurityTelemetryContext,
  config: DetectorConfig = DEFAULT_DETECTOR_CONFIG,
): SecuritySignal | null {
  if (context.latencyMs === null || context.latencyMs === undefined || context.latencyMs <= 0) {
    return null;
  }

  const baseline =
    context.laneLatencyBaselineMs ??
    context.laneLatencyP95 ??
    config.latencyAnomalyAbsoluteThresholdMs;

  const thresholdMs = baseline * config.latencyAnomalyMultiplier;

  if (context.latencyMs > thresholdMs) {
    const ratio = (context.latencyMs / baseline).toFixed(2);
    return {
      type: SecuritySignalType.LATENCY_ANOMALY,
      severity: 'ANOMALOUS ACTIVITY',
      title: 'Cross-Chain Latency Anomaly',
      description: 'Execution latency is significantly higher than the historic lane baseline.',
      observedValue: `${context.latencyMs}ms`,
      threshold: `${Math.round(thresholdMs)}ms (${config.latencyAnomalyMultiplier}x of ${baseline}ms)`,
      evidence: `Observed latency of ${context.latencyMs}ms exceeds baseline (${baseline}ms) by ${ratio}x (threshold: ${Math.round(thresholdMs)}ms).`,
      timestamp: new Date().toISOString(),
    };
  }

  return null;
}

/**
 * Runs all 6 security signal detectors on a given telemetry context.
 */
export function evaluateAllDetectors(
  context: SecurityTelemetryContext,
  config: DetectorConfig = DEFAULT_DETECTOR_CONFIG,
): SecuritySignal[] {
  const detectors = [
    detectUnknownSender,
    detectUnknownContract,
    detectLargeTransfer,
    detectMessageBurst,
    detectFailureSpike,
    detectLatencyAnomaly,
  ];

  const signals: SecuritySignal[] = [];
  for (const detector of detectors) {
    const signal = detector(context, config);
    if (signal) {
      signals.push(signal);
    }
  }

  return signals;
}
