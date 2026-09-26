import { SUPPORTED_CHAINS } from '../constants';
import type { DetectorConfig } from './types';

export const DEFAULT_KNOWN_SENDERS: string[] = [
  '0x0000000000000000000000000000000000000001',
  '0x1111111111111111111111111111111111111111',
  '0xaAaAaAaaAa000000000000000000000000000001',
  '0xbBbBbBBbbB000000000000000000000000000002',
  // BridgeGuard authorized demo operator/sender
  '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
  '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
];

export const DEFAULT_TRUSTED_CONTRACTS: string[] = [
  SUPPORTED_CHAINS.ETHEREUM?.routerAddress?.toLowerCase(),
  SUPPORTED_CHAINS.ARBITRUM?.routerAddress?.toLowerCase(),
  // Known BridgeGuard test receiver contracts
  '0x2222222222222222222222222222222222222222',
  '0x3333333333333333333333333333333333333333',
  '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
];

export const DEFAULT_DETECTOR_CONFIG: DetectorConfig = {
  knownSenders: DEFAULT_KNOWN_SENDERS.map((s) => s.toLowerCase()),
  trustedContracts: DEFAULT_TRUSTED_CONTRACTS.map((c) => c.toLowerCase()),
  // 10 ETH/LINK equivalent in wei (10 * 10^18)
  largeTransferThresholdWei: 10_000_000_000_000_000_000n,
  messageBurstThreshold: 5,
  messageBurstWindowSeconds: 60,
  failureSpikeRateThreshold: 0.2, // 20%
  failureSpikeMinCount: 3,
  latencyAnomalyMultiplier: 2.0, // 2x baseline
  latencyAnomalyAbsoluteThresholdMs: 300_000, // 5 minutes
  riskThresholds: {
    low: 1,
    medium: 2,
    high: 3,
  },
};

export function getDetectorConfig(overrides?: Partial<DetectorConfig>): DetectorConfig {
  return {
    ...DEFAULT_DETECTOR_CONFIG,
    ...overrides,
    knownSenders: (overrides?.knownSenders || DEFAULT_DETECTOR_CONFIG.knownSenders).map((s) =>
      s.toLowerCase(),
    ),
    trustedContracts: (overrides?.trustedContracts || DEFAULT_DETECTOR_CONFIG.trustedContracts).map(
      (c) => c.toLowerCase(),
    ),
  };
}
