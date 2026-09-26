// ========== Enums ==========

export enum MessageState {
  SENT = 'SENT',
  COMMITTED = 'COMMITTED',
  EXECUTION_STARTED = 'EXECUTION_STARTED',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
}

export enum IncidentType {
  HIGH_LATENCY = 'HIGH_LATENCY',
  DELIVERY_FAILURE_SPIKE = 'DELIVERY_FAILURE_SPIKE',
  MESSAGE_BACKLOG = 'MESSAGE_BACKLOG',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
}

export enum IncidentStatus {
  OPEN = 'OPEN',
  INVESTIGATING = 'INVESTIGATING',
  MITIGATED = 'MITIGATED',
  RESOLVED = 'RESOLVED',
}

export enum IncidentSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum AlertStatus {
  ACTIVE = 'ACTIVE',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  RESOLVED = 'RESOLVED',
}

export enum ResponseProposalType {
  PAUSE_APPLICATION_ROUTE = 'PAUSE_APPLICATION_ROUTE',
  BLOCK_SENDER = 'BLOCK_SENDER',
  RATE_LIMIT_ADJUSTMENT = 'RATE_LIMIT_ADJUSTMENT',
}

export enum ResponseProposalStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXECUTED = 'EXECUTED',
  EXECUTION_DISABLED = 'EXECUTION_DISABLED',
}

export enum ChainStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  DOWN = 'DOWN',
  UNKNOWN = 'UNKNOWN',
}

export enum LaneStatus {
  ACTIVE = 'ACTIVE',
  DEGRADED = 'DEGRADED',
  INACTIVE = 'INACTIVE',
}

export enum AuditAction {
  RESPONSE_CREATED = 'RESPONSE_CREATED',
  RESPONSE_APPROVED = 'RESPONSE_APPROVED',
  RESPONSE_REJECTED = 'RESPONSE_REJECTED',
  RESPONSE_EXECUTED = 'RESPONSE_EXECUTED',
  INCIDENT_DETECTED = 'INCIDENT_DETECTED',
  INCIDENT_STATUS_CHANGED = 'INCIDENT_STATUS_CHANGED',
  ALERT_TRIGGERED = 'ALERT_TRIGGERED',
  ALERT_ACKNOWLEDGED = 'ALERT_ACKNOWLEDGED',
  ALERT_RESOLVED = 'ALERT_RESOLVED',
  MESSAGE_DELIVERED = 'MESSAGE_DELIVERED',
  MESSAGE_FAILED = 'MESSAGE_FAILED',
}

// ========== Core Types ==========

export interface Chain {
  id: string;
  chainId: number;
  name: string;
  displayName: string;
  rpcUrl?: string;
  explorerUrl?: string;
  status: ChainStatus;
  lastActivityAt: string | null;
  messagesCount: number;
  failuresCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Lane {
  id: string;
  sourceChainId: number;
  destinationChainId: number;
  sourceChainName: string;
  destinationChainName: string;
  status: LaneStatus;
  messageCount: number;
  failureCount: number;
  backlog: number;
  latencyP50: number | null;
  latencyP90: number | null;
  latencyP95: number | null;
  latencyP99: number | null;
  lastActivityAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  ccipMessageId: string;
  sourceChainId: number;
  destinationChainId: number;
  sourceChainName: string;
  destinationChainName: string;
  sender: string;
  receiver: string;
  state: MessageState;
  sourceTxHash: string | null;
  destinationTxHash: string | null;
  sourceBlockNumber: number | null;
  destinationBlockNumber: number | null;
  sourceTimestamp: string | null;
  destinationTimestamp: string | null;
  latencyMs: number | null;
  laneId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Incident {
  id: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  title: string;
  description: string;
  laneId: string | null;
  sourceChainName: string | null;
  destinationChainName: string | null;
  detectedAt: string;
  resolvedAt: string | null;
  detectionReason: string;
  relatedMessageIds: string[];
  metadata?: Record<string, any>;
  isSimulation?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Alert {
  id: string;
  type: string;
  resource: string;
  threshold: number;
  observedValue: number;
  status: AlertStatus;
  message: string;
  incidentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResponseProposal {
  id: string;
  type: ResponseProposalType;
  status: ResponseProposalStatus;
  target: string;
  reason: string;
  incidentId: string | null;
  createdBy: string;
  operatorId: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  executedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  executionMode: 'SIMULATION' | 'DISABLED' | 'LIVE';
  executionResult: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  action: AuditAction;
  resource: string;
  resourceId: string;
  operatorId: string;
  operatorName: string;
  details: Record<string, unknown> | null;
  status: string;
  timestamp: string;
}

export interface MetricSnapshot {
  id: string;
  laneId: string;
  window: '1m' | '5m' | '15m' | '1h';
  messageCount: number;
  successCount: number;
  failureCount: number;
  latencyP50: number | null;
  latencyP90: number | null;
  latencyP95: number | null;
  latencyP99: number | null;
  backlog: number;
  timestamp: string;
}

export interface RpcHealthLog {
  id: string;
  chainId: number;
  chainName: string;
  latencyMs: number;
  isHealthy: boolean;
  errorMessage: string | null;
  timestamp: string;
}

// ========== API Types ==========

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DashboardStats {
  networks: number;
  messages: number;
  successRate: number | null;
  activeIncidents: number;
  activeAlerts: number;
  averageLatency: number | null;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

// ========== WebSocket Types ==========

export enum WsEventType {
  MESSAGE_UPDATE = 'message:update',
  INCIDENT_UPDATE = 'incident:update',
  ALERT_UPDATE = 'alert:update',
  NETWORK_STATUS = 'network:status',
  RESPONSE_UPDATE = 'response:update',
  METRICS_UPDATE = 'metrics:update',
}

export interface WsEvent<T = unknown> {
  type: WsEventType;
  data: T;
  timestamp: string;
}

// ========== CCIP Types ==========

export interface CCIPSendRequestedEvent {
  messageId: string;
  sourceChainSelector: bigint;
  destChainSelector: bigint;
  sender: string;
  receiver: string;
  txHash: string;
  blockNumber: number;
  timestamp: number;
}

export interface CCIPCommitReportEvent {
  merkleRoot: string;
  interval: { min: bigint; max: bigint };
  txHash: string;
  blockNumber: number;
  timestamp: number;
}

export interface CCIPExecutionStateChangedEvent {
  messageId: string;
  sequenceNumber: bigint;
  state: number;
  txHash: string;
  blockNumber: number;
  timestamp: number;
}

/** CCIP v1.6.1 CCIPMessageSent event data */
export interface CCIPMessageSentEventV16 {
  messageId: string;
  sourceChainSelector: bigint;
  destChainSelector: bigint;
  sequenceNumber: bigint;
  sender: string;
  receiver: string;
  feeToken: string;
  feeTokenAmount: bigint;
  txHash: string;
  blockNumber: number;
  timestamp: number;
}

/** CCIP v1.6.1 ExecutionStateChanged event data */
export interface CCIPExecutionStateChangedEventV16 {
  messageId: string;
  sourceChainSelector: bigint;
  sequenceNumber: bigint;
  messageHash: string;
  state: number;
  gasUsed: bigint;
  txHash: string;
  blockNumber: number;
  timestamp: number;
}

/** CCIP MessageExecuted event data (Router) */
export interface CCIPMessageExecutedEvent {
  messageId: string;
  sourceChainSelector: bigint;
  offRamp: string;
  calldataHash: string;
  txHash: string;
  blockNumber: number;
  timestamp: number;
}
