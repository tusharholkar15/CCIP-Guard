// BridgeGuard DB Audit Script
// Run: node scratch/audit_db.js

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const postgres = (await import('../node_modules/.pnpm/postgres@3.4.9/node_modules/postgres/src/index.js')).default;

const sql = postgres('postgresql://bridgeguard:bridgeguard@localhost:5433/bridgeguard', {
  max: 1,
  idle_timeout: 5,
});

async function runAudit() {
  const results = {};

  try {
    // 1. Total messages
    const [totalMessages] = await sql`SELECT COUNT(*) as count FROM ccip_messages`;
    results.total_messages = totalMessages.count;

    // 2. Message states breakdown
    const messageStates = await sql`SELECT state, COUNT(*) as count FROM ccip_messages GROUP BY state ORDER BY count DESC`;
    results.message_states = messageStates.map(r => ({ state: r.state, count: r.count }));

    // 3. Total lanes
    const [totalLanes] = await sql`SELECT COUNT(*) as count FROM lanes`;
    results.total_lanes = totalLanes.count;

    // 4. Lane details
    const lanes = await sql`SELECT id, source_chain_name, destination_chain_name, source_chain_id, destination_chain_id, status FROM lanes`;
    results.lane_details = lanes.map(r => ({ ...r }));

    // 5. Incidents
    const incidents = await sql`SELECT id, type, status, lane_id, severity, created_at FROM incidents ORDER BY created_at`;
    results.incidents = incidents.map(r => ({ ...r }));

    // 6. Alerts
    const alerts = await sql`SELECT id, type, status, resource, created_at FROM alerts ORDER BY created_at`;
    results.alerts = alerts.map(r => ({ ...r }));

    // 7. Total audit_logs
    const [totalAuditLogs] = await sql`SELECT COUNT(*) as count FROM audit_logs`;
    results.total_audit_logs = totalAuditLogs.count;

    // 8. Audit log actions breakdown
    const auditActions = await sql`SELECT action, COUNT(*) as count FROM audit_logs GROUP BY action ORDER BY count DESC`;
    results.audit_log_actions = auditActions.map(r => ({ action: r.action, count: r.count }));

    // 9. Response proposals
    const proposals = await sql`SELECT id, type, status, target, reason, operator_id, incident_id, created_at FROM response_proposals`;
    results.response_proposals = proposals.map(r => ({ ...r }));

    // 10. Metric snapshots
    const snapshots = await sql`SELECT lane_id, window, message_count, failure_count, latency_p95, backlog, timestamp FROM metric_snapshots ORDER BY timestamp DESC LIMIT 20`;
    results.metric_snapshots = snapshots.map(r => ({ ...r }));

    // 11. Sample messages
    const sampleMessages = await sql`SELECT message_id, state, source_chain_name, destination_chain_name, source_tx_hash, destination_tx_hash, source_block_number, destination_block_number, latency_ms, created_at FROM ccip_messages ORDER BY created_at DESC LIMIT 10`;
    results.sample_messages = sampleMessages.map(r => ({ ...r }));

    // 12. Known real message
    const knownMessage = await sql`SELECT * FROM ccip_messages WHERE message_id = '0xbeb08dc5ef344c51d5d7dee52d30a9daacccd875fde526113cb2ff95f9dfa502'`;
    results.known_message = knownMessage.length > 0 ? knownMessage.map(r => ({ ...r })) : null;

    // 13. Chain message counts
    const chains = await sql`SELECT c.name, c.chain_id, c.status, c.messages_count FROM chains c ORDER BY c.chain_id`;
    results.chain_message_counts = chains.map(r => ({ ...r }));

    // 14. Lane message_count vs actual messages
    const laneReconciliation = await sql`
      SELECT l.id, l.source_chain_name, l.destination_chain_name, l.message_count as lane_reported,
             COUNT(m.id) as actual_messages
      FROM lanes l
      LEFT JOIN ccip_messages m ON m.source_chain_name = l.source_chain_name AND m.destination_chain_name = l.destination_chain_name
      GROUP BY l.id, l.source_chain_name, l.destination_chain_name, l.message_count
    `;
    results.lane_vs_actual = laneReconciliation.map(r => ({ ...r }));

  } catch (err) {
    results.error = { message: err.message, stack: err.stack };
  } finally {
    await sql.end();
  }

  console.log(JSON.stringify(results, null, 2));
}

runAudit();
