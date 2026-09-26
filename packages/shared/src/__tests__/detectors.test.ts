import { describe, it, expect } from 'vitest';
import {
  detectUnknownSender,
  detectUnknownContract,
  detectLargeTransfer,
  detectMessageBurst,
  detectFailureSpike,
  detectLatencyAnomaly,
  evaluateAllDetectors,
  calculateRiskLevel,
  correlateSignals,
  analyzeTelemetryRisk,
  runSimulationScenario,
  PRESET_SIMULATION_SCENARIOS,
  getDetectorConfig,
  SecuritySignalType,
  type SecurityTelemetryContext,
  type NormalizedCCIPEvent,
  CCIPEventType,
} from '../index';

describe('Security Risk Detection Pipeline', () => {
  const baseContext: SecurityTelemetryContext = {
    messageId: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    sender: '0x1111111111111111111111111111111111111111', // in default allowlist
    receiver: '0x80226fc0Ee2b096224EeAc085Bb9a8cba1146f7D', // in default trusted contracts (Ethereum router)
    sourceChainId: 1,
    destinationChainId: 42161,
    sourceChainName: 'Ethereum',
    destinationChainName: 'Arbitrum',
    feeTokenAmount: 1_000_000_000_000_000_000n, // 1 token (below 10 token threshold)
    latencyMs: 120_000, // 2 minutes (below baseline multiplier)
    state: 'SENT',
    laneMessageCountWindow: 2, // 2 msgs in 60s (below burst threshold 5)
    laneWindowSeconds: 60,
    laneFailureCount: 0,
    laneFailureRate: 0,
    laneLatencyBaselineMs: 180_000,
  };

  describe('Signal A: UNKNOWN_SENDER', () => {
    it('should return null when sender is recognized / allowlisted', () => {
      const signal = detectUnknownSender(baseContext);
      expect(signal).toBeNull();
    });

    it('should detect when sender is not in the allowlist', () => {
      const unlistedContext = {
        ...baseContext,
        sender: '0xdeadbeef00000000000000000000000000000001',
      };
      const signal = detectUnknownSender(unlistedContext);
      expect(signal).not.toBeNull();
      expect(signal?.type).toBe(SecuritySignalType.UNKNOWN_SENDER);
      expect(signal?.severity).toBe('SUSPICIOUS');
      expect(signal?.observedValue).toBe('0xdeadbeef00000000000000000000000000000001');
      expect(signal?.evidence).toContain('not present in the allowlisted environment senders set');
    });

    it('should handle case-insensitive address comparison', () => {
      const mixedCaseContext = {
        ...baseContext,
        sender: '0x1111111111111111111111111111111111111111'.toUpperCase(),
      };
      const signal = detectUnknownSender(mixedCaseContext);
      expect(signal).toBeNull();
    });
  });

  describe('Signal B: UNKNOWN_CONTRACT_INTERACTION', () => {
    it('should return null when receiver is in trusted contract set', () => {
      const signal = detectUnknownContract(baseContext);
      expect(signal).toBeNull();
    });

    it('should detect interaction with an unlisted/untrusted contract', () => {
      const unlistedContractContext = {
        ...baseContext,
        receiver: '0x9999999999999999999999999999999999999999',
      };
      const signal = detectUnknownContract(unlistedContractContext);
      expect(signal).not.toBeNull();
      expect(signal?.type).toBe(SecuritySignalType.UNKNOWN_CONTRACT_INTERACTION);
      expect(signal?.severity).toBe('SUSPICIOUS');
      expect(signal?.evidence).toContain('not recognized in the configured trusted contract set');
    });
  });

  describe('Signal C: LARGE_TRANSFER', () => {
    it('should return null when transfer amount is within threshold', () => {
      const signal = detectLargeTransfer(baseContext);
      expect(signal).toBeNull();
    });

    it('should detect unusually large transfer exceeding configurable threshold', () => {
      const largeContext = {
        ...baseContext,
        feeTokenAmount: 25_000_000_000_000_000_000n, // 25 tokens vs 10 threshold
      };
      const signal = detectLargeTransfer(largeContext);
      expect(signal).not.toBeNull();
      expect(signal?.type).toBe(SecuritySignalType.LARGE_TRANSFER);
      expect(signal?.severity).toBe('ANOMALOUS ACTIVITY');
      expect(signal?.evidence).toContain('exceeds configured threshold');
      expect(signal?.observedValue).toBe('25000000000000000000');
    });
  });

  describe('Signal D: MESSAGE_BURST', () => {
    it('should return null when message frequency is normal', () => {
      const signal = detectMessageBurst(baseContext);
      expect(signal).toBeNull();
    });

    it('should detect abnormal message frequency in short time window', () => {
      const burstContext = {
        ...baseContext,
        laneMessageCountWindow: 15, // 15 msgs in 60s (threshold: 5)
        laneWindowSeconds: 60,
      };
      const signal = detectMessageBurst(burstContext);
      expect(signal).not.toBeNull();
      expect(signal?.type).toBe(SecuritySignalType.MESSAGE_BURST);
      expect(signal?.severity).toBe('ANOMALOUS ACTIVITY');
      expect(signal?.evidence).toContain('15 messages observed within 60 seconds (threshold: 5)');
    });
  });

  describe('Signal E: FAILURE_SPIKE', () => {
    it('should return null when failure rate is normal', () => {
      const signal = detectFailureSpike(baseContext);
      expect(signal).toBeNull();
    });

    it('should detect sudden spike in cross-chain execution failures', () => {
      const spikeContext = {
        ...baseContext,
        laneFailureCount: 5,
        laneFailureRate: 0.35, // 35% failure rate (threshold: 20%)
      };
      const signal = detectFailureSpike(spikeContext);
      expect(signal).not.toBeNull();
      expect(signal?.type).toBe(SecuritySignalType.FAILURE_SPIKE);
      expect(signal?.severity).toBe('HIGH RISK');
      expect(signal?.evidence).toContain('5 failed deliveries (35.0% failure rate)');
    });
  });

  describe('Signal F: LATENCY_ANOMALY', () => {
    it('should return null when latency is within baseline tolerance', () => {
      const signal = detectLatencyAnomaly(baseContext);
      expect(signal).toBeNull();
    });

    it('should detect abnormal cross-chain latency relative to lane baseline', () => {
      const latencyContext = {
        ...baseContext,
        latencyMs: 720_000, // 12 minutes (baseline: 180,000ms, threshold: 2x = 360,000ms)
        laneLatencyBaselineMs: 180_000,
      };
      const signal = detectLatencyAnomaly(latencyContext);
      expect(signal).not.toBeNull();
      expect(signal?.type).toBe(SecuritySignalType.LATENCY_ANOMALY);
      expect(signal?.severity).toBe('ANOMALOUS ACTIVITY');
      expect(signal?.evidence).toContain('exceeds baseline (180000ms) by 4.00x');
    });
  });

  describe('Multi-Signal Correlation / Risk Engine', () => {
    it('should NEVER label a single weak signal as malicious or HIGH risk', () => {
      // Single signal: unknown sender only
      const singleSignalContext: SecurityTelemetryContext = {
        ...baseContext,
        sender: '0xunregistered0000000000000000000000000001',
      };

      const result = analyzeTelemetryRisk(singleSignalContext);
      expect(result.signalCount).toBe(1);
      expect(result.signals[0].type).toBe(SecuritySignalType.UNKNOWN_SENDER);
      expect(result.riskLevel).toBe('LOW'); // 1 signal = LOW risk
    });

    it('should classify two correlated signals as MEDIUM risk', () => {
      // 2 signals: unknown sender + large transfer
      const dualSignalContext: SecurityTelemetryContext = {
        ...baseContext,
        sender: '0xunregistered0000000000000000000000000001',
        feeTokenAmount: 50_000_000_000_000_000_000n,
      };

      const result = analyzeTelemetryRisk(dualSignalContext);
      expect(result.signalCount).toBe(2);
      expect(result.riskLevel).toBe('MEDIUM');
      expect(result.signals.map((s) => s.type)).toEqual([
        SecuritySignalType.UNKNOWN_SENDER,
        SecuritySignalType.LARGE_TRANSFER,
      ]);
    });

    it('should escalate to HIGH risk when 3 or more signals correlate', () => {
      // 3 signals: unknown sender + unknown contract + message burst
      const highRiskContext: SecurityTelemetryContext = {
        ...baseContext,
        sender: '0xunregistered0000000000000000000000000001',
        receiver: '0xuntrustedcontract0000000000000000000000',
        laneMessageCountWindow: 18,
      };

      const result = analyzeTelemetryRisk(highRiskContext);
      expect(result.signalCount).toBe(3);
      expect(result.riskLevel).toBe('HIGH');
      expect(result.signals.map((s) => s.type)).toContain(SecuritySignalType.UNKNOWN_SENDER);
      expect(result.signals.map((s) => s.type)).toContain(SecuritySignalType.UNKNOWN_CONTRACT_INTERACTION);
      expect(result.signals.map((s) => s.type)).toContain(SecuritySignalType.MESSAGE_BURST);
    });

    it('should return complete structured explainability data without invented evidence', () => {
      const highRiskContext: SecurityTelemetryContext = {
        ...baseContext,
        sender: '0xattacker00000000000000000000000000000001',
        receiver: '0xmaliciouscontract000000000000000000000',
        laneMessageCountWindow: 12,
        laneWindowSeconds: 60,
      };

      const result = analyzeTelemetryRisk(highRiskContext);
      expect(result.riskLevel).toBe('HIGH');
      expect(result.lane).toBe('Ethereum → Arbitrum');
      expect(result.sourceChain).toBe('Ethereum');
      expect(result.destinationChain).toBe('Arbitrum');
      expect(result.evidence.length).toBe(3);
      expect(result.evidence[0]).toContain('0xattacker00000000000000000000000000000001');
      expect(result.evidence[1]).toContain('0xmaliciouscontract000000000000000000000');
      expect(result.evidence[2]).toContain('12 messages observed within 60 seconds');
      expect(result.detectedAt).toBeDefined();
    });
  });

  describe('Safe Demonstration / Simulation Scenarios', () => {
    it('should execute multi-signal burst attack scenario resulting in HIGH risk', () => {
      const { scenario, result } = runSimulationScenario('multi-signal-burst-attack');
      expect(scenario.expectedRiskLevel).toBe('HIGH');
      expect(result.riskLevel).toBe('HIGH');
      expect(result.signalCount).toBe(3);
      expect(result.isSimulation).toBe(true);
      expect(result.signals.map((s) => s.type)).toEqual([
        SecuritySignalType.UNKNOWN_SENDER,
        SecuritySignalType.UNKNOWN_CONTRACT_INTERACTION,
        SecuritySignalType.MESSAGE_BURST,
      ]);
    });

    it('should execute isolated unlisted sender scenario resulting in LOW risk', () => {
      const { scenario, result } = runSimulationScenario('single-signal-unlisted-sender');
      expect(scenario.expectedRiskLevel).toBe('LOW');
      expect(result.riskLevel).toBe('LOW');
      expect(result.signalCount).toBe(1);
      expect(result.isSimulation).toBe(true);
    });

    it('should execute dual-signal large transfer scenario resulting in MEDIUM risk', () => {
      const { scenario, result } = runSimulationScenario('dual-signal-large-transfer');
      expect(scenario.expectedRiskLevel).toBe('MEDIUM');
      expect(result.riskLevel).toBe('MEDIUM');
      expect(result.signalCount).toBe(2);
      expect(result.isSimulation).toBe(true);
    });

    it('should execute dual-signal lane degradation scenario resulting in MEDIUM risk', () => {
      const { scenario, result } = runSimulationScenario('dual-signal-lane-degradation');
      expect(scenario.expectedRiskLevel).toBe('MEDIUM');
      expect(result.riskLevel).toBe('MEDIUM');
      expect(result.signalCount).toBe(2);
      expect(result.isSimulation).toBe(true);
    });
  });

  describe('Real Normalized CCIP Message Compatibility', () => {
    it('should evaluate real normalized CCIP events cleanly', () => {
      const realNormalizedEvent: NormalizedCCIPEvent = {
        eventName: CCIPEventType.MESSAGE_SENT,
        chain: 'Ethereum',
        sourceChainSelector: 5009297550715157269n,
        destinationChainSelector: 4949039107694359620n,
        sequenceNumber: 101n,
        messageId: '0x6e257cfef859424c29759d5718df8849bbf9303d2179bb42e61df3f7041a66e4',
        sender: '0x1111111111111111111111111111111111111111',
        receiver: '0x80226fc0Ee2b096224EeAc085Bb9a8cba1146f7D',
        feeToken: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
        feeTokenAmount: 250_000_000_000_000_000n,
        transactionHash: '0x9999999999999999999999999999999999999999999999999999999999999999',
        blockNumber: 5200000n,
        timestamp: 1727000000,
        logIndex: 4,
        contractAddress: '0x8dcf17f298c881A547D91ca4aA3C2AD7568C6777',
        executionState: null,
      };

      const telemetryContext: SecurityTelemetryContext = {
        messageId: realNormalizedEvent.messageId ?? undefined,
        sender: realNormalizedEvent.sender ?? undefined,
        receiver: realNormalizedEvent.receiver ?? undefined,
        sourceChainId: 1,
        destinationChainId: 42161,
        sourceChainName: 'Ethereum',
        destinationChainName: 'Arbitrum',
        feeTokenAmount: realNormalizedEvent.feeTokenAmount ?? undefined,
        state: 'SENT',
        laneMessageCountWindow: 1,
        laneWindowSeconds: 60,
      };

      const result = analyzeTelemetryRisk(telemetryContext);
      expect(result.riskLevel).toBe('LOW');
      expect(result.signalCount).toBe(0);
      expect(result.messageId).toBe(realNormalizedEvent.messageId);
    });
  });
});
