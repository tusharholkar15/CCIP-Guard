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

  const config: ScannerConfig = {
    chainKey: 'arbitrum',
    chainName: 'Arbitrum',
    client,
    onRampAddresses: ['0x7b73923e101950efe098c2eca74c8320b2813f48'],
    maxLookbackBlocks: 10n,
    chunkSize: 10n
  };

  const targetTx = '0xf23bfa9fd2eefb472341333f69eddd53f48fee8b0af5eeb9a3a428af9455e348';
  const targetBlock = 508697822n;

  // 1. Initial count of this specific message
  const initialRows = await db.select().from(messages).where(eq(messages.sourceTxHash, targetTx));
  console.log(`Initial DB count for tx ${targetTx}: ${initialRows.length} record(s)`);

  const initialTotalRes = await db.select({ total: count() }).from(messages);
  const initialTotal = initialTotalRes[0].total;
  console.log(`Initial total rows in messages table: ${initialTotal}`);

  // 2. SCAN 1
  console.log(`\n--- Running SCAN 1 for target block ${targetBlock} ---`);
  const scan1 = await scanCCIPEvents(config, targetBlock - 2n, targetBlock + 2n);
  console.log(`Scan 1 discovered ${scan1.events.length} event(s)`);
  
  for (const ev of scan1.events) {
    console.log(`Persisting event ${ev.eventName} (tx: ${ev.transactionHash})...`);
    await processNormalizedEvent(ev, async () => null);
  }

  const afterScan1TotalRes = await db.select({ total: count() }).from(messages);
  const totalAfterScan1 = afterScan1TotalRes[0].total;
  console.log(`Total rows after Scan 1: ${totalAfterScan1}`);

  // 3. SCAN 2 (Exact same block range again)
  console.log(`\n--- Running SCAN 2 (Re-scan identical blocks ${targetBlock - 2n} to ${targetBlock + 2n}) ---`);
  const scan2 = await scanCCIPEvents(config, targetBlock - 2n, targetBlock + 2n);
  console.log(`Scan 2 discovered ${scan2.events.length} duplicate event(s)`);

  for (const ev of scan2.events) {
    console.log(`Persisting duplicate event ${ev.eventName} (tx: ${ev.transactionHash})...`);
    await processNormalizedEvent(ev, async () => null);
  }

  const afterScan2TotalRes = await db.select({ total: count() }).from(messages);
  const totalAfterScan2 = afterScan2TotalRes[0].total;
  console.log(`Total rows after Scan 2: ${totalAfterScan2}`);

  const finalRows = await db.select().from(messages).where(eq(messages.sourceTxHash, targetTx));
  console.log(`\nFinal DB count for tx ${targetTx}: ${finalRows.length} record(s)`);

  console.log('\n=============================================');
  console.log(`First scan: ${scan1.events.length} event(s) scanned and processed`);
  console.log(`Second scan: ${scan2.events.length} duplicate event(s) scanned and processed`);
  console.log(`Net new rows created on re-scan: ${totalAfterScan2 - totalAfterScan1}`);
  console.log(`Deduplication: ${totalAfterScan2 === totalAfterScan1 ? 'PASS (100% idempotent, zero duplicate rows)' : 'FAIL'}`);
  console.log('=============================================');
}

main().catch(console.error);
