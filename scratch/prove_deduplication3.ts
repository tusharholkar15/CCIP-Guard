import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import { createPublicClient, http } from 'viem';
import { arbitrum } from 'viem/chains';
import { db, messages } from '@bridgeguard/database';
import { count, eq } from 'drizzle-orm';
import { scanCCIPEvents, type ScannerConfig } from '../apps/indexer/src/ccip-scanner';
import { processNormalizedEvent } from '../apps/indexer/src/ccip-persister';

async function main() {
  console.log('=== DEDUPLICATION VERIFICATION ===');
  
  const client = createPublicClient({
    chain: arbitrum,
    transport: http('https://arb1.arbitrum.io/rpc')
  });

  const latest = await client.getBlockNumber();
  const targetBlock = 508697822n;
  const lookback = latest - targetBlock + 50n;

  const config: ScannerConfig = {
    chainKey: 'arbitrum',
    chainName: 'Arbitrum',
    client,
    onRampAddresses: ['0x7b73923e101950efe098c2eca74c8320b2813f48'],
    maxLookbackBlocks: lookback,
    chunkSize: lookback + 100n
  };

  const targetTx = '0xf23bfa9fd2eefb472341333f69eddd53f48fee8b0af5eeb9a3a428af9455e348';

  const initialTotalRes = await db.select({ total: count() }).from(messages);
  const initialTotal = initialTotalRes[0].total;
  console.log(`Initial total database records in 'messages': ${initialTotal}`);

  // 1. SCAN 1
  console.log(`\n--- Running SCAN 1 (Scanning last ${lookback} blocks) ---`);
  const scan1 = await scanCCIPEvents(config);
  console.log(`Scan 1 returned ${scan1.events.length} event(s)`);
  
  let scan1Processed = 0;
  for (const ev of scan1.events) {
    await processNormalizedEvent(ev, async () => null);
    scan1Processed++;
  }

  const afterScan1TotalRes = await db.select({ total: count() }).from(messages);
  const totalAfterScan1 = afterScan1TotalRes[0].total;
  console.log(`Total DB rows after Scan 1: ${totalAfterScan1}`);

  // 2. SCAN 2 (Exact same block range)
  console.log(`\n--- Running SCAN 2 (Identical block range re-scan) ---`);
  const scan2 = await scanCCIPEvents(config);
  console.log(`Scan 2 returned ${scan2.events.length} event(s)`);

  let scan2Processed = 0;
  for (const ev of scan2.events) {
    await processNormalizedEvent(ev, async () => null);
    scan2Processed++;
  }

  const afterScan2TotalRes = await db.select({ total: count() }).from(messages);
  const totalAfterScan2 = afterScan2TotalRes[0].total;
  console.log(`Total DB rows after Scan 2: ${totalAfterScan2}`);

  const targetTxRows = await db.select().from(messages).where(eq(messages.sourceTxHash, targetTx));
  console.log(`\nVerified target tx (${targetTx}) records in DB: ${targetTxRows.length}`);

  console.log('\n=============================================');
  console.log(`First scan: ${scan1.events.length} real CCIP event(s) found`);
  console.log(`Second scan: ${scan2.events.length} real CCIP event(s) found (identical range)`);
  console.log(`New duplicate rows inserted on re-scan: ${totalAfterScan2 - totalAfterScan1}`);
  console.log(`Deduplication Status: ${totalAfterScan2 === totalAfterScan1 ? 'PASS (Zero duplicate rows added)' : 'FAIL'}`);
  console.log('=============================================');
}

main().catch(console.error);
