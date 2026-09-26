import { type PublicClient, type Log } from 'viem';
import {
  CCIPMessageSentAbi,
  ExecutionStateChangedAbi,
  MessageExecutedAbi,
  normalizeMessageSent,
  normalizeExecutionStateChanged,
  normalizeMessageExecuted,
  type NormalizedCCIPEvent,
  eventDeduplicationKey,
  SUPPORTED_CHAINS,
} from '@bridgeguard/shared';
import { CheckpointManager } from './ccip-checkpoint';

export type WatcherStatus = 'IDLE' | 'CONNECTING' | 'ACTIVE' | 'RECONNECTING' | 'ERROR';

export interface ChainWatcherOptions {
  chainKey: string;
  chainName: string;
  chainId: number;
  client: PublicClient;
  onRampAddresses?: `0x${string}`[];
  offRampAddresses?: `0x${string}`[];
  routerAddresses?: `0x${string}`[];
  onEvent: (event: NormalizedCCIPEvent) => Promise<void>;
  pollingIntervalMs?: number;
  heartbeatIntervalMs?: number;
}

export class RobustCCIPWatcher {
  private options: ChainWatcherOptions;
  private status: WatcherStatus = 'IDLE';
  private unwatchers: Array<() => void> = [];
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private lastActivityTimestamp = Date.now();
  private isDestroyed = false;
  private seenLogs = new Set<string>();

  constructor(options: ChainWatcherOptions) {
    this.options = options;
  }

  public getStatus(): WatcherStatus {
    return this.status;
  }

  public getChainName(): string {
    return this.options.chainName;
  }

  /**
   * Starts the watcher with immediate live watching and background gap recovery.
   */
  public async start(): Promise<void> {
    if (this.isDestroyed) return;
    this.status = 'CONNECTING';

    try {
      // 1. Recover any missed blocks since last checkpoint before or concurrent with live watching
      await this.recoverMissedBlocks();

      // 2. Setup live subscriptions
      await this.setupWatchers();

      this.status = 'ACTIVE';
      this.reconnectAttempts = 0;
      console.log(`[Indexer] ${this.options.chainName} watcher: ACTIVE`);

      // 3. Start liveness watchdog heartbeat
      this.startHeartbeat();
    } catch (err: any) {
      console.error(`[Indexer] ${this.options.chainName} watcher failed to start:`, err.message);
      this.scheduleReconnect();
    }
  }

  /**
   * Recovers blocks missed during downtime or restarts.
   */
  private async recoverMissedBlocks(): Promise<void> {
    const { chainId, chainName, client, onRampAddresses, offRampAddresses, routerAddresses } = this.options;
    try {
      const currentBlock = await client.getBlockNumber();
      const lastProcessed = await CheckpointManager.getLastProcessedBlock(chainId);

      if (lastProcessed == null) {
        // First run: initialize checkpoint to current block - 2000 for a safe initial lookback
        const initialLookback = currentBlock > 2000n ? currentBlock - 2000n : 0n;
        console.log(`[Watcher] ${chainName}: Initializing checkpoint at block ${initialLookback} (latest: ${currentBlock})`);
        await this.scanRange(initialLookback, currentBlock);
        await CheckpointManager.saveLastProcessedBlock(chainId, chainName, currentBlock);
        return;
      }

      if (lastProcessed < currentBlock) {
        const gap = currentBlock - lastProcessed;
        console.log(`[Watcher] ${chainName}: Recovering ${gap} missed blocks from ${lastProcessed + 1n} to ${currentBlock}...`);
        await this.scanRange(lastProcessed + 1n, currentBlock);
        await CheckpointManager.saveLastProcessedBlock(chainId, chainName, currentBlock);
      }
    } catch (err: any) {
      console.error(`[Watcher] ${chainName}: Error recovering missed blocks:`, err.message);
    }
  }

