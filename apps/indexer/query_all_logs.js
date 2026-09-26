const { createPublicClient, http, parseAbiItem } = require('viem');
const { arbitrumSepolia } = require('viem/chains');
require('dotenv').config({ path: '../../.env' });

async function main() {
  const client = createPublicClient({ chain: arbitrumSepolia, transport: http(process.env.ARBITRUM_SEPOLIA_RPC_URL) });
  
  const offRamp = '0x1c71f141b4630EBE52d6aF4894812960abE207eB';

  const currentBlock = await client.getBlockNumber();
  const fromBlock = currentBlock - 50000n;
  
  console.log('Searching all logs ' + fromBlock + ' to ' + currentBlock);

  const logs = await client.getLogs({
    address: offRamp,
    fromBlock,
    toBlock: 'latest'
  });

  console.log('Found ' + logs.length + ' total logs');
  for (const log of logs) {
    if (log.topics[0] === '0xd4f851956a5d67c3997d1c9205045fef79bae2947fdee7e9e2641abc7391ef65') {
       console.log('Found ExecutionStateChanged event:', log.transactionHash, log.topics);
    }
  }
}

main().catch(console.error);
