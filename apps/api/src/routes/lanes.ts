import type { FastifyInstance } from 'fastify';
import { db } from '@bridgeguard/database';
import { lanes } from '@bridgeguard/database';
import { eq, sql } from 'drizzle-orm';
import { SUPPORTED_CHAINS } from '@bridgeguard/shared';

const VALID_CHAIN_IDS = new Set<number>(Object.values(SUPPORTED_CHAINS).map(c => c.chainId));

export async function lanesRoutes(app: FastifyInstance) {
  app.get('/', async () => {
    const laneList = await db.select().from(lanes).orderBy(lanes.createdAt);

    const aggStats = await db.execute(sql`
      SELECT 
        l.id as lane_id,
        COUNT(m.id)::int as message_count,
        COUNT(CASE WHEN m.state = 'FAILED' THEN 1 END)::int as failure_count,
        COUNT(CASE WHEN m.state IN ('SENT', 'COMMITTED', 'EXECUTION_STARTED') THEN 1 END)::int as backlog,
        MAX(COALESCE(m.destination_timestamp, m.source_timestamp, m.created_at)) as last_activity_at,
        PERCENTILE_DISC(0.50) WITHIN GROUP (ORDER BY m.latency_ms) as latency_p50,
        PERCENTILE_DISC(0.90) WITHIN GROUP (ORDER BY m.latency_ms) as latency_p90,
        PERCENTILE_DISC(0.95) WITHIN GROUP (ORDER BY m.latency_ms) as latency_p95,
        PERCENTILE_DISC(0.99) WITHIN GROUP (ORDER BY m.latency_ms) as latency_p99
      FROM lanes l
      LEFT JOIN messages m ON (
        m.source_chain_id = l.source_chain_id AND m.destination_chain_id = l.destination_chain_id
      )
      GROUP BY l.id
    `);

    const statsMap = new Map();
    for (const row of (aggStats as any)) {
      statsMap.set(row.lane_id, row);
    }

    const data = laneList.map(lane => {
      const stats = statsMap.get(lane.id);
      if (!stats) return lane;
      return {
        ...lane,
        messageCount: stats.message_count ?? lane.messageCount ?? 0,
        failureCount: stats.failure_count ?? lane.failureCount ?? 0,
        backlog: stats.backlog ?? lane.backlog ?? 0,
        lastActivityAt: stats.last_activity_at ? new Date(stats.last_activity_at).toISOString() : lane.lastActivityAt,
        latencyP50: stats.latency_p50 !== null && stats.latency_p50 !== undefined ? Number(stats.latency_p50) : (lane.latencyP50 ?? null),
        latencyP90: stats.latency_p90 !== null && stats.latency_p90 !== undefined ? Number(stats.latency_p90) : (lane.latencyP90 ?? null),
        latencyP95: stats.latency_p95 !== null && stats.latency_p95 !== undefined ? Number(stats.latency_p95) : (lane.latencyP95 ?? null),
        latencyP99: stats.latency_p99 !== null && stats.latency_p99 !== undefined ? Number(stats.latency_p99) : (lane.latencyP99 ?? null),
      };
    });

    const filtered = data.filter(
      lane => VALID_CHAIN_IDS.has(lane.sourceChainId) && VALID_CHAIN_IDS.has(lane.destinationChainId)
    );
    return { data: filtered };
  });

  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;
    const [lane] = await db.select().from(lanes).where(eq(lanes.id, id));
    if (!lane) {
      return reply.code(404).send({ error: 'Not Found', message: 'Lane not found', statusCode: 404 });
    }

    const aggStats = await db.execute(sql`
      SELECT 
        COUNT(m.id)::int as message_count,
        COUNT(CASE WHEN m.state = 'FAILED' THEN 1 END)::int as failure_count,
        COUNT(CASE WHEN m.state IN ('SENT', 'COMMITTED', 'EXECUTION_STARTED') THEN 1 END)::int as backlog,
        MAX(COALESCE(m.destination_timestamp, m.source_timestamp, m.created_at)) as last_activity_at,
        PERCENTILE_DISC(0.50) WITHIN GROUP (ORDER BY m.latency_ms) as latency_p50,
        PERCENTILE_DISC(0.90) WITHIN GROUP (ORDER BY m.latency_ms) as latency_p90,
        PERCENTILE_DISC(0.95) WITHIN GROUP (ORDER BY m.latency_ms) as latency_p95,
        PERCENTILE_DISC(0.99) WITHIN GROUP (ORDER BY m.latency_ms) as latency_p99
      FROM messages m
      WHERE m.source_chain_id = ${lane.sourceChainId} AND m.destination_chain_id = ${lane.destinationChainId}
    `);

    const stats = (aggStats as any)[0];
    if (stats) {
      return {
        ...lane,
        messageCount: stats.message_count ?? lane.messageCount ?? 0,
        failureCount: stats.failure_count ?? lane.failureCount ?? 0,
        backlog: stats.backlog ?? lane.backlog ?? 0,
        lastActivityAt: stats.last_activity_at ? new Date(stats.last_activity_at).toISOString() : lane.lastActivityAt,
        latencyP50: stats.latency_p50 !== null && stats.latency_p50 !== undefined ? Number(stats.latency_p50) : (lane.latencyP50 ?? null),
        latencyP90: stats.latency_p90 !== null && stats.latency_p90 !== undefined ? Number(stats.latency_p90) : (lane.latencyP90 ?? null),
        latencyP95: stats.latency_p95 !== null && stats.latency_p95 !== undefined ? Number(stats.latency_p95) : (lane.latencyP95 ?? null),
        latencyP99: stats.latency_p99 !== null && stats.latency_p99 !== undefined ? Number(stats.latency_p99) : (lane.latencyP99 ?? null),
      };
    }

    return lane;
  });
}
