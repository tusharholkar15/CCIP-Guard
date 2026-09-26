const { createPublicClient, http } = require('viem');
const { arbitrumSepolia } = require('viem/chains');
require('dotenv').config({ path: '../../.env' });

async function main() {
  const client = createPublicClient({ chain: arbitrumSepolia, transport: http(process.env.ARBITRUM_SEPOLIA_RPC_URL) });
  
  const offRamps = [
    '0x1c71f141b4630EBE52d6aF4894812960abE207eB',
    '0xBed6e9131916d724418C8a6FE810F727302a5c00',
    '0xF4EbCC2c077d3939434C7Ab0572660c5A45e4df5',
    '0xC93218EB7B778bC0c13E5296140C8E4Fa1C440DA'
  ];
  
  const messageId = '0x43f334713102afe88395793bf742beb8947f2dc76e0c032afa7e0abe6a79b1fe';

  const currentBlock = await client.getBlockNumber();
  const fromBlock = currentBlock - 50000n;
  
  for (const offRamp of offRamps) {
    const logs1 = await client.getLogs({
      address: offRamp,
      args: [messageId],
      fromBlock,
      toBlock: 'latest'
    });
    
    if (logs1.length > 0) {
      console.log('Found on OffRamp:', offRamp, 'with messageId as arg0/topic1');
    }
  }
}

main().catch(console.error);
