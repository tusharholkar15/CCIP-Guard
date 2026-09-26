const { createPublicClient, http } = require('viem');
const { arbitrumSepolia } = require('viem/chains');
require('dotenv').config({ path: '../../.env' });

async function main() {
  const client = createPublicClient({ chain: arbitrumSepolia, transport: http(process.env.ARBITRUM_SEPOLIA_RPC_URL) });
  
  const offRamps = [
    '0xF4EbCC2c077d3939434C7Ab0572660c5A45e4df5',
    '0xC93218EB7B778bC0c13E5296140C8E4Fa1C440DA'
  ];
  
  const messageId = '0x43f334713102afe88395793bf742beb8947f2dc76e0c032afa7e0abe6a79b1fe';

  const currentBlock = await client.getBlockNumber();
  const fromBlock = currentBlock - 50000n;
  
  for (const offRamp of offRamps) {
    const logs = await client.getLogs({
      address: offRamp,
      topics: [null, null, messageId],
      fromBlock,
      toBlock: 'latest'
    });
    
    for (const log of logs) {
      console.log('OffRamp:', offRamp);
      console.log('Tx:', log.transactionHash);
      console.log('Block:', log.blockNumber);
      console.log('Topics:', log.topics);
      console.log('Data:', log.data);
    }
  }
}

main().catch(console.error);
