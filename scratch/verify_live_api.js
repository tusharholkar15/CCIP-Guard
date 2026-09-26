async function verifyLiveApi() {
  const endpoints = [
    'http://localhost:3001/api/dashboard/stats',
    'http://localhost:3001/api/messages?page=1&pageSize=3',
    'http://localhost:3001/api/incidents',
    'http://localhost:3001/api/alerts',
    'http://localhost:3001/api/responses',
    'http://localhost:3001/api/audit?pageSize=3'
  ];

  console.log('=== Live Fastify API Verification ===');
  for (const url of endpoints) {
    const res = await fetch(url);
    const json = await res.json();
    console.log(`\nEndpoint: ${url}`);
    console.log(`Status: ${res.status}`);
    console.log('Response sample:', JSON.stringify(json).slice(0, 300) + '...');
  }
}

verifyLiveApi().catch(console.error);
