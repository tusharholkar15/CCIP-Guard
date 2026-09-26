import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import { createPublicClient, http, parseAbiItem, decodeEventLog } from 'viem';
import { sepolia, arbitrumSepolia } from 'viem/chains';
import { db } from '@bridgeguard/database';
import { messages } from '@bridgeguard/database';
import { eq } from 'drizzle-orm';

const SOURCE_TX = '0xdb95c7ccf34a8aec00a54fff998db0f238c32312c52eb174e2a307d258128366';

const CCIPMessageSentEvent = parseAbiItem(
  'event CCIPMessageSent(uint64 indexed destChainSelector, address indexed sender, bytes32 indexed messageId, address feeToken, uint256 tokenAmountBeforeTokenPoolFees, bytes encodedMessage, (address issuer, uint32 destGasLimit, uint32 destBytesOverhead, uint256 feeTokenAmount, bytes extraArgs)[] receipts, bytes[] verifierBlobs)'
);

async function main() {
  const ethClient = createPublicClient({ chain: sepolia, transport: http(process.env.SEPOLIA_RPC_URL) });
  const arbClient = createPublicClient({ chain: arbitrumSepolia, transport: http(process.env.ARBITRUM_SEPOLIA_RPC_URL) });
  
  console.log(`[TRACE] Source TX: ${SOURCE_TX}`);
  
  // 1. Get Transaction Receipt
  const receipt = await ethClient.getTransactionReceipt({ hash: SOURCE_TX as `0x${string}` });
  console.log(`[TRACE] Source Block: ${receipt.blockNumber}`);
  const block = await ethClient.getBlock({ blockNumber: receipt.blockNumber });
  console.log(`[TRACE] Source Timestamp: ${block.timestamp}`);

  // 2. Extract Message ID
  let messageId: string | null = null;
  let destSelector: bigint | null = null;
  
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: [CCIPMessageSentEvent],
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === 'CCIPMessageSent') {
        messageId = (decoded.args as any).messageId;
        destSelector = (decoded.args as any).destChainSelector;
        console.log(`[TRACE] Found CCIPMessageSent!`);
        console.log(`[TRACE] Message ID: ${messageId}`);
        console.log(`[TRACE] Dest Selector: ${destSelector}`);
      }
    } catch (e) {}
  }

  if (!messageId) {
    console.log('[TRACE] No CCIPMessageSent event found in receipt.');
    return;
  }

  // 3. Check BridgeGuard PostgreSQL
  console.log(`\n[TRACE] Querying BridgeGuard Database for ${messageId}...`);
  const dbMsgs = await db.select().from(messages).where(eq(messages.ccipMessageId, messageId));
  
  if (dbMsgs.length === 0) {
    console.log(`[TRACE] Database: NOT FOUND (Indexer might not have caught up or is offline)`);
  } else {
    const msg = dbMsgs[0];
    console.log(`[TRACE] Database: FOUND`);
    console.log(`[TRACE] DB State: ${msg.state}`);
    console.log(`[TRACE] DB Source Block: ${msg.sourceBlockNumber}`);
    console.log(`[TRACE] DB Dest Block: ${msg.destinationBlockNumber || 'NULL'}`);
    console.log(`[TRACE] DB Dest TX: ${msg.destinationTransactionHash || 'NULL'}`);
    console.log(`[TRACE] DB Latency: ${msg.latencyMs || 'NULL'} ms`);
  }
  
  // 4. Check Arbitrum Sepolia for ExecutionStateChanged
  console.log(`\n[TRACE] Querying Arbitrum Sepolia for ExecutionStateChanged for message ${messageId}...`);
  
  const ExecutionStateChangedEvent = parseAbiItem(
    'event ExecutionStateChanged(uint64 indexed sourceChainSelector, uint64 indexed sequenceNumber, bytes32 indexed messageId, uint8 state, bytes returnData)'
  );
  
  try {
    const latestArbBlock = await arbClient.getBlockNumber();
    const fromBlock = latestArbBlock - 1000n; // Search last 1000 blocks (a few hours on Arb Sepolia)
    
    const logs = await arbClient.getLogs({
      event: ExecutionStateChangedEvent,
      args: { messageId },
      fromBlock,
      toBlock: 'latest'
    });
    
    if (logs.length === 0) {
      console.log(`[TRACE] Arbitrum Sepolia: No ExecutionStateChanged event found yet.`);
    } else {
      for (const log of logs) {
        console.log(`[TRACE] Arbitrum Sepolia: FOUND Event in block ${log.blockNumber}`);
        console.log(`[TRACE] Transaction Hash: ${log.transactionHash}`);
        const stateArg = (log as any).args?.state;
        console.log(`[TRACE] Execution State: ${stateArg} (1=IN_PROGRESS, 2=SUCCESS, 3=FAILURE)`);
      }
    }
  } catch (err) {
    console.error('[TRACE] Failed to query Arbitrum Sepolia:', err);
  }
}

main().catch(console.error);
