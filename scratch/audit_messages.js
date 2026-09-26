import postgres from '../node_modules/.pnpm/postgres@3.4.9/node_modules/postgres/src/index.js';
const sql = postgres('postgresql://bridgeguard:bridgeguard@localhost:5433/bridgeguard');

async function check() {
  const [msgCount] = await sql`SELECT count(*)::int as count FROM messages`;
  const states = await sql`SELECT state, count(*)::int as count FROM messages GROUP BY state`;
  const lanes = await sql`SELECT source_chain_name, destination_chain_name, count(*)::int as count FROM messages GROUP BY source_chain_name, destination_chain_name`;
  const [realMsg] = await sql`SELECT ccip_message_id, state, source_chain_name, destination_chain_name, source_tx_hash, destination_tx_hash, source_block_number, destination_block_number, latency_ms FROM messages WHERE ccip_message_id = '0xbeb08dc5ef344c51d5d7dee52d30a9daacccd875fde526113cb2ff95f9dfa502'`;
  console.log(JSON.stringify({ total: msgCount.count, states, lanes, realMsg }, null, 2));
  await sql.end();
}

check();
