const postgres = require('c:/Users/HP/OneDrive/Documents/ccip-Guard/node_modules/.pnpm/postgres@3.4.9/node_modules/postgres');

async function testConcurrency() {
  const sql1 = postgres('postgresql://bridgeguard:bridgeguard@localhost:5433/bridgeguard');
  const sql2 = postgres('postgresql://bridgeguard:bridgeguard@localhost:5433/bridgeguard');

  const testKey = 'test:lane-concurrency-test:HIGH_LATENCY';
  const order = [];

  const task1 = sql1.begin(async (tx) => {
    order.push('tx1: requesting lock');
    await tx`SELECT pg_advisory_xact_lock(hashtext(${testKey}))`;
    order.push('tx1: acquired lock, working for 500ms...');
    await new Promise(r => setTimeout(r, 500));
    order.push('tx1: finishing and committing');
  });

  // Start task 2 slightly after task 1 (e.g. 50ms)
  await new Promise(r => setTimeout(r, 50));

  const task2 = sql2.begin(async (tx) => {
    order.push('tx2: requesting lock');
    await tx`SELECT pg_advisory_xact_lock(hashtext(${testKey}))`;
    order.push('tx2: acquired lock after tx1 finished!');
  });

  await Promise.all([task1, task2]);

  console.log('Execution Timeline:');
  order.forEach(step => console.log('  ->', step));

  await sql1.end();
  await sql2.end();
}

testConcurrency().catch(err => {
  console.error(err);
  process.exit(1);
});
