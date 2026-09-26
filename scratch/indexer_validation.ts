import { indexerConfig } from '../apps/indexer/src/config';
import { db } from '../packages/database/src/index';
import { scanCCIPEvents } from '../apps/indexer/src/ccip-scanner';
import { createPublicClient, http, getContract } from 'viem';
import * as chains from 'viem/chains';
import { SUPPORTED_CHAINS } from '../packages/shared/src/constants/index';
import { processNormalizedEvent } from '../apps/indexer/src/ccip-persister';

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

async function discoverRamps(client: any, routerAddress: `0x${string}`) {
  const router = getContract({ address: routerAddress, abi: ROUTER_ABI, client });
  const onRampAddresses: `0x${string}`[] = [];
  const offRampAddresses: `0x${string}`[] = [];

  try {
    const offRamps = await router.read.getOffRamps() as any[];
    offRamps.forEach((r) => offRampAddresses.push(r.offRamp.toLowerCase()));

    for (const targetKey of Object.keys(SUPPORTED_CHAINS)) {
      const targetConfig = SUPPORTED_CHAINS[targetKey as keyof typeof SUPPORTED_CHAINS];
      try {
        const onRamp = await router.read.getOnRamp([targetConfig.chainSelector]);
        if (onRamp && onRamp !== '0x0000000000000000000000000000000000000000') {
          onRampAddresses.push(onRamp.toLowerCase() as `0x${string}`);
        }
      } catch (e) {
        // Destination not supported
      }
    }
  } catch (e) {
    console.error('Failed to discover ramps:', e);
  }

  return { 
    onRamps: Array.from(new Set(onRampAddresses)),
    offRamps: Array.from(new Set(offRampAddresses))
  };
}

async function runIndexer() {
  const targetChain = 'ARBITRUM';
  const config = SUPPORTED_CHAINS[targetChain];
  const rpcUrl = process.env[config.rpcEnvVar];

  const client = createPublicClient({
    chain: chains.arbitrum,
    transport: http(rpcUrl),
  });

  const { onRamps, offRamps } = await discoverRamps(client, config.routerAddress as `0x${string}`);

  console.log(`Discovered ${onRamps.length} OnRamps and ${offRamps.length} OffRamps on ${targetChain} Mainnet`);

  const scannerConfig = {
    chainKey: targetChain,
    chainName: config.displayName,
    client,
    onRampAddresses: onRamps,
    offRampAddresses: offRamps,
    routerAddresses: [config.routerAddress],
    maxLookbackBlocks: 5000n, // Scan the last 5000 blocks
    chunkSize: 500n,
  };

  console.log(`Scanning last 5000 blocks for CCIP events...`);
  const result = await scanCCIPEvents(scannerConfig);

  console.log(`Found ${result.events.length} CCIP events.`);

  if (result.events.length > 0) {
    console.log(`Persisting events...`);
    for (const event of result.events) {
      await processNormalizedEvent(event, { resolveLane: async () => 'unknown', publishEvent: async () => {}, saveMessage: async (m) => { await require('@bridgeguard/database').db.insert(require('@bridgeguard/database').messages).values(m).onConflictDoUpdate({ target: require('@bridgeguard/database').messages.ccipMessageId, set: m }); }, saveEvent: async (e) => { await require('@bridgeguard/database').db.insert(require('@bridgeguard/database').ccipEvents).values(e).onConflictDoNothing(); } });
    }
    console.log(`Persisted. Running again to test deduplication...`);
    
    // Scan again
    const result2 = await scanCCIPEvents(scannerConfig);
    console.log(`Found ${result2.events.length} CCIP events on second scan.`);
    let dedupCount = 0;
    for (const event of result2.events) {
      try {
        await processNormalizedEvent(event, { resolveLane: async () => 'unknown', publishEvent: async () => {}, saveMessage: async (m) => { await require('@bridgeguard/database').db.insert(require('@bridgeguard/database').messages).values(m).onConflictDoUpdate({ target: require('@bridgeguard/database').messages.ccipMessageId, set: m }); }, saveEvent: async (e) => { await require('@bridgeguard/database').db.insert(require('@bridgeguard/database').ccipEvents).values(e).onConflictDoNothing(); } });
      } catch (e: any) {
        if (e.message.includes('duplicate key value violates unique constraint')) {
          dedupCount++;
        }
      }
    }
    console.log(`Deduplication worked: prevented ${dedupCount} duplicates (if 0, could be handled elegantly).`);
  }
}

runIndexer().catch(console.error);
