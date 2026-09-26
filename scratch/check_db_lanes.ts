import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { db } from '../packages/database/src/index';
import { chains, lanes } from '../packages/database/src/schema';

async function main() {
  try {
    const allChains = await db.select().from(chains);
    console.log('--- CHAINS IN DB ---');
    for (const c of allChains) {
      console.log(`id=${c.id}, chainId=${c.chainId}, name=${c.name}, displayName=${c.displayName}`);
    }

    const allLanes = await db.select().from(lanes);
    console.log('\n--- LANES IN DB ---');
    for (const l of allLanes) {
      console.log(`id=${l.id}, [${l.sourceChainId}] ${l.sourceChainName} -> [${l.destinationChainId}] ${l.destinationChainName}`);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

main();
