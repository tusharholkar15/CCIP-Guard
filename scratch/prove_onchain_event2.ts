import { createPublicClient, http, decodeEventLog } from 'viem';
import { arbitrum } from 'viem/chains';
import { CCIPMessageSentAbi } from '@bridgeguard/shared';

async function main() {
  const client = createPublicClient({
    chain: arbitrum,
    transport: http('https://arb1.arbitrum.io/rpc')
  });

  const txHash = '0xf23bfa9fd2eefb472341333f69eddd53f48fee8b0af5eeb9a3a428af9455e348';
  const receipt = await client.getTransactionReceipt({ hash: txHash });
  const block = await client.getBlock({ blockNumber: receipt.blockNumber });

  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: CCIPMessageSentAbi,
        data: log.data,
        topics: log.topics
      });
      console.log('Contract Address:', log.address);
      console.log('Event Name:', decoded.eventName);
      console.log('Log Index:', Number(log.logIndex));
      console.log('Block Number:', Number(receipt.blockNumber));
      console.log('Block Timestamp:', new Date(Number(block.timestamp) * 1000).toISOString(), `(${Number(block.timestamp)})`);
      console.log('Decoded args:', JSON.stringify(decoded.args, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2));
    } catch (e) {
      // ignore
    }
  }
}

main().catch(console.error);
