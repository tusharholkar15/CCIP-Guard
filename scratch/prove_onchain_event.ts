import { createPublicClient, http, decodeEventLog } from 'viem';
import { arbitrum } from 'viem/chains';
import { CCIPMessageSentAbi } from '@bridgeguard/shared';

async function main() {
  const client = createPublicClient({
    chain: arbitrum,
    transport: http('https://arb1.arbitrum.io/rpc')
  });

  const txHash = '0xf23bfa9fd2eefb472341333f69eddd53f48fee8b0af5eeb9a3a428af9455e348';
  console.log('Fetching receipt for tx:', txHash);
  const receipt = await client.getTransactionReceipt({ hash: txHash });
  const block = await client.getBlock({ blockNumber: receipt.blockNumber });

  console.log('=== REAL ARBITRUM CCIP ON-CHAIN PROOF ===');
  console.log('Transaction Hash:', receipt.transactionHash);
  console.log('Block Number:', Number(receipt.blockNumber));
  console.log('Block Timestamp:', new Date(Number(block.timestamp) * 1000).toISOString(), `(${Number(block.timestamp)})`);
  console.log('Status:', receipt.status);

  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: CCIPMessageSentAbi,
        data: log.data,
        topics: log.topics
      });
      console.log('\n--- MATCHED CCIP EVENT ---');
      console.log('Contract Address:', log.address);
      console.log('Event Name:', decoded.eventName);
      console.log('Log Index:', Number(log.logIndex));
      console.log('Message ID:', (decoded.args as any)?.message?.messageId);
      console.log('Source Chain Selector:', (decoded.args as any)?.message?.sourceChainSelector?.toString());
      console.log('Dest Chain Selector:', (decoded.args as any)?.message?.destinationChainSelector?.toString());
      console.log('Sender:', (decoded.args as any)?.message?.sender);
      console.log('Receiver:', (decoded.args as any)?.message?.receiver);
      console.log('Sequence Number:', (decoded.args as any)?.message?.sequenceNumber?.toString());
      console.log('Fee Token:', (decoded.args as any)?.message?.feeToken);
      console.log('Fee Token Amount:', (decoded.args as any)?.message?.feeTokenAmount?.toString());
    } catch (e) {
      // not CCIPMessageSent
    }
  }
}

main().catch(console.error);
