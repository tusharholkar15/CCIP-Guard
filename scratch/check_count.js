import postgres from '../node_modules/.pnpm/postgres@3.4.9/node_modules/postgres/src/index.js';

async function check() {
  const sql = postgres('postgresql://bridgeguard:bridgeguard@localhost:5433/bridgeguard');
  const [c] = await sql`SELECT count(*)::int as count FROM messages`;
  console.log('Current DB messages count:', c.count);

  const apiRes = await fetch('http://localhost:3001/api/dashboard/stats').then(r => r.json());
  console.log('Current API stats:', apiRes);

  const chains = await sql`SELECT name, messages_count FROM chains`;
  console.log('Chains table messages_count:', chains);

  const lanes = await sql`SELECT source_chain_name, destination_chain_name, message_count FROM lanes`;
  console.log('Lanes table message_count:', lanes);

  // Group by source/dest
  const breakdown = await sql`SELECT source_chain_name, destination_chain_name, count(*)::int FROM messages GROUP BY source_chain_name, destination_chain_name`;
  console.log('Messages in DB grouped by source/dest:', breakdown);

  await sql.end();
}

check();
