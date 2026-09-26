import { db, indexerCheckpoints } from '@bridgeguard/database';
import { redis } from '@bridgeguard/redis';
import { eq } from 'drizzle-orm';

/**
 * Checkpoint Manager
 * Tracks last safely processed block height per chain across restarts and RPC disruptions.
 * Uses PostgreSQL for persistent storage and Redis for low-latency in-memory caching.
 */
export class CheckpointManager {
  private static redisKey(chainId: number): string {
    return `indexer:checkpoint:${chainId}`;
  }

  /**
   * Retrieves the last processed block for a given chain.
   * Returns null if no checkpoint has been stored yet.
   */
  static async getLastProcessedBlock(chainId: number): Promise<bigint | null> {
    // 1. Try Redis cache first
    try {
      const cached = await redis.get(this.redisKey(chainId));
      if (cached && /^\d+$/.test(cached)) {
        return BigInt(cached);
      }
    } catch (err) {
      // Redis error should not block DB lookup
    }

    // 2. Fall back to PostgreSQL
    try {
      const rows = await db
        .select()
        .from(indexerCheckpoints)
        .where(eq(indexerCheckpoints.chainId, chainId))
        .limit(1);

      if (rows.length > 0 && rows[0].lastProcessedBlock != null) {
        const block = BigInt(rows[0].lastProcessedBlock);
        // Populate Redis cache asynchronously
        try {
          await redis.set(this.redisKey(chainId), block.toString());
        } catch (_err) {
          // Redis cache error is non-fatal
        }
        return block;
      }
    } catch (err) {
      console.error(`[Checkpoint] Failed to read checkpoint for chain ${chainId} from DB:`, (err as Error).message);
    }

    return null;
  }

  /**
   * Saves the last processed block for a given chain idempotently.
   * Ensures monotonic progression (never decreases checkpoint block).
   */
  static async saveLastProcessedBlock(
    chainId: number,
    chainName: string,
    blockNumber: bigint,
  ): Promise<void> {
    // 1. Update Redis cache
    try {
      await redis.set(this.redisKey(chainId), blockNumber.toString());
    } catch (_err) {
      // Redis cache error is non-fatal
    }

    // 2. Upsert in PostgreSQL
    try {
      await db
        .insert(indexerCheckpoints)
        .values({
          chainId,
          chainName,
          lastProcessedBlock: blockNumber,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: indexerCheckpoints.chainId,
          set: {
            lastProcessedBlock: blockNumber,
            updatedAt: new Date(),
          },
        });
    } catch (err) {
      console.error(`[Checkpoint] Failed to save checkpoint for chain ${chainId} (${chainName}) at block ${blockNumber}:`, (err as Error).message);
    }
  }
}
