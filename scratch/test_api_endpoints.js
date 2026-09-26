async function testEndpoints() {
  const endpoints = [
    { name: 'Health', url: 'http://localhost:3001/health' },
    { name: 'Dashboard Stats', url: 'http://localhost:3001/api/dashboard/stats' },
    { name: 'Messages List', url: 'http://localhost:3001/api/messages?page=1&pageSize=5' },
    { name: 'Search Known Real Message', url: 'http://localhost:3001/api/messages?search=0xbeb08dc5ef344c51d5d7dee52d30a9daacccd875fde526113cb2ff95f9dfa502' },
    { name: 'Lanes', url: 'http://localhost:3001/api/lanes' },
    { name: 'Chains', url: 'http://localhost:3001/api/chains' },
    { name: 'Incidents', url: 'http://localhost:3001/api/incidents' },
    { name: 'Alerts', url: 'http://localhost:3001/api/alerts' },
    { name: 'Responses', url: 'http://localhost:3001/api/responses' },
    { name: 'Audit', url: 'http://localhost:3001/api/audit?page=1&pageSize=5' }
  ];

  const results = {};

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep.url);
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
      results[ep.name] = {
        status: res.status,
        ok: res.ok,
        data
      };
    } catch (err) {
      results[ep.name] = {
        error: err.message
      };
    }
  }

  console.log(JSON.stringify(results, null, 2));
}

testEndpoints();
