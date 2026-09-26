import {
  pgTable,
  uuid,
  varchar,
  integer,
  bigint,
  text,
  timestamp,
  boolean,
  jsonb,
  real,
  pgEnum,
  unique,
} from 'drizzle-orm/pg-core';

// ========== Enums ==========
export const chainStatusEnum = pgEnum('chain_status', ['HEALTHY', 'DEGRADED', 'DOWN', 'UNKNOWN']);
export const laneStatusEnum = pgEnum('lane_status', ['ACTIVE', 'DEGRADED', 'INACTIVE']);
export const messageStateEnum = pgEnum('message_state', ['DISCOVERED', 'SENT', 'PROCESSING', 'DESTINATION_DETECTED', 'EXECUTED', 'SUCCESS', 'FAILED', 'TIMEOUT', 'UNKNOWN', 'REORGED']);
export const incidentTypeEnum = pgEnum('incident_type', ['HIGH_LATENCY', 'DELIVERY_FAILURE_SPIKE', 'MESSAGE_BACKLOG', 'SUSPICIOUS_ACTIVITY']);
export const incidentSeverityEnum = pgEnum('incident_severity', ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const incidentStatusEnum = pgEnum('incident_status', ['OPEN', 'INVESTIGATING', 'MITIGATED', 'RESOLVED']);
export const alertStatusEnum = pgEnum('alert_status', ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED']);
export const responseTypeEnum = pgEnum('response_type', ['PAUSE_APPLICATION_ROUTE', 'BLOCK_SENDER', 'RATE_LIMIT_ADJUSTMENT']);
export const responseStatusEnum = pgEnum('response_status', ['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXECUTED', 'EXECUTION_DISABLED']);
export const metricWindowEnum = pgEnum('metric_window', ['1m', '5m', '15m', '1h']);
export const executionModeEnum = pgEnum('execution_mode', ['SIMULATION', 'DISABLED', 'LIVE']);

// ========== Tables ==========
export const chains = pgTable('chains', {
  id: uuid('id').defaultRandom().primaryKey(),
  chainId: integer('chain_id').unique().notNull(),
  name: varchar('name', { length: 100 }).unique().notNull(),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  rpcUrl: text('rpc_url'),
  explorerUrl: text('explorer_url'),
  status: chainStatusEnum('status').default('UNKNOWN').notNull(),
  lastActivityAt: timestamp('last_activity_at', { withTimezone: true }),
  messagesCount: integer('messages_count').default(0).notNull(),
  failuresCount: integer('failures_count').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const lanes = pgTable('lanes', {
  id: uuid('id').defaultRandom().primaryKey(),
  sourceChainId: integer('source_chain_id').notNull(),
  destinationChainId: integer('destination_chain_id').notNull(),
  sourceChainName: varchar('source_chain_name', { length: 100 }).notNull(),
  destinationChainName: varchar('destination_chain_name', { length: 100 }).notNull(),
  status: laneStatusEnum('status').default('ACTIVE').notNull(),
  messageCount: integer('message_count').default(0).notNull(),
  failureCount: integer('failure_count').default(0).notNull(),
  backlog: integer('backlog').default(0).notNull(),
  latencyP50: real('latency_p50'),
  latencyP90: real('latency_p90'),
  latencyP95: real('latency_p95'),
  latencyP99: real('latency_p99'),
  lastActivityAt: timestamp('last_activity_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  ccipMessageId: varchar('ccip_message_id', { length: 66 }).unique().notNull(),
  sourceChainId: integer('source_chain_id').notNull(),
  destinationChainId: integer('destination_chain_id').notNull(),
  sourceChainName: varchar('source_chain_name', { length: 100 }).notNull(),
  destinationChainName: varchar('destination_chain_name', { length: 100 }).notNull(),
  sender: varchar('sender', { length: 42 }).notNull(),
  receiver: varchar('receiver', { length: 42 }).notNull(),
  state: messageStateEnum('state').default('SENT').notNull(),
  sourceTxHash: varchar('source_tx_hash', { length: 66 }),
  destinationTxHash: varchar('destination_tx_hash', { length: 66 }),
  sourceBlockNumber: integer('source_block_number'),
  destinationBlockNumber: integer('destination_block_number'),
  sourceTimestamp: timestamp('source_timestamp', { withTimezone: true }),
  destinationTimestamp: timestamp('destination_timestamp', { withTimezone: true }),
  latencyMs: real('latency_ms'),
  laneId: uuid('lane_id').notNull(),
  sequenceNumber: bigint('sequence_number', { mode: 'bigint' }),
  sourceChainSelector: varchar('source_chain_selector', { length: 30 }),
  destinationChainSelector: varchar('destination_chain_selector', { length: 30 }),
  feeToken: varchar('fee_token', { length: 42 }),
  feeTokenAmount: varchar('fee_token_amount', { length: 78 }),
  messageHash: varchar('message_hash', { length: 66 }),
  executionState: integer('execution_state'),
  gasUsed: bigint('gas_used', { mode: 'bigint' }),
  returnData: text('return_data'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const incidents = pgTable('incidents', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: incidentTypeEnum('type').notNull(),
  severity: incidentSeverityEnum('severity').notNull(),
  status: incidentStatusEnum('status').default('OPEN').notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description').notNull(),
  laneId: uuid('lane_id'),
  sourceChainName: varchar('source_chain_name', { length: 100 }),
  destinationChainName: varchar('destination_chain_name', { length: 100 }),
  detectedAt: timestamp('detected_at', { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  detectionReason: text('detection_reason').notNull(),
  relatedMessageIds: jsonb('related_message_ids').$type<string[]>().default([]).notNull(),
  metadata: jsonb('metadata').$type<Record<string, any>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const alerts = pgTable('alerts', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: varchar('type', { length: 100 }).notNull(),
  resource: varchar('resource', { length: 255 }).notNull(),
  threshold: real('threshold').notNull(),
  observedValue: real('observed_value').notNull(),
  status: alertStatusEnum('status').default('ACTIVE').notNull(),
  message: text('message').notNull(),
  incidentId: uuid('incident_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const responseProposals = pgTable('response_proposals', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: responseTypeEnum('type').notNull(),
  status: responseStatusEnum('status').default('PENDING_APPROVAL').notNull(),
  target: varchar('target', { length: 255 }).notNull(),
  reason: text('reason').notNull(),
  incidentId: uuid('incident_id'),
  createdBy: varchar('created_by', { length: 100 }).notNull(),
  operatorId: varchar('operator_id', { length: 100 }),
  approvedBy: varchar('approved_by', { length: 100 }),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  executedAt: timestamp('executed_at', { withTimezone: true }),
  rejectedAt: timestamp('rejected_at', { withTimezone: true }),
  rejectionReason: text('rejection_reason'),
  executionMode: executionModeEnum('execution_mode').default('DISABLED').notNull(),
  executionResult: jsonb('execution_result'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  action: varchar('action', { length: 100 }).notNull(),
  resource: varchar('resource', { length: 100 }).notNull(),
  resourceId: varchar('resource_id', { length: 100 }).notNull(),
  operatorId: varchar('operator_id', { length: 100 }).notNull(),
  operatorName: varchar('operator_name', { length: 255 }).notNull(),
  details: jsonb('details'),
  status: varchar('status', { length: 50 }).notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
});

export const metricSnapshots = pgTable('metric_snapshots', {
  id: uuid('id').defaultRandom().primaryKey(),
  laneId: uuid('lane_id').notNull(),
  window: metricWindowEnum('window').notNull(),
  messageCount: integer('message_count').default(0).notNull(),
  successCount: integer('success_count').default(0).notNull(),
  failureCount: integer('failure_count').default(0).notNull(),
  latencyP50: real('latency_p50'),
  latencyP90: real('latency_p90'),
  latencyP95: real('latency_p95'),
  latencyP99: real('latency_p99'),
  backlog: integer('backlog').default(0).notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
});

export const rpcHealthLogs = pgTable('rpc_health_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  chainId: integer('chain_id').notNull(),
  chainName: varchar('chain_name', { length: 100 }).notNull(),
  latencyMs: real('latency_ms').notNull(),
  isHealthy: boolean('is_healthy').notNull(),
  errorMessage: text('error_message'),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
});

export const indexerCheckpoints = pgTable('indexer_checkpoints', {
  id: uuid('id').defaultRandom().primaryKey(),
  chainId: integer('chain_id').unique().notNull(),
  chainName: varchar('chain_name', { length: 100 }).notNull(),
  lastProcessedBlock: bigint('last_processed_block', { mode: 'bigint' }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const ccipEvents = pgTable('ccip_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  ccipMessageId: varchar('ccip_message_id', { length: 66 }),
  chainId: integer('chain_id').notNull(),
  transactionHash: varchar('transaction_hash', { length: 66 }).notNull(),
  blockNumber: bigint('block_number', { mode: 'bigint' }).notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  contractAddress: varchar('contract_address', { length: 42 }).notNull(),
  eventName: varchar('event_name', { length: 100 }).notNull(),
  logIndex: integer('log_index').notNull(),
  args: jsonb('args').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  unq_event: unique('unq_ccip_event').on(table.chainId, table.transactionHash, table.logIndex),
}));

export const transactions = pgTable('transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  chainId: integer('chain_id').notNull(),
  hash: varchar('hash', { length: 66 }).notNull(),
  blockNumber: bigint('block_number', { mode: 'bigint' }).notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  from: varchar('from', { length: 42 }),
  to: varchar('to', { length: 42 }),
  value: varchar('value', { length: 78 }),
  ccipRelation: varchar('ccip_relation', { length: 50 }),
  status: varchar('status', { length: 20 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  unq_tx: unique('unq_transaction').on(table.chainId, table.hash),
}));
