const postgres = require('./node_modules/.pnpm/postgres@3.4.9/node_modules/postgres/src/index.js');
const sql = postgres('postgresql://bridgeguard:bridgeguard@localhost:5433/bridgeguard');
async function main() {
  const msgs = await sql`SELECT id, message_id, source_tx_hash, source_chain_name, destination_chain_name, sender, receiver, source_block_number, created_at FROM ccip_messages ORDER BY source_block_number DESC NULLS LAST LIMIT 10`;
  console.log('Latest 10 messages in DB:');
  console.log(JSON.stringify(msgs, null, 2));
  const count = await sql`SELECT count(*) FROM ccip_messages`;
  console.log('Total count:', count[0].count);
  await sql.end();
}
main().catch(err => {
  console.error(err);
  process.exit(1);
});
