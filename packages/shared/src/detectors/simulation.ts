import {
  type SecurityTelemetryContext,
  type CorrelatedRiskResult,
  type DetectorConfig,
} from './types';
import { DEFAULT_DETECTOR_CONFIG } from './config';
import { analyzeTelemetryRisk } from './correlation';

export interface SimulationScenario {
  id: string;
  name: string;
  category: string;
  description: string;
  expectedRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  expectedSignals: string[];
  context: SecurityTelemetryContext;
}

export const PRESET_SIMULATION_SCENARIOS: SimulationScenario[] = [
  {
    id: 'multi-signal-burst-attack',
    name: 'Multi-Signal Suspicious Burst',
    category: 'Cross-Chain Exploit Simulation',
    description:
      'Unknown sender interacting with an unverified contract in a rapid 18-message burst across Ethereum to Arbitrum.',
    expectedRiskLevel: 'HIGH',
    expectedSignals: [
      'UNKNOWN_SENDER',
      'UNKNOWN_CONTRACT_INTERACTION',
      'MESSAGE_BURST',
    ],
    context: {
      messageId: '0xsim_burst_' + Date.now().toString(16),
      sender: '0xbad000000000000000000000000000000000dead',
      receiver: '0xattacker0000000000000000000000000000000',
      sourceChainId: 1,
      destinationChainId: 42161,
      sourceChainName: 'Ethereum',
      destinationChainName: 'Arbitrum',
      feeTokenAmount: 1_000_000_000_000_000_000n, // 1 token
      latencyMs: 120_000,
      state: 'SENT',
      laneMessageCountWindow: 18,
      laneWindowSeconds: 60,
      senderMessageCountWindow: 18,
      laneFailureCount: 0,
      laneFailureRate: 0,
      laneLatencyBaselineMs: 180_000,
    },
  },
  {
    id: 'single-signal-unlisted-sender',
    name: 'Isolated Signal: Unlisted Sender',
    category: 'False-Positive Prevention',
    description:
      'Unrecognized sender sending a normal cross-chain message to a trusted router. Evaluates to LOW risk to prevent false alarm.',
    expectedRiskLevel: 'LOW',
    expectedSignals: ['UNKNOWN_SENDER'],
    context: {
      messageId: '0xsim_sender_' + Date.now().toString(16),
      sender: '0x7777777777777777777777777777777777777777',
      // Trusted Ethereum router
      receiver: '0x80226fc0Ee2b096224EeAc085Bb9a8cba1146f7D',
      sourceChainId: 1,
      destinationChainId: 42161,
      sourceChainName: 'Ethereum',
      destinationChainName: 'Arbitrum',
      feeTokenAmount: 500_000_000_000_000_000n, // 0.5 tokens
      latencyMs: 95_000,
      state: 'SENT',
      laneMessageCountWindow: 2,
      laneWindowSeconds: 60,
      senderMessageCountWindow: 1,
      laneFailureCount: 0,
      laneFailureRate: 0,
      laneLatencyBaselineMs: 180_000,
    },
  },
  {
    id: 'dual-signal-large-transfer',
    name: 'Dual Signal: Unknown Sender + Large Transfer',
    category: 'Anomalous Volume',
    description:
      'Unlisted sender moving 50 tokens (5x threshold). Evaluates to MEDIUM risk without claiming transaction is malicious.',
    expectedRiskLevel: 'MEDIUM',
    expectedSignals: ['UNKNOWN_SENDER', 'LARGE_TRANSFER'],
    context: {
      messageId: '0xsim_large_' + Date.now().toString(16),
      sender: '0x9999999999999999999999999999999999999999',
      receiver: '0x80226fc0Ee2b096224EeAc085Bb9a8cba1146f7D',
      sourceChainId: 1,
      destinationChainId: 42161,
      sourceChainName: 'Ethereum',
      destinationChainName: 'Arbitrum',
      feeTokenAmount: 50_000_000_000_000_000_000n, // 50 tokens
      latencyMs: 110_000,
      state: 'SENT',
      laneMessageCountWindow: 2,
      laneWindowSeconds: 60,
      senderMessageCountWindow: 1,
      laneFailureCount: 0,
      laneFailureRate: 0,
      laneLatencyBaselineMs: 180_000,
    },
  },
  {
    id: 'dual-signal-lane-degradation',
    name: 'Dual Signal: Latency Anomaly + Failure Spike',
    category: 'Infrastructure Anomalies',
    description:
      'Cross-chain lane experiencing 750s latency (4.1x baseline) combined with 40% execution failure rate.',
    expectedRiskLevel: 'MEDIUM',
    expectedSignals: ['LATENCY_ANOMALY', 'FAILURE_SPIKE'],
    context: {
      messageId: '0xsim_degrade_' + Date.now().toString(16),
      // Allowlisted sender
      sender: '0x1111111111111111111111111111111111111111',
      // Trusted router
      receiver: '0x80226fc0Ee2b096224EeAc085Bb9a8cba1146f7D',
      sourceChainId: 1,
      destinationChainId: 42161,
      sourceChainName: 'Ethereum',
      destinationChainName: 'Arbitrum',
      feeTokenAmount: 200_000_000_000_000_000n,
      latencyMs: 750_000, // 750s vs 180s baseline (4.16x)
      state: 'FAILED',
      laneMessageCountWindow: 4, // 4 msgs (below burst threshold 5)
      laneWindowSeconds: 300,
      laneFailureCount: 4,
      laneFailureRate: 0.4, // 40%
      laneLatencyBaselineMs: 180_000,
    },
  },
];

/**
 * Runs a safe in-memory simulation without modifying blockchain state.
 */
export function runSimulationScenario(
  scenarioId: string,
  config: DetectorConfig = DEFAULT_DETECTOR_CONFIG,
): { scenario: SimulationScenario; result: CorrelatedRiskResult } {
  const scenario = PRESET_SIMULATION_SCENARIOS.find((s) => s.id === scenarioId);
  if (!scenario) {
    throw new Error(`Simulation scenario '${scenarioId}' not found`);
  }

  const result = analyzeTelemetryRisk(scenario.context, config, true);
  return { scenario, result };
}

/**
 * Runs a custom simulation context in-memory.
 */
export function runCustomSimulation(
  context: SecurityTelemetryContext,
  config: DetectorConfig = DEFAULT_DETECTOR_CONFIG,
): CorrelatedRiskResult {
  return analyzeTelemetryRisk(context, config, true);
}
