const postgres = require('c:/Users/HP/OneDrive/Documents/ccip-Guard/node_modules/.pnpm/postgres@3.4.9/node_modules/postgres');
const sql = postgres('postgresql://bridgeguard:bridgeguard@localhost:5433/bridgeguard');

async function main() {
  const incs = await sql`SELECT id, type, severity, status, title, lane_id, source_chain_name, destination_chain_name, detection_reason, created_at FROM incidents ORDER BY created_at ASC`;
  console.log('=== INCIDENTS (' + incs.length + ') ===');
  console.log(JSON.stringify(incs, null, 2));

  const alts = await sql`SELECT id, type, resource, threshold, observed_value, status, incident_id, created_at FROM alerts ORDER BY created_at ASC`;
  console.log('=== ALERTS (' + alts.length + ') ===');
  console.log(JSON.stringify(alts, null, 2));

  const resps = await sql`SELECT id, type, status, target, reason, incident_id, created_by, operator_id, approved_by, approved_at, execution_mode, created_at FROM response_proposals ORDER BY created_at ASC`;
  console.log('=== RESPONSE PROPOSALS (' + resps.length + ') ===');
  console.log(JSON.stringify(resps, null, 2));

  const audits = await sql`SELECT id, action, resource, resource_id, operator_id, operator_name, status, timestamp FROM audit_logs ORDER BY timestamp ASC`;
  console.log('=== AUDIT LOGS (' + audits.length + ') ===');
  console.log(JSON.stringify(audits, null, 2));

  await sql.end();
}
main().catch(err => {
  console.error(err);
  process.exit(1);
});
