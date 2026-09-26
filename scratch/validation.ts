import { createPublicClient, http, getContract } from 'viem';
import * as chains from 'viem/chains';
import { SUPPORTED_CHAINS } from '../packages/shared/src/constants/index';
import * as dotenv from 'dotenv';
dotenv.config();

const ROUTER_ABI = [
  {
    inputs: [{ internalType: 'uint64', name: 'destChainSelector', type: 'uint64' }],
    name: 'getOnRamp',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getOffRamps',
    outputs: [{
      components: [
        { internalType: 'uint64', name: 'sourceChainSelector', type: 'uint64' },
        { internalType: 'address', name: 'offRamp', type: 'address' }
      ],
      internalType: 'struct Router.OffRamp[]',
      name: '',
      type: 'tuple[]'
    }],
    stateMutability: 'view',
    type: 'function',
  }
];

async function run() {
  const mainnets = [
    { key: 'ETHEREUM', viemChain: chains.mainnet },
    { key: 'ARBITRUM', viemChain: chains.arbitrum },
    { key: 'OPTIMISM', viemChain: chains.optimism },
    { key: 'BASE', viemChain: chains.base },
    { key: 'POLYGON', viemChain: chains.polygon },
    { key: 'AVALANCHE', viemChain: chains.avalanche },
    { key: 'BNB', viemChain: chains.bsc },
  ];

  let totalRamps = 0;

  for (const network of mainnets) {
    console.log(`\n--- Verifying ${network.key} ---`);
    const chainConfig = SUPPORTED_CHAINS[network.key as keyof typeof SUPPORTED_CHAINS];
    if (!chainConfig) {
      console.log(`FAIL: Missing SUPPORTED_CHAINS entry for ${network.key}`);
      continue;
    }
    const rpcUrl = process.env[chainConfig.rpcEnvVar];
    if (!rpcUrl) {
      console.log(`FAIL: Missing ${chainConfig.rpcEnvVar} in .env`);
      continue;
    }

    const client = createPublicClient({
      chain: network.viemChain,
      transport: http(rpcUrl),
    });

    try {
      const chainId = await client.getChainId();
      console.log(`Chain ID: ${chainId} (Expected: ${chainConfig.chainId})`);
      if (chainId !== chainConfig.chainId) throw new Error("Chain ID mismatch");

      const block = await client.getBlock();
      console.log(`Latest Block: ${block.number}`);
      console.log(`Block Timestamp: ${new Date(Number(block.timestamp) * 1000).toISOString()}`);

      const routerContract = getContract({
        address: chainConfig.routerAddress as `0x${string}`,
        abi: ROUTER_ABI,
        client,
      });

      console.log(`Router Address: ${chainConfig.routerAddress}`);
      const offRamps = await routerContract.read.getOffRamps() as any[];
      console.log(`Found ${offRamps.length} configured OffRamps`);
      totalRamps += offRamps.length;

    } catch (e: any) {
      console.log(`FAIL: ${e.message}`);
    }
  }
  console.log(`\nTOTAL RAMPS CONFIGURED: ${totalRamps}`);
}

run().catch(console.error);
