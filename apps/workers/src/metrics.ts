import { db } from '@bridgeguard/database';
import { messages, lanes, metricSnapshots, chains } from '@bridgeguard/database';
import { METRIC_WINDOWS, INCIDENT_THRESHOLDS } from '@bridgeguard/shared';
import { publishEvent, CHANNELS, createRedisConnection } from '@bridgeguard/redis';
import { createWorker, QUEUE_NAMES, metricsQueue } from '@bridgeguard/redis';
import { eq, and, gte, sql, count } from 'drizzle-orm';

const WINDOW_DURATIONS: Record<string, number> = {
  '1m': 60 * 1000,
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
};

function percentile(sortedValues: number[], p: number): number | null {
  if (sortedValues.length === 0) return null;
  const index = Math.ceil((p / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, index)];
}

async function computeMetrics() {
  console.log('[Metrics Worker] Computing metrics...');

  const allLanes = await db.select().from(lanes);

  for (const lane of allLanes) {
    for (const window of METRIC_WINDOWS) {
      const since = new Date(Date.now() - WINDOW_DURATIONS[window]);

      // Get messages in this window for this lane
      const windowMessages = await db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.laneId, lane.id),
            gte(messages.createdAt, since),
          ),
        );

      const messageCount = windowMessages.length;
      const successCount = windowMessages.filter(m => m.state === 'SUCCESS').length;
      const failureCount = windowMessages.filter(m => m.state === 'FAILED').length;
      const backlog = windowMessages.filter(m => !['SUCCESS', 'FAILED'].includes(m.state)).length;

      // Calculate latency percentiles
      const latencies = windowMessages
        .filter(m => m.latencyMs !== null)
        .map(m => m.latencyMs!)
        .sort((a, b) => a - b);

      const snapshot = {
        laneId: lane.id,
        window: window as any,
        messageCount,
        successCount,
        failureCount,
        latencyP50: percentile(latencies, 50),
        latencyP90: percentile(latencies, 90),
        latencyP95: percentile(latencies, 95),
        latencyP99: percentile(latencies, 99),
        backlog,
      };

      await db.insert(metricSnapshots).values(snapshot);

      // Update lane aggregate metrics for the 5m window
      if (window === '5m') {
        const [cum] = await db
          .select({
            count: count(),
            failures: sql<number>`count(case when ${messages.state} = 'FAILED' then 1 end)`,
            lastActivity: sql<Date | null>`max(coalesce(${messages.destinationTimestamp}, ${messages.sourceTimestamp}, ${messages.createdAt}))`,
            allP50: sql<number | null>`PERCENTILE_DISC(0.50) WITHIN GROUP (ORDER BY ${messages.latencyMs})`,
            allP90: sql<number | null>`PERCENTILE_DISC(0.90) WITHIN GROUP (ORDER BY ${messages.latencyMs})`,
            allP95: sql<number | null>`PERCENTILE_DISC(0.95) WITHIN GROUP (ORDER BY ${messages.latencyMs})`,
            allP99: sql<number | null>`PERCENTILE_DISC(0.99) WITHIN GROUP (ORDER BY ${messages.latencyMs})`,
          })
          .from(messages)
          .where(
            sql`(${messages.sourceChainId} = ${lane.sourceChainId} AND ${messages.destinationChainId} = ${lane.destinationChainId})`
          );

        await db
          .update(lanes)
          .set({
            messageCount: cum?.count ?? 0,
            failureCount: cum?.failures ?? 0,
            latencyP50: snapshot.latencyP50 ?? (cum?.allP50 != null ? Number(cum.allP50) : null),
            latencyP90: snapshot.latencyP90 ?? (cum?.allP90 != null ? Number(cum.allP90) : null),
            latencyP95: snapshot.latencyP95 ?? (cum?.allP95 != null ? Number(cum.allP95) : null),
            latencyP99: snapshot.latencyP99 ?? (cum?.allP99 != null ? Number(cum.allP99) : null),
            backlog: snapshot.backlog,
            lastActivityAt: cum?.lastActivity ? new Date(cum.lastActivity) : lane.lastActivityAt,
            updatedAt: new Date(),
          })
          .where(eq(lanes.id, lane.id));
      }
    }
  }

  // Update chain telemetry
  const allChains = await db.select().from(chains);
  for (const c of allChains) {
    const [cStats] = await db
      .select({
        totalCount: count(),
        failCount: sql<number>`count(case when ${messages.state} = 'FAILED' then 1 end)`,
        lastActivity: sql<Date | null>`max(coalesce(${messages.destinationTimestamp}, ${messages.sourceTimestamp}, ${messages.createdAt}))`,
      })
      .from(messages)
      .where(
        sql`(${messages.sourceChainId} = ${c.chainId} OR ${messages.destinationChainId} = ${c.chainId})`
      );

    await db
      .update(chains)
      .set({
        messagesCount: cStats?.totalCount ?? 0,
        failuresCount: cStats?.failCount ?? 0,
        lastActivityAt: cStats?.lastActivity ? new Date(cStats.lastActivity) : c.lastActivityAt,
        updatedAt: new Date(),
      })
      .where(eq(chains.id, c.id));
  }

  await publishEvent(CHANNELS.METRICS_UPDATED, {
    timestamp: new Date().toISOString(),
  });

  console.log('[Metrics Worker] Metrics computed.');
}

// Schedule recurring metrics computation
async function main() {
  console.log('[Metrics Worker] Starting...');

  // Add recurring job
  await metricsQueue.add(
    'compute-metrics',
    {},
    {
      repeat: { every: 60000 }, // Every minute
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  );

  // Process jobs
  const worker = createWorker(QUEUE_NAMES.METRICS, async () => {
    await computeMetrics();
  });

  worker.on('completed', (job) => {
    console.log(`[Metrics Worker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Metrics Worker] Job ${job?.id} failed:`, err);
  });

  console.log('[Metrics Worker] Running.');
}

main().catch((err) => {
  console.error('[Metrics Worker] Fatal error:', err);
  process.exit(1);
});

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
