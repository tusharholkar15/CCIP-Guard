import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { createPublicClient, http } from 'viem';
import { mainnet, arbitrum } from 'viem/chains';
import { scanCCIPEvents, DEFAULT_CHUNK_SIZE, type ScannerConfig } from '../apps/indexer/src/ccip-scanner';
import { SUPPORTED_CHAINS } from '../packages/shared/src/index';

async function main() {
  console.log('## CCIP MESSAGE SCAN (MAINNET)\n');

  // Ethereum Mainnet
  const ethClient = createPublicClient({ chain: mainnet, transport: http(process.env.ETHEREUM_RPC_URL) });
  const ethConfig: ScannerConfig = {
    chainKey: 'ETHEREUM',
    chainName: SUPPORTED_CHAINS.ETHEREUM.displayName,
    client: ethClient,
    routerAddresses: [SUPPORTED_CHAINS.ETHEREUM.routerAddress],
    maxLookbackBlocks: 1000n,
    chunkSize: DEFAULT_CHUNK_SIZE,
  };
  const ethResult = await scanCCIPEvents(ethConfig);

  console.log('Ethereum Mainnet:');
  console.log(`blocks scanned: ${ethResult.fromBlock} -> ${ethResult.toBlock}`);
  if (ethResult.events.length === 0) {
    console.log('No matching live CCIP events found in the scanned range.\n');
  } else {
    console.log(`CCIP events found: ${ethResult.events.length}\n`);
  }

  // Arbitrum Mainnet
  const arbClient = createPublicClient({ chain: arbitrum, transport: http(process.env.ARBITRUM_RPC_URL) });
  const arbConfig: ScannerConfig = {
    chainKey: 'ARBITRUM',
    chainName: SUPPORTED_CHAINS.ARBITRUM.displayName,
    client: arbClient,
    routerAddresses: [SUPPORTED_CHAINS.ARBITRUM.routerAddress],
    maxLookbackBlocks: 5000n,
    chunkSize: DEFAULT_CHUNK_SIZE,
  };
  const arbResult = await scanCCIPEvents(arbConfig);

  console.log('Arbitrum Mainnet:');
  console.log(`blocks scanned: ${arbResult.fromBlock} -> ${arbResult.toBlock}`);
  if (arbResult.events.length === 0) {
    console.log('No matching live CCIP events found in the scanned range.\n');
  } else {
    console.log(`CCIP events found: ${arbResult.events.length}\n`);
  }
}

main().catch(err => {
  console.error('Error during scan:', err);
  process.exit(1);
});
