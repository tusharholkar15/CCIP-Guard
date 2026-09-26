import postgres from '../packages/database/node_modules/postgres/src/index.js';

const sql = postgres('postgresql://bridgeguard:bridgeguard@localhost:5433/bridgeguard');

async function run() {
  const alts = await sql`SELECT id, type, resource, threshold, observed_value, status, message, incident_id, created_at, updated_at FROM alerts ORDER BY created_at DESC`;
  console.log(JSON.stringify(alts, null, 2));
  await sql.end();
}

run().catch(console.error);
