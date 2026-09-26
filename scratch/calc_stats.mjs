import postgres from '../packages/database/node_modules/postgres/src/index.js';

const sql = postgres('postgresql://bridgeguard:bridgeguard@localhost:5433/bridgeguard');

async function run() {
  console.log('--- LANE STATS ---');
  const laneStats = await sql`
    SELECT 
      l.id,
      l.source_chain_name,
      l.destination_chain_name,
      l.source_chain_id,
      l.destination_chain_id,
      COUNT(m.id) as msg_count,
      COUNT(CASE WHEN m.state = 'FAILED' THEN 1 END) as fail_count,
      COUNT(CASE WHEN m.state IN ('SENT', 'COMMITTED', 'EXECUTION_STARTED') THEN 1 END) as backlog_count,
      MAX(COALESCE(m.destination_timestamp, m.source_timestamp, m.created_at)) as last_activity,
      PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY m.latency_ms) as p50,
      PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY m.latency_ms) as p90,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY m.latency_ms) as p95,
      PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY m.latency_ms) as p99
    FROM lanes l
    LEFT JOIN messages m ON (m.source_chain_id = l.source_chain_id AND m.destination_chain_id = l.destination_chain_id)
    GROUP BY l.id, l.source_chain_name, l.destination_chain_name, l.source_chain_id, l.destination_chain_id
  `;
  console.table(laneStats);

  console.log('--- CHAIN STATS ---');
  const chainStats = await sql`
    SELECT 
      c.id,
      c.chain_id,
      c.name,
      c.display_name,
      COUNT(m.id) as msg_count,
      COUNT(CASE WHEN m.state = 'FAILED' THEN 1 END) as fail_count,
      MAX(COALESCE(m.destination_timestamp, m.source_timestamp, m.created_at)) as last_activity
    FROM chains c
    LEFT JOIN messages m ON (m.source_chain_id = c.chain_id OR m.destination_chain_id = c.chain_id)
    GROUP BY c.id, c.chain_id, c.name, c.display_name
  `;
  console.table(chainStats);

  await sql.end();
}

run().catch(console.error);
