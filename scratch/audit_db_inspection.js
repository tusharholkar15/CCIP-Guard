import postgres from '../node_modules/.pnpm/postgres@3.4.9/node_modules/postgres/src/index.js';

const sql = postgres('postgresql://bridgeguard:bridgeguard@localhost:5433/bridgeguard');

async function auditData() {
  const results = {};

  try {
    const [msgCount] = await sql`SELECT count(*)::int as count FROM messages`;
    results.totalMessages = msgCount.count;

    results.messagesByState = await sql`
      SELECT state, count(*)::int as count FROM messages GROUP BY state ORDER BY count DESC
    `;

    results.messagesByLane = await sql`
      SELECT source_chain_name, destination_chain_name, count(*)::int as count 
      FROM messages 
      GROUP BY source_chain_name, destination_chain_name 
      ORDER BY count DESC
    `;

    const [realMsg] = await sql`
      SELECT id, ccip_message_id, state, source_chain_name, destination_chain_name, source_chain_id, destination_chain_id,
             source_tx_hash, destination_tx_hash, source_block_number, destination_block_number,
             source_timestamp, destination_timestamp, latency_ms, created_at, updated_at
      FROM messages 
      WHERE ccip_message_id = '0xbeb08dc5ef344c51d5d7dee52d30a9daacccd875fde526113cb2ff95f9dfa502'
    `;
    results.knownRealMessage = realMsg;

    results.chains = await sql`
      SELECT id, name, chain_id, status, messages_count, updated_at FROM chains ORDER BY chain_id
    `;

    results.lanes = await sql`
      SELECT id, source_chain_name, destination_chain_name, source_chain_id, destination_chain_id, 
             status, message_count, failure_count, backlog,
             latency_p50, latency_p90, latency_p95, latency_p99, last_activity_at
      FROM lanes
    `;

    results.incidents = await sql`
      SELECT id, type, severity, status, title, lane_id, source_chain_name, destination_chain_name, created_at
      FROM incidents ORDER BY created_at ASC
    `;

    results.alerts = await sql`
      SELECT id, type, resource, threshold, observed_value, status, incident_id, created_at
      FROM alerts ORDER BY created_at ASC
    `;

    const [auditCount] = await sql`SELECT count(*)::int as count FROM audit_logs`;
    results.totalAuditLogs = auditCount.count;

    results.auditActions = await sql`
      SELECT action, count(*)::int as count FROM audit_logs GROUP BY action ORDER BY count DESC
    `;

    results.latestAuditLogs = await sql`
      SELECT id, action, resource, resource_id, operator_id, operator_name, status, timestamp
      FROM audit_logs ORDER BY timestamp DESC LIMIT 5
    `;

    results.proposals = await sql`
      SELECT id, type, status, target, reason, operator_id, incident_id, execution_mode, created_at
      FROM response_proposals ORDER BY created_at ASC
    `;

    results.metricSnapshots = await sql`
      SELECT lane_id, "window", message_count, success_count, failure_count, latency_p95, backlog, timestamp
      FROM metric_snapshots ORDER BY timestamp DESC LIMIT 5
    `;

    console.log(JSON.stringify(results, null, 2));
  } catch (err) {
    console.error('Audit query error:', err);
  } finally {
    await sql.end();
  }
}

auditData();
