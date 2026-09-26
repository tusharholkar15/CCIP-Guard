-- BridgeGuard Database Initialization

-- Enums
CREATE TYPE chain_status AS ENUM ('HEALTHY', 'DEGRADED', 'DOWN', 'UNKNOWN');
CREATE TYPE lane_status AS ENUM ('ACTIVE', 'DEGRADED', 'INACTIVE');
CREATE TYPE message_state AS ENUM ('SENT', 'COMMITTED', 'EXECUTION_STARTED', 'DELIVERED', 'FAILED');
CREATE TYPE incident_type AS ENUM ('HIGH_LATENCY', 'DELIVERY_FAILURE_SPIKE', 'MESSAGE_BACKLOG');
CREATE TYPE incident_severity AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE incident_status AS ENUM ('OPEN', 'INVESTIGATING', 'MITIGATED', 'RESOLVED');
CREATE TYPE alert_status AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED');
CREATE TYPE response_type AS ENUM ('PAUSE_APPLICATION_ROUTE', 'BLOCK_SENDER', 'RATE_LIMIT_ADJUSTMENT');
CREATE TYPE response_status AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXECUTED', 'EXECUTION_DISABLED');
CREATE TYPE metric_window AS ENUM ('1m', '5m', '15m', '1h');
CREATE TYPE execution_mode AS ENUM ('SIMULATION', 'DISABLED', 'LIVE');

-- Tables
CREATE TABLE IF NOT EXISTS chains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id INTEGER UNIQUE NOT NULL,
  name VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  rpc_url TEXT,
  explorer_url TEXT,
  status chain_status NOT NULL DEFAULT 'UNKNOWN',
  last_activity_at TIMESTAMPTZ,
  messages_count INTEGER NOT NULL DEFAULT 0,
  failures_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lanes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_chain_id INTEGER NOT NULL,
  destination_chain_id INTEGER NOT NULL,
  source_chain_name VARCHAR(100) NOT NULL,
  destination_chain_name VARCHAR(100) NOT NULL,
  status lane_status NOT NULL DEFAULT 'ACTIVE',
  message_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  backlog INTEGER NOT NULL DEFAULT 0,
  latency_p50 REAL,
  latency_p90 REAL,
  latency_p95 REAL,
  latency_p99 REAL,
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ccip_message_id VARCHAR(66) UNIQUE NOT NULL,
  source_chain_id INTEGER NOT NULL,
  destination_chain_id INTEGER NOT NULL,
  source_chain_name VARCHAR(100) NOT NULL,
  destination_chain_name VARCHAR(100) NOT NULL,
  sender VARCHAR(42) NOT NULL,
  receiver VARCHAR(42) NOT NULL,
  state message_state NOT NULL DEFAULT 'SENT',
  source_tx_hash VARCHAR(66),
  destination_tx_hash VARCHAR(66),
  source_block_number INTEGER,
  destination_block_number INTEGER,
  source_timestamp TIMESTAMPTZ,
  destination_timestamp TIMESTAMPTZ,
  latency_ms REAL,
  lane_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type incident_type NOT NULL,
  severity incident_severity NOT NULL,
  status incident_status NOT NULL DEFAULT 'OPEN',
  title VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  lane_id UUID,
  source_chain_name VARCHAR(100),
  destination_chain_name VARCHAR(100),
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  detection_reason TEXT NOT NULL,
  related_message_ids JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(100) NOT NULL,
  resource VARCHAR(255) NOT NULL,
  threshold REAL NOT NULL,
  observed_value REAL NOT NULL,
  status alert_status NOT NULL DEFAULT 'ACTIVE',
  message TEXT NOT NULL,
  incident_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS response_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type response_type NOT NULL,
  status response_status NOT NULL DEFAULT 'PENDING_APPROVAL',
  target VARCHAR(255) NOT NULL,
  reason TEXT NOT NULL,
  incident_id UUID,
  created_by VARCHAR(100) NOT NULL,
  operator_id VARCHAR(100),
  approved_by VARCHAR(100),
  approved_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  execution_mode execution_mode NOT NULL DEFAULT 'DISABLED',
  execution_result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100) NOT NULL,
  resource_id VARCHAR(100) NOT NULL,
  operator_id VARCHAR(100) NOT NULL,
  operator_name VARCHAR(255) NOT NULL,
  details JSONB,
  status VARCHAR(50) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS metric_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lane_id UUID NOT NULL,
  window metric_window NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  latency_p50 REAL,
  latency_p90 REAL,
  latency_p95 REAL,
  latency_p99 REAL,
  backlog INTEGER NOT NULL DEFAULT 0,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rpc_health_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id INTEGER NOT NULL,
  chain_name VARCHAR(100) NOT NULL,
  latency_ms REAL NOT NULL,
  is_healthy BOOLEAN NOT NULL,
  error_message TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_ccip_id ON messages(ccip_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_state ON messages(state);
CREATE INDEX IF NOT EXISTS idx_messages_lane_id ON messages(lane_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_type ON incidents(type);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_response_proposals_status ON response_proposals(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_metric_snapshots_lane_window ON metric_snapshots(lane_id, window);
CREATE INDEX IF NOT EXISTS idx_rpc_health_logs_chain ON rpc_health_logs(chain_id);

-- Seed chains
INSERT INTO chains (chain_id, name, display_name, explorer_url, status)
VALUES
  (1, 'ethereum', 'Ethereum', 'https://etherscan.io', 'UNKNOWN'),
  (42161, 'arbitrum', 'Arbitrum', 'https://arbiscan.io', 'UNKNOWN'),
  (10, 'optimism', 'Optimism', 'https://optimistic.etherscan.io', 'UNKNOWN'),
  (8453, 'base', 'Base', 'https://basescan.org', 'UNKNOWN'),
  (137, 'polygon', 'Polygon', 'https://polygonscan.com', 'UNKNOWN'),
  (43114, 'avalanche', 'Avalanche', 'https://snowtrace.io', 'UNKNOWN'),
  (56, 'bnb', 'BNB Chain', 'https://bscscan.com', 'UNKNOWN')
ON CONFLICT (chain_id) DO NOTHING;

-- Seed lanes
INSERT INTO lanes (source_chain_id, destination_chain_id, source_chain_name, destination_chain_name, status)
VALUES
  (1, 42161, 'Ethereum', 'Arbitrum', 'ACTIVE'),
  (42161, 1, 'Arbitrum', 'Ethereum', 'ACTIVE')
ON CONFLICT DO NOTHING;
