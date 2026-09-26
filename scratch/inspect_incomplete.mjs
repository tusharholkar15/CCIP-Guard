import postgres from '../packages/database/node_modules/postgres/src/index.js';

const sql = postgres('postgresql://bridgeguard:bridgeguard@localhost:5433/bridgeguard');

async function run() {
  const inc = await sql`
    SELECT 
      id,
      ccip_message_id,
      source_chain_id,
      source_chain_name,
      destination_chain_id,
      destination_chain_name,
      source_chain_selector,
      destination_chain_selector,
      lane_id,
      state,
      source_tx_hash,
      destination_tx_hash
    FROM messages
    WHERE destination_chain_id = 0
  `;
  console.log('INCOMPLETE MESSAGES:');
  console.table(inc);

  await sql.end();
}

run().catch(console.error);
