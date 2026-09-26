import postgres from '../node_modules/.pnpm/postgres@3.4.9/node_modules/postgres/src/index.js';

async function checkRecentMessages() {
  const sql = postgres('postgresql://bridgeguard:bridgeguard@localhost:5433/bridgeguard');
  const recent = await sql`
    SELECT id, ccip_message_id, source_chain_name, destination_chain_name, state, created_at, updated_at
    FROM messages
    ORDER BY created_at DESC
    LIMIT 35
  `;
  console.log('Most recent messages created:');
  console.log(JSON.stringify(recent.map(r => ({
    id: r.id,
    msgId: r.ccip_message_id.slice(0, 16) + '...',
    src: r.source_chain_name,
    dst: r.destination_chain_name,
    state: r.state,
    created_at: r.created_at
  })), null, 2));

  // Count by created_at date
  const byDate = await sql`
    SELECT date_trunc('hour', created_at) as hour, count(*)::int
    FROM messages
    GROUP BY hour
    ORDER BY hour DESC
  `;
  console.log('Messages by creation hour:', byDate);

  await sql.end();
}

checkRecentMessages();
