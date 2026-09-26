import type { FastifyInstance } from 'fastify';
import { db } from '@bridgeguard/database';
import { chains, messages, incidents, alerts, lanes } from '@bridgeguard/database';
import { eq, sql, count, inArray } from 'drizzle-orm';
import { SUPPORTED_CHAINS } from '@bridgeguard/shared';

const VALID_CHAIN_IDS = Object.values(SUPPORTED_CHAINS).map(c => c.chainId);

export async function dashboardRoutes(app: FastifyInstance) {
  app.get('/stats', async (request, reply) => {
    try {
      const [networkCount] = await db
        .select({ count: count() })
        .from(chains)
        .where(inArray(chains.chainId, VALID_CHAIN_IDS));
      const [messageCount] = await db.select({ count: count() }).from(messages);
      const [deliveredCount] = await db
        .select({ count: count() })
        .from(messages)
        .where(eq(messages.state, 'SUCCESS'));
      const [failedCount] = await db
        .select({ count: count() })
        .from(messages)
        .where(eq(messages.state, 'FAILED'));
      const [activeIncidentCount] = await db
        .select({ count: count() })
        .from(incidents)
        .where(eq(incidents.status, 'OPEN'));
      const [activeAlertCount] = await db
        .select({ count: count() })
        .from(alerts)
        .where(eq(alerts.status, 'ACTIVE'));
      const [avgLatency] = await db
        .select({ avg: sql<number>`avg(${messages.latencyMs})` })
        .from(messages)
        .where(sql`${messages.latencyMs} IS NOT NULL`);

      const total = messageCount.count;
      const delivered = deliveredCount.count;
      const failed = failedCount.count;
      const successRate = total > 0 ? (total - failed) / total : null;

      return {
        networks: networkCount.count,
        messages: total,
        successRate,
        activeIncidents: activeIncidentCount.count,
        activeAlerts: activeAlertCount.count,
        averageLatency: avgLatency.avg,
      };
    } catch (err) {
      request.log.error(err, 'Failed to fetch dashboard stats');
      reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to fetch dashboard stats', statusCode: 500 });
    }
  });
}
