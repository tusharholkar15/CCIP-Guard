import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
import { createPublicClient, http, type PublicClient, type Chain } from 'viem';
import { db } from '@bridgeguard/database';
import { chains, lanes, messages, rpcHealthLogs } from '@bridgeguard/database';
import { 
  SUPPORTED_CHAINS, 
  CHAIN_ID_TO_NAME, 
  CCIPMessageSentAbi, 
  ExecutionStateChangedAbi,
  MessageExecutedAbi,
  normalizeMessageSent,
  normalizeExecutionStateChanged,
  normalizeMessageExecuted
} from '@bridgeguard/shared';
import { publishEvent, CHANNELS } from '@bridgeguard/redis';
import { eq, and } from 'drizzle-orm';
import { scanCCIPEvents } from './ccip-scanner';
import { processNormalizedEvent } from './ccip-persister';

// CCIP v1.6 ABI events
const CCIPMessageSentEvent = CCIPMessageSentAbi[0];
const ExecutionStateChangedEvent = ExecutionStateChangedAbi[0];

interface ChainConfig {
  chain: Chain;
  name: string;
  chainId: number;
  rpcUrl: string;
  client: PublicClient;
  unwatchOnRamp?: () => void;
  unwatchOffRamp?: () => void;
  unwatchRouter?: () => void;
}

async function initializeChains(): Promise<ChainConfig[]> {
  const configs: ChainConfig[] = [];

  for (const [key, chainConfig] of Object.entries(SUPPORTED_CHAINS)) {
    const rpcUrl = process.env[chainConfig.rpcEnvVar];
    if (rpcUrl) {
      // Find the viem chain object by chainId (fallback to a generic custom chain if needed, but viem handles http well)
      const client = createPublicClient({ transport: http(rpcUrl) });
      configs.push({
        chain: { id: chainConfig.chainId, name: chainConfig.name, network: chainConfig.name } as any, // Mock chain object for viem since we only need http transport
        name: chainConfig.name,
        chainId: chainConfig.chainId,
        rpcUrl,
        client,
      });
      console.log(`[Indexer] Initialized ${chainConfig.displayName} client`);
    }
  }

  return configs;
}

async function ensureChainsAndLanes(configs: ChainConfig[]) {
  for (const config of configs) {
    const existing = await db.select().from(chains).where(eq(chains.chainId, config.chainId));
    if (existing.length === 0) {
      await db.insert(chains).values({
        chainId: config.chainId,
        name: config.name,
        displayName: CHAIN_ID_TO_NAME[config.chainId] || config.name,
        explorerUrl: config.chain.blockExplorers?.default.url || '',
        status: 'HEALTHY',
      });
    } else {
      await db.update(chains).set({ status: 'HEALTHY', updatedAt: new Date() }).where(eq(chains.chainId, config.chainId));
    }
  }

  for (const source of configs) {
    for (const dest of configs) {
      if (source.chainId === dest.chainId) continue;
      const existing = await db.select().from(lanes).where(and(eq(lanes.sourceChainId, source.chainId), eq(lanes.destinationChainId, dest.chainId)));
      if (existing.length === 0) {
        await db.insert(lanes).values({
          sourceChainId: source.chainId,
          destinationChainId: dest.chainId,
          sourceChainName: CHAIN_ID_TO_NAME[source.chainId] || source.name,
          destinationChainName: CHAIN_ID_TO_NAME[dest.chainId] || dest.name,
          status: 'ACTIVE',
        });
      }
    }
  }
}

async function checkRpcHealth(configs: ChainConfig[]) {
  for (const config of configs) {
    const start = Date.now();
    try {
      await config.client.getBlockNumber();
      await db.insert(rpcHealthLogs).values({ chainId: config.chainId, chainName: CHAIN_ID_TO_NAME[config.chainId] || config.name, latencyMs: Date.now() - start, isHealthy: true });
      await db.update(chains).set({ status: 'HEALTHY', updatedAt: new Date() }).where(eq(chains.chainId, config.chainId));
    } catch (err) {
      await db.insert(rpcHealthLogs).values({ chainId: config.chainId, chainName: CHAIN_ID_TO_NAME[config.chainId] || config.name, latencyMs: Date.now() - start, isHealthy: false, errorMessage: (err as Error).message });
      await db.update(chains).set({ status: 'DEGRADED', updatedAt: new Date() }).where(eq(chains.chainId, config.chainId));
      console.error(`[Indexer] RPC health check failed for ${config.name}:`, (err as Error).message);
    }
  }
}

async function resolveLane(srcId: number, dstId: number): Promise<string | null> {
  if (!srcId || !dstId) return null;
  const existing = await db.select().from(lanes).where(and(eq(lanes.sourceChainId, srcId), eq(lanes.destinationChainId, dstId))).limit(1);
  if (existing.length > 0) return existing[0].id;
  const anyLane = await db.select().from(lanes).limit(1);
  return anyLane.length > 0 ? anyLane[0].id : null;
}

import { CCIP_ABIS, CCIP_CHAIN_SELECTORS } from '@bridgeguard/shared';
import { RobustCCIPWatcher } from './ccip-watcher';

const activeWatchers: RobustCCIPWatcher[] = [];

