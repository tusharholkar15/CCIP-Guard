import type { FastifyInstance } from 'fastify';
import { db } from '@bridgeguard/database';
import { chains } from '@bridgeguard/database';
import { eq, sql } from 'drizzle-orm';
import { SUPPORTED_CHAINS } from '@bridgeguard/shared';

const VALID_CHAIN_IDS = new Set<number>(Object.values(SUPPORTED_CHAINS).map(c => c.chainId));

export async function chainsRoutes(app: FastifyInstance) {
  // GET /api/chains
  app.get('/', async () => {
    const chainList = await db.select().from(chains).orderBy(chains.chainId);

    const aggStats = await db.execute(sql`
      SELECT 
        c.id as chain_table_id,
        c.chain_id,
        COUNT(m.id)::int as messages_count,
        COUNT(CASE WHEN m.state = 'FAILED' THEN 1 END)::int as failures_count,
        MAX(COALESCE(m.destination_timestamp, m.source_timestamp, m.created_at)) as last_activity_at
      FROM chains c
      LEFT JOIN messages m ON (m.source_chain_id = c.chain_id OR m.destination_chain_id = c.chain_id)
      GROUP BY c.id, c.chain_id
    `);

    const statsMap = new Map();
    for (const row of (aggStats as any)) {
      statsMap.set(row.chain_table_id, row);
    }

    const data = chainList.map(chain => {
      const stats = statsMap.get(chain.id);
      if (!stats) return chain;
      return {
        ...chain,
        messagesCount: stats.messages_count ?? chain.messagesCount ?? 0,
        failuresCount: stats.failures_count ?? chain.failuresCount ?? 0,
        lastActivityAt: stats.last_activity_at ? new Date(stats.last_activity_at).toISOString() : chain.lastActivityAt,
      };
    });

    const filtered = data.filter(chain => VALID_CHAIN_IDS.has(chain.chainId));
    return { data: filtered };
  });

  // GET /api/chains/:id
  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;
    const [chain] = await db.select().from(chains).where(eq(chains.id, id));
    if (!chain) {
      return reply.code(404).send({ error: 'Not Found', message: 'Chain not found', statusCode: 404 });
    }

    const aggStats = await db.execute(sql`
      SELECT 
        COUNT(m.id)::int as messages_count,
        COUNT(CASE WHEN m.state = 'FAILED' THEN 1 END)::int as failures_count,
        MAX(COALESCE(m.destination_timestamp, m.source_timestamp, m.created_at)) as last_activity_at
      FROM messages m
      WHERE m.source_chain_id = ${chain.chainId} OR m.destination_chain_id = ${chain.chainId}
    `);

    const stats = (aggStats as any)[0];
    if (stats) {
      return {
        ...chain,
        messagesCount: stats.messages_count ?? chain.messagesCount ?? 0,
        failuresCount: stats.failures_count ?? chain.failuresCount ?? 0,
        lastActivityAt: stats.last_activity_at ? new Date(stats.last_activity_at).toISOString() : chain.lastActivityAt,
      };
    }

    return chain;
  });
}
