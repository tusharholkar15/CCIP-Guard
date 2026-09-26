import 'dotenv/config';
import { createPublicClient, http } from 'viem';
import { mainnet, arbitrum } from 'viem/chains';
import { SUPPORTED_CHAINS } from '@bridgeguard/shared';

async function verifyChain(chain: any, rpcUrl: string | undefined, name: string, routerAddress: string) {
  try {
    const client = createPublicClient({ chain, transport: http(rpcUrl) });
    const chainId = await client.getChainId();
    const blockNumber = await client.getBlockNumber();
    const code = await client.getBytecode({ address: routerAddress as `0x${string}` });
    
    console.log(`Chain: ${name}`);
    console.log(`RPC: ${rpcUrl}`);
    console.log(`Chain ID: ${chainId} (Expected: ${chain.id})`);
    console.log(`Latest Block: ${blockNumber}`);
    console.log(`Contract: ${routerAddress}`);
    console.log(`Verification: ${code && code.length > 2 ? 'LIVE RPC VERIFIED (Code Exists)' : 'NOT VERIFIED (No Code)'}`);
    console.log('Source: LIVE RPC VERIFIED\n');
  } catch(e: any) {
    console.log(`Chain: ${name}`);
    console.log(`RPC: ${rpcUrl}`);
    console.log(`NOT VERIFIED — RPC CONNECTION FAILED (${e.message})\n`);
  }
}

async function main() {
  await verifyChain(mainnet, process.env.ETHEREUM_RPC_URL, 'Ethereum Mainnet', SUPPORTED_CHAINS.ETHEREUM.routerAddress);
  await verifyChain(arbitrum, process.env.ARBITRUM_RPC_URL, 'Arbitrum One Mainnet', SUPPORTED_CHAINS.ARBITRUM.routerAddress);
}

main();
