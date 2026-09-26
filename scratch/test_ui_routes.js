async function testUiRoutes() {
  const routes = [
    '/',
    '/overview',
    '/network',
    '/messages',
    '/lanes',
    '/incidents',
    '/alerts',
    '/responses',
    '/audit',
    '/architecture',
    '/docs',
    '/about'
  ];

  const results = {};

  for (const route of routes) {
    const url = `http://localhost:3000${route}`;
    try {
      const res = await fetch(url);
      const text = await res.text();
      results[route] = {
        status: res.status,
        ok: res.ok,
        length: text.length,
        hasHtml: text.includes('<!DOCTYPE html>') || text.includes('<html'),
        hasTitle: text.includes('BridgeGuard')
      };
    } catch (err) {
      results[route] = {
        error: err.message
      };
    }
  }

  console.log(JSON.stringify(results, null, 2));
}

testUiRoutes();
