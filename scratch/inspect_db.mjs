import postgres from '../packages/database/node_modules/postgres/src/index.js';

const sql = postgres('postgresql://bridgeguard:bridgeguard@localhost:5433/bridgeguard');

async function run() {
  const chains = await sql`SELECT id, chain_id, name, display_name, status, messages_count, failures_count FROM chains ORDER BY chain_id`;
  console.log('CHAINS:');
  console.table(chains);

  const lanes = await sql`SELECT id, source_chain_id, destination_chain_id, source_chain_name, destination_chain_name, status, message_count, failure_count, backlog, latency_p50, latency_p90, latency_p95, latency_p99, last_activity_at FROM lanes ORDER BY created_at`;
  console.log('LANES:');
  console.table(lanes);

  await sql.end();
}

run().catch(console.error);
