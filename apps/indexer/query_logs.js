const { createPublicClient, http, parseAbiItem } = require('viem');
const { arbitrumSepolia } = require('viem/chains');
require('dotenv').config({ path: '../../.env' });

async function main() {
  const client = createPublicClient({ chain: arbitrumSepolia, transport: http(process.env.ARBITRUM_SEPOLIA_RPC_URL) });
  
  const offRamp = '0x1c71f141b4630EBE52d6aF4894812960abE207eB';
  const messageId = '0x43f334713102afe88395793bf742beb8947f2dc76e0c032afa7e0abe6a79b1fe';

  const currentBlock = await client.getBlockNumber();
  const fromBlock = currentBlock - 50000n;
  
  console.log('Searching blocks ' + fromBlock + ' to ' + currentBlock);

  const event = parseAbiItem('event ExecutionStateChanged(uint64 indexed sequenceNumber, bytes32 indexed messageId, uint8 state, bytes returnData)');

  const logs = await client.getLogs({
    address: offRamp,
    event,
    args: { messageId },
    fromBlock,
    toBlock: 'latest'
  });

  console.log('Found ' + logs.length + ' matching logs');
  for (const log of logs) {
    console.log(log.transactionHash, log.blockNumber, log.args);
  }
}

main().catch(console.error);
