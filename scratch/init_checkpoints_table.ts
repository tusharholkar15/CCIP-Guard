import { db } from '@bridgeguard/database';
import { sql } from 'drizzle-orm';

async function main() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS indexer_checkpoints (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      chain_id INTEGER UNIQUE NOT NULL,
      chain_name VARCHAR(100) NOT NULL,
      last_processed_block BIGINT NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );
  `);
  console.log('indexer_checkpoints table verified/created successfully');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
