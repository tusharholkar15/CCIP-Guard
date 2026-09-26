import postgres from '../packages/database/node_modules/postgres/src/index.js';

const sql = postgres('postgresql://bridgeguard:bridgeguard@localhost:5433/bridgeguard');

async function run() {
  const summary = await sql`
    SELECT 
      source_chain_id, 
      source_chain_name, 
      destination_chain_id, 
      destination_chain_name, 
      source_chain_selector, 
      destination_chain_selector,
      lane_id,
      state,
      COUNT(*) as count
    FROM messages
    GROUP BY 
      source_chain_id, 
      source_chain_name, 
      destination_chain_id, 
      destination_chain_name, 
      source_chain_selector, 
      destination_chain_selector,
      lane_id,
      state
    ORDER BY count DESC
  `;
  console.log('MESSAGES GROUPED:');
  console.table(summary);

  await sql.end();
}

run().catch(console.error);
