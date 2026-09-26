import { createPublicClient, http } from 'viem';
import { sepolia, arbitrumSepolia } from 'viem/chains';
import { SUPPORTED_CHAINS } from '../packages/shared/dist/index.js';

async function verifyChain(chain, rpcUrl, name, onRampAddress) {
  try {
    const client = createPublicClient({ chain, transport: http(rpcUrl) });
    const chainId = await client.getChainId();
    const blockNumber = await client.getBlockNumber();
    const code = await client.getBytecode({ address: onRampAddress });
    
    console.log(`Chain: ${name}`);
    console.log(`RPC: ${rpcUrl}`);
    console.log(`Chain ID: ${chainId} (Expected: ${chain.id})`);
    console.log(`Latest Block: ${blockNumber}`);
    console.log(`Contract: ${onRampAddress}`);
    console.log(`Verification: ${code && code.length > 2 ? 'LIVE RPC VERIFIED (Code Exists)' : 'NOT VERIFIED (No Code)'}`);
    console.log('Source: LIVE RPC VERIFIED\n');
  } catch(e) {
    console.log(`Chain: ${name}`);
    console.log(`RPC: ${rpcUrl}`);
    console.log(`NOT VERIFIED — RPC CONNECTION FAILED (${e.message})\n`);
  }
}

async function main() {
  await verifyChain(sepolia, process.env.SEPOLIA_RPC_URL, 'Ethereum Sepolia', SUPPORTED_CHAINS.ETHEREUM_SEPOLIA.onRampAddress);
  await verifyChain(arbitrumSepolia, process.env.ARBITRUM_SEPOLIA_RPC_URL, 'Arbitrum Sepolia', SUPPORTED_CHAINS.ARBITRUM_SEPOLIA.onRampAddress);
}

main();
