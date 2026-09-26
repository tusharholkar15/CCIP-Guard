// Quick schema discovery script
const path = require('path');
const { pathToFileURL } = require('url');
const pgUrl = pathToFileURL(path.resolve(__dirname, '../node_modules/.pnpm/postgres@3.4.9/node_modules/postgres/src/index.js')).href;

(async () => {
  const { default: postgres } = await import(pgUrl);
  const sql = postgres('postgresql://bridgeguard:bridgeguard@localhost:5433/bridgeguard', { max: 1, idle_timeout: 5 });
  try {
    const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`;
    console.log(JSON.stringify(tables.map(r => r.table_name), null, 2));
  } finally {
    await sql.end();
  }
})().catch(e => console.error(JSON.stringify({ error: e.message })));
