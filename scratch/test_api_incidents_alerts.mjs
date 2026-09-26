async function test() {
  console.log('--- GET /api/incidents ---');
  const incRes = await fetch('http://localhost:3001/api/incidents');
  const incData = await incRes.json();
  console.log('Status:', incRes.status);
  console.log('Total:', incData.total);
  console.log(JSON.stringify(incData, null, 2));

  console.log('\n--- GET /api/alerts ---');
  const altRes = await fetch('http://localhost:3001/api/alerts');
  const altData = await altRes.json();
  console.log('Status:', altRes.status);
  console.log('Total:', altData.total);
  console.log(JSON.stringify(altData, null, 2));
}

test().catch(console.error);
