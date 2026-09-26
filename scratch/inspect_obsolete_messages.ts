import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { db, chains, lanes, messages } from '../packages/database/src/index';

async function main() {
  try {
    const allMessages = await db.select().from(messages);
    console.log('TOTAL MESSAGES IN DB:', allMessages.length);
    const byLanes: Record<string, number> = {};
    for (const m of allMessages) {
      const k = `${m.sourceChainName} (${m.sourceChainId}) -> ${m.destinationChainName} (${m.destinationChainId})`;
      byLanes[k] = (byLanes[k] || 0) + 1;
    }
    console.log('MESSAGES BY LANES:', byLanes);

    const allChains = await db.select().from(chains);
    const testnetChains = allChains.filter(c => [11155111, 421614, 84532, 43113, -3].includes(c.chainId));
    console.log('TESTNET CHAINS:', testnetChains.map(c => ({ id: c.id, chainId: c.chainId, name: c.name })));

    const allLanes = await db.select().from(lanes);
    const testnetLanes = allLanes.filter(l => 
      [11155111, 421614, 84532, 43113, -3].includes(l.sourceChainId) ||
      [11155111, 421614, 84532, 43113, -3].includes(l.destinationChainId)
    );
    console.log('TESTNET LANES COUNT:', testnetLanes.length);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

main();
