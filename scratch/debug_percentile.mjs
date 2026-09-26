import postgres from '../packages/database/node_modules/postgres/src/index.js';

const sql = postgres('postgresql://bridgeguard:bridgeguard@localhost:5433/bridgeguard');

async function run() {
  const res = await sql`
    SELECT 
      l.id,
      l.source_chain_name,
      l.destination_chain_name,
      COUNT(m.id)::int as message_count,
      PERCENTILE_DISC(0.50) WITHIN GROUP (ORDER BY m.latency_ms) as latency_p50,
      PERCENTILE_DISC(0.95) WITHIN GROUP (ORDER BY m.latency_ms) as latency_p95
    FROM lanes l
    LEFT JOIN messages m ON (m.source_chain_id = l.source_chain_id AND m.destination_chain_id = l.destination_chain_id)
    GROUP BY l.id, l.source_chain_name, l.destination_chain_name
  `;
  console.log('RES:', res);

  const msgs = await sql`
    SELECT id, latency_ms, source_chain_id, destination_chain_id
    FROM messages
    WHERE source_chain_id = 11155111 AND destination_chain_id = 421614
  `;
  console.log('MSGS:', msgs);

  await sql.end();
}

run().catch(console.error);
