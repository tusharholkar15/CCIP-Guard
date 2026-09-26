const { createPublicClient, http } = require('viem');
const { arbitrumSepolia } = require('viem/chains');
require('dotenv').config({ path: '../../.env' });

async function main() {
  const client = createPublicClient({ chain: arbitrumSepolia, transport: http(process.env.ARBITRUM_SEPOLIA_RPC_URL) });
  
  const router = '0x2a9C5afB0d0e4BAb2BCdaE109EC4b0c4Be15a165';
  
  const abi = [
    {
      type: 'function',
      name: 'getOffRamps',
      stateMutability: 'view',
      inputs: [],
      outputs: [
        {
          components: [
            { name: 'sourceChainSelector', type: 'uint64' },
            { name: 'offRamp', type: 'address' }
          ],
          name: 'offRampAddresses',
          type: 'tuple[]'
        }
      ]
    }
  ];

  try {
    const offRamps = await client.readContract({
      address: router,
      abi,
      functionName: 'getOffRamps',
    });
    console.log(offRamps);
  } catch(e) {
    console.error(e);
  }
}

main().catch(console.error);
