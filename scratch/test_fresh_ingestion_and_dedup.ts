import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import { createPublicClient, http } from 'viem';
import { arbitrum } from 'viem/chains';
import { db, messages, lanes, count, eq, and } from '../packages/database/src/index';
import { scanCCIPEvents, type ScannerConfig } from '../apps/indexer/src/ccip-scanner';
import { processNormalizedEvent } from '../apps/indexer/src/ccip-persister';
import { CCIPMessageSentAbi, normalizeMessageSent } from '../packages/shared/src/index';

async function resolveLane(srcId: number, dstId: number): Promise<string | null> {
  if (!srcId || !dstId) return null;
  const existing = await db.select().from(lanes).where(
    and(eq(lanes.sourceChainId, srcId), eq(lanes.destinationChainId, dstId))
  ).limit(1);
  if (existing.length > 0) return existing[0].id;
  const anyLane = await db.select().from(lanes).limit(1);
  return anyLane.length > 0 ? anyLane[0].id : null;
}

async function testFreshIngestionAndDedup() {
  console.log('=== TASK 2 & TASK 8: FRESH DATA INGESTION & DEDUPLICATION TEST ===\n');

  const client = createPublicClient({
    chain: arbitrum,
    transport: http(process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc')
  });

  const latestBlock = await client.getBlockNumber();
  console.log(`Current Arbitrum Block Height: ${latestBlock}`);

  const onRampAddress = '0x7b73923e101950efe098c2eca74c8320b2813f48' as `0x${string}`;

  // Part A: Live Indexer Scanner check on recent blocks
  console.log('\n--- Part A: Testing Live Scanner on latest 100 blocks at chain head ---');
  const liveScanResult = await scanCCIPEvents({
    chainKey: 'ARBITRUM',
    chainName: 'Arbitrum',
    client,
    onRampAddresses: [onRampAddress],
    maxLookbackBlocks: 100n,
    chunkSize: 100n,
  });
  console.log(`✓ Live scan completed in ${liveScanResult.scanDurationMs}ms (scanned blocks ${liveScanResult.fromBlock} to ${liveScanResult.toBlock})`);
  console.log(`  Events found at head: ${liveScanResult.events.length}`);
  console.log(`  Errors: ${liveScanResult.errors.length}`);

  // Part B: Fetching real verified Mainnet CCIP event logs directly from Arbitrum OnRamp
  console.log('\n--- Part B: Ingesting Real Mainnet CCIP Event from Arbitrum ---');
  const targetBlock = 508697822n;
  const logs = await client.getLogs({
    address: onRampAddress,
    events: CCIPMessageSentAbi,
    fromBlock: targetBlock - 2n,
    toBlock: targetBlock + 2n,
  });
  console.log(`✓ Fetched ${logs.length} on-chain CCIP log(s) from Arbitrum block ${targetBlock}`);

  if (logs.length === 0) {
    throw new Error('No CCIPMessageSent logs found at block ' + targetBlock);
  }

  const normalizedEvents = logs.map(l => normalizeMessageSent('Arbitrum', l as any));
  const sampleEvent = normalizedEvents[0];
  console.log('Real Mainnet CCIP Event Details:');
  console.log(`  Message ID:   ${sampleEvent.messageId}`);
  console.log(`  Tx Hash:      ${sampleEvent.transactionHash}`);
  console.log(`  Block Number: ${sampleEvent.blockNumber}`);
  console.log(`  Sender:       ${sampleEvent.sender}`);
  console.log(`  Fee Token:    ${sampleEvent.feeToken}`);

  const initialCountRes = await db.select({ total: count() }).from(messages);
  const initialTotal = initialCountRes[0].total;
  console.log(`\nInitial messages count in DB: ${initialTotal}`);

  // Pass 1: Ingestion
  console.log('\n--- Pass 1: Ingesting CCIP Event into DB ---');
  for (const event of normalizedEvents) {
    await processNormalizedEvent(event, resolveLane);
  }
  const pass1CountRes = await db.select({ total: count() }).from(messages);
  const pass1Total = pass1CountRes[0].total;
  console.log(`Total messages in DB after Pass 1: ${pass1Total}`);

  // Pass 2: Re-ingestion for Deduplication
  console.log('\n--- Pass 2: Re-ingesting Identical CCIP Event for Deduplication Check ---');
  for (const event of normalizedEvents) {
    await processNormalizedEvent(event, resolveLane);
  }
  const pass2CountRes = await db.select({ total: count() }).from(messages);
  const pass2Total = pass2CountRes[0].total;
  console.log(`Total messages in DB after Pass 2: ${pass2Total}`);

  const duplicatesAdded = pass2Total - pass1Total;
  console.log('\n--- DEDUPLICATION AUDIT RESULT ---');
  console.log(`Pass 1 Total:     ${pass1Total}`);
  console.log(`Pass 2 Total:     ${pass2Total}`);
  console.log(`Duplicates Added: ${duplicatesAdded}`);

  if (duplicatesAdded !== 0) {
    throw new Error(`DEDUPLICATION FAILED: ${duplicatesAdded} duplicate records inserted!`);
  }
  console.log('[PASS] Deduplication verified: 0 duplicate rows created.');

  // Confirm row in DB
  const dbRows = await db.select().from(messages).where(eq(messages.ccipMessageId, sampleEvent.messageId!));
  console.log(`\nPostgres Database Row Verification:`);
  console.log(`  Row count for message ID: ${dbRows.length} (must be exactly 1)`);
  console.log(`  DB UUID:                  ${dbRows[0].id}`);
  console.log(`  CCIP Message ID:          ${dbRows[0].ccipMessageId}`);
  console.log(`  Source Chain:             ${dbRows[0].sourceChainName} (${dbRows[0].sourceChainId})`);
  console.log(`  Dest Chain:               ${dbRows[0].destinationChainName} (${dbRows[0].destinationChainId})`);
  console.log(`  Source Tx Hash:           ${dbRows[0].sourceTxHash}`);
  console.log(`  State:                    ${dbRows[0].state}`);
  console.log(`  Updated At:               ${dbRows[0].updatedAt.toISOString()}`);

  if (dbRows.length !== 1) {
    throw new Error('Database contains duplicate rows for message ID!');
  }
  console.log('\n[PASS] Tasks 2 & 8 Complete: Real CCIP Mainnet ingestion & deduplication 100% verified.');
  process.exit(0);
}

testFreshIngestionAndDedup().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
