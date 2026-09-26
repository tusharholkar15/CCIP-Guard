export enum SecuritySignalType {
  UNKNOWN_SENDER = 'UNKNOWN_SENDER',
  UNKNOWN_CONTRACT_INTERACTION = 'UNKNOWN_CONTRACT_INTERACTION',
  LARGE_TRANSFER = 'LARGE_TRANSFER',
  MESSAGE_BURST = 'MESSAGE_BURST',
  FAILURE_SPIKE = 'FAILURE_SPIKE',
  LATENCY_ANOMALY = 'LATENCY_ANOMALY',
}

export type SecuritySignalSeverity = 'SUSPICIOUS' | 'HIGH RISK' | 'ANOMALOUS ACTIVITY';

export type SecurityRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface SecuritySignal {
  type: SecuritySignalType;
  severity: SecuritySignalSeverity;
  title: string;
  description: string;
  observedValue: number | string;
  threshold: number | string;
  evidence: string;
  timestamp: string;
}

export interface SecurityTelemetryContext {
  messageId?: string;
  sender?: string;
  receiver?: string;
  sourceChainId: number;
  destinationChainId: number;
  sourceChainName: string;
  destinationChainName: string;
  feeToken?: string;
  feeTokenAmount?: string | bigint;
  latencyMs?: number | null;
  state?: string;
  timestamp?: number | string | Date;
  // Recent lane context
  laneId?: string;
  laneMessageCountWindow?: number;
  laneWindowSeconds?: number;
  laneFailureCount?: number;
  laneFailureRate?: number;
  laneLatencyP95?: number | null;
  laneLatencyBaselineMs?: number;
  // Sender history context
  senderMessageCountWindow?: number;
}

export interface CorrelatedRiskResult {
  riskLevel: SecurityRiskLevel;
  signalCount: number;
  signals: SecuritySignal[];
  lane: string;
  laneId?: string;
  messageId?: string;
  sourceChain: string;
  destinationChain: string;
  evidence: string[];
  detectedAt: string;
  isSimulation?: boolean;
}

export interface DetectorConfig {
  knownSenders: string[];
  trustedContracts: string[];
  largeTransferThresholdWei: bigint;
  messageBurstThreshold: number;
  messageBurstWindowSeconds: number;
  failureSpikeRateThreshold: number;
  failureSpikeMinCount: number;
  latencyAnomalyMultiplier: number;
  latencyAnomalyAbsoluteThresholdMs: number;
  riskThresholds: {
    low: number;    // 1 signal
    medium: number; // 2 signals
    high: number;   // 3+ signals
  };
}
