import postgres from '../packages/database/node_modules/postgres/src/index.js';

const sql = postgres('postgresql://bridgeguard:bridgeguard@localhost:5433/bridgeguard');

async function run() {
  const incs = await sql`SELECT id, type, severity, status, title, description, lane_id, source_chain_name, destination_chain_name, detected_at, resolved_at, detection_reason, related_message_ids, created_at, updated_at FROM incidents ORDER BY detected_at DESC`;
  console.log(JSON.stringify(incs, null, 2));
  await sql.end();
}

run().catch(console.error);
