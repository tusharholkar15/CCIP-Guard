import postgres from '../node_modules/.pnpm/postgres@3.4.9/node_modules/postgres/src/index.js';
const sql = postgres('postgresql://bridgeguard:bridgeguard@localhost:5433/bridgeguard');
const enums = await sql`SELECT typname, enumlabel FROM pg_type JOIN pg_enum ON pg_type.oid = pg_enum.enumtypid ORDER BY typname, pg_enum.enumsortorder`;
console.log(JSON.stringify(enums.map(e => ({type: e.typname, label: e.enumlabel})), null, 2));
await sql.end();