  /**
   * Scans a specific block range in safe chunks.
   */
  public async scanRange(fromBlock: bigint, toBlock: bigint, chunkSize = 2000n): Promise<void> {
    const { chainName, client, onRampAddresses, offRampAddresses, routerAddresses } = this.options;

    for (let chunkStart = fromBlock; chunkStart <= toBlock; chunkStart += chunkSize) {
      const chunkEnd = chunkStart + chunkSize - 1n < toBlock ? chunkStart + chunkSize - 1n : toBlock;

      // 1. OnRamp CCIPMessageSent
      if (onRampAddresses && onRampAddresses.length > 0) {
        try {
          const logs = await client.getLogs({
            address: onRampAddresses,
            events: CCIPMessageSentAbi,
            fromBlock: chunkStart,
            toBlock: chunkEnd,
          });
          for (const log of logs) {
            await this.handleLog(log, 'OnRamp');
          }
        } catch (err: any) {
          console.error(`[Watcher] ${chainName} OnRamp scan error [${chunkStart}-${chunkEnd}]:`, err.message);
        }
      }

      // 2. OffRamp ExecutionStateChanged
      if (offRampAddresses && offRampAddresses.length > 0) {
        try {
          const logs = await client.getLogs({
            address: offRampAddresses,
            events: ExecutionStateChangedAbi,
            fromBlock: chunkStart,
            toBlock: chunkEnd,
          });
          for (const log of logs) {
            await this.handleLog(log, 'OffRamp');
          }
        } catch (err: any) {
          console.error(`[Watcher] ${chainName} OffRamp scan error [${chunkStart}-${chunkEnd}]:`, err.message);
        }
      }

      // 3. Router MessageExecuted
      if (routerAddresses && routerAddresses.length > 0) {
        try {
          const logs = await client.getLogs({
            address: routerAddresses,
            events: MessageExecutedAbi,
            fromBlock: chunkStart,
            toBlock: chunkEnd,
          });
          for (const log of logs) {
            await this.handleLog(log, 'Router');
          }
        } catch (err: any) {
          console.error(`[Watcher] ${chainName} Router scan error [${chunkStart}-${chunkEnd}]:`, err.message);
        }
      }
    }
  }

  /**
   * Sets up viem live polling watchers with robust error recovery.
   */
  private async setupWatchers(): Promise<void> {
    this.cleanUnwatchers();
    const { client, onRampAddresses, offRampAddresses, routerAddresses, chainName, pollingIntervalMs = 3000 } = this.options;

    const errorHandler = (err: Error) => {
      console.error(`[Watcher] ${chainName} watcher error:`, err.message);
      this.scheduleReconnect();
    };

    // OnRamp Watcher
    if (onRampAddresses && onRampAddresses.length > 0) {
      try {
        const unwatch = client.watchEvent({
          address: onRampAddresses,
          event: CCIPMessageSentAbi[0],
          poll: true,
          pollingInterval: pollingIntervalMs,
          onLogs: async logs => {
            this.lastActivityTimestamp = Date.now();
            for (const log of logs) {
              await this.handleLog(log, 'OnRamp');
            }
          },
          onError: errorHandler,
        });
        this.unwatchers.push(unwatch);
      } catch (err: any) {
        console.error(`[Watcher] ${chainName} failed to subscribe OnRamp:`, err.message);
        throw err;
      }
    }

    // OffRamp Watcher
    if (offRampAddresses && offRampAddresses.length > 0) {
      try {
        const unwatch = client.watchEvent({
          address: offRampAddresses,
          event: ExecutionStateChangedAbi[0],
          poll: true,
          pollingInterval: pollingIntervalMs,
          onLogs: async logs => {
            this.lastActivityTimestamp = Date.now();
            for (const log of logs) {
              await this.handleLog(log, 'OffRamp');
            }
          },
          onError: errorHandler,
        });
        this.unwatchers.push(unwatch);
      } catch (err: any) {
        console.error(`[Watcher] ${chainName} failed to subscribe OffRamp:`, err.message);
        throw err;
      }
    }

    // Router Watcher
    if (routerAddresses && routerAddresses.length > 0) {
      try {
        const unwatch = client.watchEvent({
          address: routerAddresses,
          event: MessageExecutedAbi[0],
          poll: true,
          pollingInterval: pollingIntervalMs,
          onLogs: async logs => {
            this.lastActivityTimestamp = Date.now();
            for (const log of logs) {
              await this.handleLog(log, 'Router');
            }
          },
          onError: errorHandler,
        });
        this.unwatchers.push(unwatch);
      } catch (err: any) {
        console.error(`[Watcher] ${chainName} failed to subscribe Router:`, err.message);
        throw err;
      }
    }
  }

