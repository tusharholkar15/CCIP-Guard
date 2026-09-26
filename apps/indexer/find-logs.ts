import { createPublicClient, http, parseAbiItem } from 'viem';
import { sepolia } from 'viem/chains';

const client = createPublicClient({ chain: sepolia, transport: http('https://ethereum-sepolia-rpc.publicnode.com') });
const CCIPSendRequestedEvent = parseAbiItem('event CCIPSendRequested(bytes32 indexed messageId, (uint64 sourceChainSelector, address sender, address receiver, uint64 sequenceNumber, uint256 gasLimit, bool strict, uint64 nonce, address feeToken, uint256 feeTokenAmount, bytes data, bytes[] tokenAmounts, bytes[] sourceTokenData) message)');

async function main() {
  const latestBlock = await client.getBlockNumber();
  const address = '0x8dcf17f298c881A547D91ca4aA3C2AD7568C6777'; // Sepolia OnRamp
  
  // Public node might only allow 10000 blocks at a time, let's chunk it.
  for (let i = 0; i < 5; i++) {
    const from = latestBlock - BigInt((i+1)*10000);
    const to = latestBlock - BigInt(i*10000);
    console.log(`Searching ${from} to ${to}`);
    try {
      const logs = await client.getLogs({
        address,
        event: CCIPSendRequestedEvent,
        fromBlock: from,
        toBlock: to
      });
      if (logs.length > 0) {
        console.log(`Found ${logs.length} logs!`);
        console.log('Sample:', logs[0].args.messageId);
        break;
      }
    } catch(e) {
      console.log('Error chunking', e.message);
    }
  }
}
main();
