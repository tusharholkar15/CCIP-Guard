import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import { createPublicClient, http } from 'viem';
import { arbitrum } from 'viem/chains';
import { db, messages } from '@bridgeguard/database';
import { count, eq } from 'drizzle-orm';
import { scanCCIPEvents } from '../apps/indexer/src/ccip-scanner';
import { processNormalizedEvent } from '../apps/indexer/src/ccip-persister';

async function main() {
  console.log('=== DEDUPLICATION VERIFICATION ===');
  
  const client = createPublicClient({
    chain: arbitrum,
    transport: http('https://arb1.arbitrum.io/rpc')
  });

  const chainConfig = {
    chain: arbitrum,
    client,
    chainId: 42161,
    name: 'arbitrum',
    displayName: 'Arbitrum',
    routerAddress: '0x141fa059441E0ca23ce184B6A78bafD2A517DdE8' as `0x${string}`,
    onRamps: ['0x7b73923e101950efe098c2eca74c8320b2813f48' as `0x${string}`],
    offRamps: []
  };

  const fromBlock = 508697820n;
  const toBlock = 508697825n;

  // Initial Count
  const initialCountRes = await db.select({ total: count() }).from(messages);
  const initialCount = initialCountRes[0].total;
  console.log(`Initial total database rows in 'messages': ${initialCount}`);

  // FIRST SCAN
  console.log(`\nRunning Scan 1 for blocks ${fromBlock} to ${toBlock}...`);
  const scan1 = await scanCCIPEvents(chainConfig, fromBlock, toBlock);
  console.log(`Scan 1 returned ${scan1.events.length} event(s):`);
  for (const ev of scan1.events) {
    console.log(`  - ${ev.eventName} (tx: ${ev.transactionHash}, msgId: ${ev.messageId})`);
    await processNormalizedEvent(ev, async () => null);
  }

  const afterScan1CountRes = await db.select({ total: count() }).from(messages);
  const countAfterScan1 = afterScan1CountRes[0].total;
  console.log(`Row count after Scan 1 processing: ${countAfterScan1}`);

  // SECOND SCAN (DUPLICATE RE-SCAN)
  console.log(`\nRunning Scan 2 (Identical block range ${fromBlock} to ${toBlock})...`);
  const scan2 = await scanCCIPEvents(chainConfig, fromBlock, toBlock);
  console.log(`Scan 2 returned ${scan2.events.length} event(s):`);
  for (const ev of scan2.events) {
    console.log(`  - ${ev.eventName} (tx: ${ev.transactionHash}, msgId: ${ev.messageId})`);
    await processNormalizedEvent(ev, async () => null);
  }

  const afterScan2CountRes = await db.select({ total: count() }).from(messages);
  const countAfterScan2 = afterScan2CountRes[0].total;
  console.log(`Row count after Scan 2 processing: ${countAfterScan2}`);

  console.log('\n--- VERIFICATION RESULT ---');
  console.log(`First scan events count: ${scan1.events.length}`);
  console.log(`Second scan events count: ${scan2.events.length}`);
  console.log(`Additional duplicate rows inserted: ${countAfterScan2 - countAfterScan1}`);
  console.log(`Deduplication result: ${countAfterScan2 === countAfterScan1 ? 'PASS (Zero duplicate rows created)' : 'FAIL'}`);
}

main().catch(console.error);