  /**
   * Normalizes, deduplicates, and dispatches a log safely.
   */
  private async handleLog(log: Log | any, contractType: 'OnRamp' | 'OffRamp' | 'Router'): Promise<void> {
    const key = eventDeduplicationKey(log.transactionHash, log.logIndex);
    if (this.seenLogs.has(key)) return;
    this.seenLogs.add(key);

    // Keep seenLogs cache bounded
    if (this.seenLogs.size > 10000) {
      const firstEntries = Array.from(this.seenLogs).slice(0, 2000);
      for (const k of firstEntries) this.seenLogs.delete(k);
    }

    try {
      let norm: NormalizedCCIPEvent | null = null;
      let timestamp: number | null = null;

      try {
        const block = await this.options.client.getBlock({ blockNumber: log.blockNumber });
        timestamp = Number(block.timestamp);
      } catch (_err) {
        // Fallback to null timestamp if getBlock fails
      }

      if (contractType === 'OnRamp') {
        norm = normalizeMessageSent(this.options.chainName, log, timestamp);
      } else if (contractType === 'OffRamp') {
        norm = normalizeExecutionStateChanged(this.options.chainName, log, timestamp);
      } else if (contractType === 'Router') {
        norm = normalizeMessageExecuted(this.options.chainName, log, timestamp);
      }

      if (norm) {
        await this.options.onEvent(norm);
      }

      // Update checkpoint for this chain
      if (log.blockNumber) {
        await CheckpointManager.saveLastProcessedBlock(
          this.options.chainId,
          this.options.chainName,
          BigInt(log.blockNumber),
        );
      }
    } catch (err: any) {
      console.error(`[Watcher] ${this.options.chainName} error processing ${contractType} log (${log.transactionHash}):`, err.message);
    }
  }

  /**
   * Schedules reconnection with bounded exponential backoff.
   */
  private scheduleReconnect(): void {
    if (this.isDestroyed || this.status === 'RECONNECTING') return;
    this.status = 'RECONNECTING';
    this.cleanUnwatchers();

    this.reconnectAttempts++;
    // Exponential backoff: 1s, 2s, 4s, up to 10s max, with +/- 20% jitter
    const baseDelay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 10000);
    const jitter = baseDelay * (0.8 + Math.random() * 0.4);
    const delay = Math.round(jitter);

    console.log(`[Watcher] RPC disconnected for ${this.options.chainName}. Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`);

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(async () => {
      try {
        console.log(`[Watcher] Reconnecting ${this.options.chainName}...`);
        await this.start();
        console.log(`[Watcher] ${this.options.chainName} Watcher restored.`);
      } catch (err: any) {
        console.error(`[Watcher] Reconnect failed for ${this.options.chainName}:`, err.message);
        this.scheduleReconnect();
      }
    }, delay);
  }

  /**
   * Watchdog timer to ensure the connection has not silently stalled.
   */
  private startHeartbeat(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    const interval = this.options.heartbeatIntervalMs || 30000;

    this.heartbeatTimer = setInterval(async () => {
      if (this.isDestroyed || this.status !== 'ACTIVE') return;

      try {
        const latest = await this.options.client.getBlockNumber();
        const silentSeconds = Math.round((Date.now() - this.lastActivityTimestamp) / 1000);

        // Update checkpoint periodically even during quiet periods
        await CheckpointManager.saveLastProcessedBlock(
          this.options.chainId,
          this.options.chainName,
          latest,
        );

        // If inactive for > 90s, restart watchers to clear stale polling filters
        if (silentSeconds > 90) {
          console.log(`[Watcher] ${this.options.chainName}: Heartbeat detected quiet filter (${silentSeconds}s). Refreshing connection...`);
          this.scheduleReconnect();
        }
      } catch (err: any) {
        console.warn(`[Watcher] ${this.options.chainName}: Heartbeat RPC check failed: ${err.message}`);
        this.scheduleReconnect();
      }
    }, interval);
  }

  private cleanUnwatchers(): void {
    for (const unwatch of this.unwatchers) {
      try {
        unwatch();
      } catch (_err) {
        // Ignore unwatch errors during cleanup
      }
    }
    this.unwatchers = [];
  }

  public stop(): void {
    this.isDestroyed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.cleanUnwatchers();
    this.status = 'IDLE';
    console.log(`[Watcher] ${this.options.chainName} watcher stopped.`);
  }
}
