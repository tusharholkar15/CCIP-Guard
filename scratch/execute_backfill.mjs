import postgres from '../packages/database/node_modules/postgres/src/index.js';

const sql = postgres('postgresql://bridgeguard:bridgeguard@localhost:5433/bridgeguard');

async function run() {
  console.log('Starting controlled backfill...');

  // 1. Backfill source chain info for TON Testnet
  const tonRes = await sql`
    UPDATE messages 
    SET 
      source_chain_id = -3,
      source_chain_name = 'TON Testnet',
      updated_at = NOW()
    WHERE source_chain_selector = '1399300952838017768'
    RETURNING id
  `;
  console.log(`Updated ${tonRes.length} messages for TON Testnet.`);

  // 2. Backfill source chain info for Base Sepolia
  const baseRes = await sql`
    UPDATE messages 
    SET 
      source_chain_id = 84532,
      source_chain_name = 'Base Sepolia',
      updated_at = NOW()
    WHERE source_chain_selector = '10344971235874465080'
    RETURNING id
  `;
  console.log(`Updated ${baseRes.length} messages for Base Sepolia.`);

  // 3. Backfill source chain info for Avalanche Fuji
  const avaxRes = await sql`
    UPDATE messages 
    SET 
      source_chain_id = 43113,
      source_chain_name = 'Avalanche Fuji',
      updated_at = NOW()
    WHERE source_chain_selector = '14767482510784806043'
    RETURNING id
  `;
  console.log(`Updated ${avaxRes.length} messages for Avalanche Fuji.`);

  // 4. Ensure the 5 incomplete messages have unmapped lane_id 00000000-0000-0000-0000-000000000000
  const incRes = await sql`
    UPDATE messages
    SET
      lane_id = '00000000-0000-0000-0000-000000000000',
      updated_at = NOW()
    WHERE destination_chain_id = 0
    RETURNING id
  `;
  console.log(`Updated ${incRes.length} incomplete messages to unmapped lane.`);

  // 5. Update lanes table with real computed metrics
  console.log('Updating lanes table with aggregated metrics...');
  const laneStats = await sql`
    SELECT 
      l.id,
      COUNT(m.id)::int as message_count,
      COUNT(CASE WHEN m.state = 'FAILED' THEN 1 END)::int as failure_count,
      COUNT(CASE WHEN m.state IN ('SENT', 'COMMITTED', 'EXECUTION_STARTED') THEN 1 END)::int as backlog,
      PERCENTILE_DISC(0.50) WITHIN GROUP (ORDER BY m.latency_ms) as latency_p50,
      PERCENTILE_DISC(0.90) WITHIN GROUP (ORDER BY m.latency_ms) as latency_p90,
      PERCENTILE_DISC(0.95) WITHIN GROUP (ORDER BY m.latency_ms) as latency_p95,
      PERCENTILE_DISC(0.99) WITHIN GROUP (ORDER BY m.latency_ms) as latency_p99,
      MAX(COALESCE(m.destination_timestamp, m.source_timestamp, m.created_at)) as last_activity_at
    FROM lanes l
    LEFT JOIN messages m ON (m.source_chain_id = l.source_chain_id AND m.destination_chain_id = l.destination_chain_id)
    GROUP BY l.id
  `;

  for (const s of laneStats) {
    await sql`
      UPDATE lanes
      SET 
        message_count = ${s.message_count},
        failure_count = ${s.failure_count},
        backlog = ${s.backlog},
        latency_p50 = ${s.latency_p50},
        latency_p90 = ${s.latency_p90},
        latency_p95 = ${s.latency_p95},
        latency_p99 = ${s.latency_p99},
        last_activity_at = ${s.last_activity_at},
        updated_at = NOW()
      WHERE id = ${s.id}
    `;
    console.log(`Lane ${s.id} updated: count=${s.message_count}, p50=${s.latency_p50}, p95=${s.latency_p95}`);
  }

  // 6. Update chains table with real computed metrics
  console.log('Updating chains table with aggregated metrics...');
  const chainStats = await sql`
    SELECT 
      c.id,
      c.chain_id,
      COUNT(m.id)::int as messages_count,
      COUNT(CASE WHEN m.state = 'FAILED' THEN 1 END)::int as failures_count,
      MAX(COALESCE(m.destination_timestamp, m.source_timestamp, m.created_at)) as last_activity_at
    FROM chains c
    LEFT JOIN messages m ON (m.source_chain_id = c.chain_id OR m.destination_chain_id = c.chain_id)
    GROUP BY c.id, c.chain_id
  `;

  for (const cs of chainStats) {
    await sql`
      UPDATE chains
      SET
        messages_count = ${cs.messages_count},
        failures_count = ${cs.failures_count},
        last_activity_at = ${cs.last_activity_at},
        updated_at = NOW()
      WHERE id = ${cs.id}
    `;
    console.log(`Chain ${cs.chain_id} updated: count=${cs.messages_count}, failures=${cs.failures_count}`);
  }

  console.log('Controlled backfill completed successfully.');
  await sql.end();
}

run().catch((err) => {
  console.error('Backfill error:', err);
  process.exit(1);
});