async function discoverRamps(client: PublicClient, routerAddress: `0x${string}`) {
  const onRamps = new Set<`0x${string}`>();
  const offRamps = new Set<`0x${string}`>();

  try {
    const offRampsResult = await client.readContract({
      address: routerAddress,
      abi: CCIP_ABIS.router,
      functionName: 'getOffRamps',
    }) as { sourceChainSelector: bigint; offRamp: `0x${string}` }[];
    for (const r of offRampsResult) {
      offRamps.add(r.offRamp);
    }
  } catch (err) {
    console.warn(`[Indexer] Could not fetch offRamps from router ${routerAddress}`);
  }

  for (const selector of Object.keys(CCIP_CHAIN_SELECTORS)) {
    try {
      const onRamp = await client.readContract({
        address: routerAddress,
        abi: CCIP_ABIS.router,
        functionName: 'getOnRamp',
        args: [BigInt(selector)],
      }) as `0x${string}`;
      if (onRamp && onRamp !== '0x0000000000000000000000000000000000000000') {
        onRamps.add(onRamp);
      }
    } catch {
      // Ignored: Not supported
    }
  }

  return {
    onRampAddresses: Array.from(onRamps),
    offRampAddresses: Array.from(offRamps),
  };
}

async function startWatching(configs: ChainConfig[]) {
  // 1. REQUIREMENT A: Watchers MUST start first in parallel
  console.log('[Indexer] Initializing live watchers for all configured chains...');
  const startPromises = configs.map(async config => {
    const chainKey = Object.keys(SUPPORTED_CHAINS).find(
      k => (SUPPORTED_CHAINS as any)[k].chainId === config.chainId
    );
    if (!chainKey) return;
    const chain = (SUPPORTED_CHAINS as any)[chainKey];
    
    console.log(`[Indexer] Discovering ramps for ${config.name}...`);
    const ramps = await discoverRamps(config.client, chain.routerAddress);
    console.log(`[Indexer] ${config.name}: Found ${ramps.onRampAddresses.length} OnRamps, ${ramps.offRampAddresses.length} OffRamps`);

    const watcher = new RobustCCIPWatcher({
      chainKey,
      chainName: CHAIN_ID_TO_NAME[config.chainId] || config.name,
      chainId: config.chainId,
      client: config.client,
      onRampAddresses: ramps.onRampAddresses,
      offRampAddresses: ramps.offRampAddresses,
      routerAddresses: [chain.routerAddress],
      onEvent: async (event) => {
        await processNormalizedEvent(event, resolveLane);
      },
      pollingIntervalMs: 3000,
      heartbeatIntervalMs: 30000,
    });

    activeWatchers.push(watcher);
    await watcher.start();
  });

  await Promise.allSettled(startPromises);

  // 2. Perform historical backfill asynchronously in background so it NEVER blocks live watching
  (async () => {
    for (const config of configs) {
      const chainKey = Object.keys(SUPPORTED_CHAINS).find(
        k => (SUPPORTED_CHAINS as any)[k].chainId === config.chainId
      );
      if (!chainKey) continue;
      const chain = (SUPPORTED_CHAINS as any)[chainKey];
      try {
        console.log(`[Indexer] ${config.name}: Background backfill started...`);
        const ramps = await discoverRamps(config.client, chain.routerAddress);
        const scannerConfig = {
          chainKey,
          chainName: chain.displayName,
          client: config.client,
          onRampAddresses: ramps.onRampAddresses,
          offRampAddresses: ramps.offRampAddresses,
          routerAddresses: [chain.routerAddress],
          maxLookbackBlocks: 5000n, // Use a generic safe lookback for mainnet
          chunkSize: 2000n,
        };
        const result = await scanCCIPEvents(scannerConfig);
        const blockTimeCache = new Map<bigint, number>();
        for (const event of result.events) {
          if (!event.timestamp && event.blockNumber) {
            if (!blockTimeCache.has(event.blockNumber)) {
              try {
                const b = await config.client.getBlock({ blockNumber: event.blockNumber });
                blockTimeCache.set(event.blockNumber, Number(b.timestamp));
              } catch (_err) {
                // Block timestamp fetch failure is non-fatal
              }
            }
            event.timestamp = blockTimeCache.get(event.blockNumber) ?? null;
          }
          await processNormalizedEvent(event, resolveLane);
        }
        console.log(`[Indexer] ${config.name} background backfill completed: found ${result.events.length} events in ${result.scanDurationMs}ms.`);
      } catch (err: any) {
        console.error(`[Indexer] Failed background backfill for ${config.name}:`, err.message);
      }
    }
  })().catch(err => {
    console.error('[Indexer] Background backfill error:', err);
  });
}

let activeConfigs: ChainConfig[] = [];

async function main() {
  console.log('[Indexer] BridgeGuard CCIP Indexer starting...');
  activeConfigs = await initializeChains();

  if (activeConfigs.length === 0) {
    console.error('[Indexer] No chains configured. Standing by...');
    setInterval(() => console.log('[Indexer] Standby'), 60000);
    return;
  }

  await ensureChainsAndLanes(activeConfigs);
  await checkRpcHealth(activeConfigs);
  setInterval(() => checkRpcHealth(activeConfigs), 30000);
  await startWatching(activeConfigs);

  await publishEvent(CHANNELS.NETWORK_STATUS, {
    chains: activeConfigs.map(c => ({ chainId: c.chainId, name: c.name, status: 'HEALTHY' })),
    timestamp: new Date().toISOString(),
  });
}

main().catch(err => {
  console.error('[Indexer] Fatal error:', err);
  process.exit(1);
});

function gracefulShutdown() {
  console.log('[Indexer] Shutting down watchers...');
  for (const watcher of activeWatchers) {
    try {
      watcher.stop();
    } catch (_err) {
      // Ignore stop errors during shutdown
    }
  }
  process.exit(0);
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
