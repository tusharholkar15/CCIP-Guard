const postgres = require('c:/Users/HP/OneDrive/Documents/ccip-Guard/node_modules/.pnpm/postgres@3.4.9/node_modules/postgres');
const sql = postgres('postgresql://bridgeguard:bridgeguard@localhost:5433/bridgeguard');

async function testLock() {
  await sql.begin(async (tx) => {
    const key = 'incident:6fd3682e-8d07-4ec1-b282-9561b0b45548:HIGH_LATENCY';
    const res = await tx`SELECT pg_advisory_xact_lock(hashtext(${key})) as locked`;
    console.log('Lock acquired successfully in transaction!', res);
  });
  console.log('Transaction committed, lock released!');
  await sql.end();
}

testLock().catch(err => {
  console.error(err);
  process.exit(1);
});
