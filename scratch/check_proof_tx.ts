import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import { createPublicClient, http, decodeEventLog } from 'viem';
import { sepolia, arbitrumSepolia } from 'viem/chains';
import { CCIPMessageSentAbi, ExecutionStateChangedAbi } from '@bridgeguard/shared';
import { db, messages } from '@bridgeguard/database';
import { eq } from 'drizzle-orm';

const PROOF_TX = '0xc2aea21e50c32e61d0c9de0f0de915bddd760112b9f2bb08b543c9171513cd04';

async function main() {
  const ethClient = createPublicClient({ chain: sepolia, transport: http(process.env.SEPOLIA_RPC_URL) });
  const arbClient = createPublicClient({ chain: arbitrumSepolia, transport: http(process.env.ARBITRUM_SEPOLIA_RPC_URL) });

  console.log('=== Checking Proof Tx on Ethereum Sepolia ===');
  console.log('Tx Hash:', PROOF_TX);
  const receipt = await ethClient.getTransactionReceipt({ hash: PROOF_TX as `0x${string}` });
  const tx = await ethClient.getTransaction({ hash: PROOF_TX as `0x${string}` });
  const block = await ethClient.getBlock({ blockNumber: receipt.blockNumber });

  console.log('Status:', receipt.status);
  console.log('Block Number:', receipt.blockNumber.toString());
  console.log('Timestamp:', new Date(Number(block.timestamp) * 1000).toISOString());
  console.log('From:', tx.from);
  console.log('To:', tx.to);

  let messageId: string | null = null;
  let destSelector: bigint | null = null;

  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: CCIPMessageSentAbi,
        data: log.data,
        topics: log.topics,
      });
      console.log('Found CCIPMessageSent log on:', log.address);
      const args: any = decoded.args;
      messageId = args.messageId;
      destSelector = args.destChainSelector;
      console.log('Decoded args:');
      console.log(JSON.stringify(args, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2));
    } catch {}
  }

  console.log('\n=== Checking Database for this Tx / MessageId ===');
  const dbByTx = await db.select().from(messages).where(eq(messages.sourceTxHash, PROOF_TX));
  console.log('Found by sourceTxHash in DB:', dbByTx.length);
  if (messageId) {
    const dbByMsgId = await db.select().from(messages).where(eq(messages.ccipMessageId, messageId));
    console.log('Found by ccipMessageId in DB:', dbByMsgId.length);
  }

  if (messageId) {
    console.log('\n=== Checking Arbitrum Sepolia for ExecutionStateChanged ===');
    const arbBlock = await arbClient.getBlockNumber();
    const fromBlock = arbBlock > 100000n ? arbBlock - 100000n : 0n;
    const offRampLogs = await arbClient.getLogs({
      address: '0xC93218EB7B778bC0c13E5296140C8E4Fa1C440DA',
      fromBlock,
      toBlock: arbBlock,
    });
    const match = offRampLogs.filter(l => l.topics[3]?.toLowerCase() === messageId.toLowerCase());
    console.log(`Found ${match.length} matching ExecutionStateChanged logs on Arbitrum Sepolia:`);
    for (const m of match) {
      console.log('  Dest Tx:', m.transactionHash, 'Block:', m.blockNumber.toString());
    }
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
