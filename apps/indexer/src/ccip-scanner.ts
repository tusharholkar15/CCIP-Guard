/**
 * CCIP Safe Log Scanner
 * Read-only log scanning with configurable block ranges and deduplication.
 * 
 * Scans OnRamp, OffRamp, and Router contracts for CCIP events.
 * Handles RPC errors gracefully and reports empty results honestly.
 */
import { type PublicClient } from 'viem';
import {
  CCIPMessageSentAbi,
  ExecutionStateChangedAbi,
  MessageExecutedAbi,
  type NormalizedCCIPEvent,
  CCIPEventType,
  normalizeMessageSent,
  normalizeExecutionStateChanged,
  normalizeMessageExecuted,
  eventDeduplicationKey,
  SUPPORTED_CHAINS,
} from '@bridgeguard/shared';

/** Scanner configuration */
export interface ScannerConfig {
  chainKey: string;
  chainName: string;
  client: PublicClient;
  onRampAddresses?: `0x${string}`[];
  offRampAddresses?: `0x${string}`[];
  routerAddresses?: `0x${string}`[];
  maxLookbackBlocks: bigint;
  chunkSize: bigint;
}

export interface ScanResult {
  chain: string;
  fromBlock: bigint;
  toBlock: bigint;
  events: NormalizedCCIPEvent[];
  errors: string[];
  scanDurationMs: number;
}

export const DEFAULT_CHUNK_SIZE = 5000n;

export async function scanCCIPEvents(config: ScannerConfig): Promise<ScanResult> {
  const startTime = Date.now();
  const seenEvents = new Set<string>();
  const events: NormalizedCCIPEvent[] = [];
  const errors: string[] = [];

  let latestBlock: bigint;
  try {
    latestBlock = await config.client.getBlockNumber();
  } catch (err) {
    return {
      chain: config.chainName,
      fromBlock: 0n,
      toBlock: 0n,
      events: [],
      errors: [`Failed to get latest block: ${(err as Error).message}`],
      scanDurationMs: Date.now() - startTime,
    };
  }

  const fromBlock = latestBlock > config.maxLookbackBlocks
    ? latestBlock - config.maxLookbackBlocks
    : 0n;

  console.log(`[Scanner] ${config.chainName}: scanning blocks ${fromBlock} to ${latestBlock} (${latestBlock - fromBlock} blocks)`);

  for (let chunkStart = fromBlock; chunkStart <= latestBlock; chunkStart += config.chunkSize) {
    const chunkEnd = (chunkStart + config.chunkSize - 1n < latestBlock)
      ? chunkStart + config.chunkSize - 1n
      : latestBlock;

    if (config.onRampAddresses && config.onRampAddresses.length > 0) {
      try {
        const logs = await config.client.getLogs({
          address: config.onRampAddresses,
          events: CCIPMessageSentAbi,
          fromBlock: chunkStart,
          toBlock: chunkEnd,
        });
        for (const log of logs) {
          const key = eventDeduplicationKey(log.transactionHash, log.logIndex);
          if (!seenEvents.has(key)) {
            seenEvents.add(key);
            events.push(normalizeMessageSent(config.chainName, log as any));
          }
        }
      } catch (err) {
        const msg = `OnRamp scan error [${chunkStart}-${chunkEnd}]: ${(err as Error).message}`;
        console.error(`[Scanner] ${config.chainName}: ${msg}`);
        errors.push(msg);
      }
    }

    if (config.offRampAddresses && config.offRampAddresses.length > 0) {
      try {
        const logs = await config.client.getLogs({
          address: config.offRampAddresses,
          events: ExecutionStateChangedAbi,
          fromBlock: chunkStart,
          toBlock: chunkEnd,
        });
        for (const log of logs) {
          const key = eventDeduplicationKey(log.transactionHash, log.logIndex);
          if (!seenEvents.has(key)) {
            seenEvents.add(key);
            events.push(normalizeExecutionStateChanged(config.chainName, log as any));
          }
        }
      } catch (err) {
        const msg = `OffRamp scan error [${chunkStart}-${chunkEnd}]: ${(err as Error).message}`;
        console.error(`[Scanner] ${config.chainName}: ${msg}`);
        errors.push(msg);
      }
    }

    if (config.routerAddresses && config.routerAddresses.length > 0) {
      try {
        const logs = await config.client.getLogs({
          address: config.routerAddresses,
          events: MessageExecutedAbi,
          fromBlock: chunkStart,
          toBlock: chunkEnd,
        });
        for (const log of logs) {
          const key = eventDeduplicationKey(log.transactionHash, log.logIndex);
          if (!seenEvents.has(key)) {
            seenEvents.add(key);
            events.push(normalizeMessageExecuted(config.chainName, log as any));
          }
        }
      } catch (err) {
        const msg = `Router scan error [${chunkStart}-${chunkEnd}]: ${(err as Error).message}`;
        console.error(`[Scanner] ${config.chainName}: ${msg}`);
        errors.push(msg);
      }
    }
  }

  const scanDurationMs = Date.now() - startTime;

  if (events.length === 0) {
    console.log(`[Scanner] ${config.chainName}: No matching live CCIP events found in the scanned range.`);
  } else {
    const byType: Record<string, number> = {};
    for (const e of events) {
      byType[e.eventName] = (byType[e.eventName] || 0) + 1;
    }
    console.log(`[Scanner] ${config.chainName}: Found ${events.length} events in ${scanDurationMs}ms:`, byType);
  }

  return { chain: config.chainName, fromBlock, toBlock: latestBlock, events, errors, scanDurationMs };
}
