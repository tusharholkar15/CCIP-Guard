import { createPublicClient, http, parseAbiItem } from 'viem';
import { sepolia } from 'viem/chains';

const client = createPublicClient({ chain: sepolia, transport: http('https://ethereum-sepolia-rpc.publicnode.com') });
const CCIPSendRequestedEvent = parseAbiItem('event CCIPSendRequested(bytes32 indexed messageId, (uint64 sourceChainSelector, address sender, address receiver, uint64 sequenceNumber, uint256 gasLimit, bool strict, uint64 nonce, address feeToken, uint256 feeTokenAmount, bytes data, bytes[] tokenAmounts, bytes[] sourceTokenData) message)');

async function main() {
  const latestBlock = await client.getBlockNumber();
  const logs = await client.getLogs({
    event: CCIPSendRequestedEvent,
    fromBlock: latestBlock - 50000n,
    toBlock: latestBlock
  });
  console.log(`Found ${logs.length} logs in last 50000 blocks!`);
  if (logs.length > 0) {
    const l = logs[0];
    console.log(`Found event at address ${l.address}, tx ${l.transactionHash}`);
    console.log('Message ID:', l.args.messageId);
  }
}
main();
