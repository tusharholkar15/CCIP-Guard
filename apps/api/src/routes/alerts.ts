import type { FastifyInstance } from 'fastify';
import { db } from '@bridgeguard/database';
import { alerts, auditLogs } from '@bridgeguard/database';
import { eq, desc, count } from 'drizzle-orm';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@bridgeguard/shared';
import { getOperatorInfo, requireOperatorRole } from '../middleware/auth.js';
import { publishEvent, CHANNELS } from '@bridgeguard/redis';

export async function alertsRoutes(app: FastifyInstance) {
  app.get<{
    Querystring: { page?: string; pageSize?: string; status?: string };
  }>('/', async (request) => {
    const page = Math.max(1, parseInt(request.query.page || '1', 10));
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(request.query.pageSize || String(DEFAULT_PAGE_SIZE), 10)));
    const offset = (page - 1) * pageSize;

    let query = db.select().from(alerts);
    let countQuery = db.select({ count: count() }).from(alerts);

    if (request.query.status) {
      query = query.where(eq(alerts.status, request.query.status as any)) as any;
      countQuery = countQuery.where(eq(alerts.status, request.query.status as any)) as any;
    }

    const data = await (query as any).orderBy(desc(alerts.createdAt)).limit(pageSize).offset(offset);
    const [totalResult] = await countQuery;

    return {
      data,
      total: totalResult.count,
      page,
      pageSize,
      totalPages: Math.ceil(totalResult.count / pageSize),
    };
  });

  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;
    const [alert] = await db.select().from(alerts).where(eq(alerts.id, id));
    if (!alert) {
      return reply.code(404).send({ error: 'Not Found', message: 'Alert not found', statusCode: 404 });
    }
    return alert;
  });

  // Acknowledge alert
  app.patch<{ Params: { id: string }; Body: { status: string } }>(
    '/:id',
    { preHandler: [requireOperatorRole(['admin', 'operator'])] },
    async (request, reply) => {
      const { id } = request.params;
      const { status } = request.body;
      const operator = getOperatorInfo(request);

      const [updated] = await db
        .update(alerts)
        .set({ status: status as any, updatedAt: new Date() })
        .where(eq(alerts.id, id))
        .returning();

      if (!updated) {
        return reply.code(404).send({ error: 'Not Found', message: 'Alert not found', statusCode: 404 });
      }

      // Audit log
      await db.insert(auditLogs).values({
        action: status === 'ACKNOWLEDGED' ? 'ALERT_ACKNOWLEDGED' : status === 'RESOLVED' ? 'ALERT_RESOLVED' : 'ALERT_STATUS_CHANGED',
        resource: 'alert',
        resourceId: id,
        operatorId: operator.operatorId,
        operatorName: operator.operatorName,
        details: { newStatus: status, type: updated.type, resource: updated.resource },
        status: 'SUCCESS',
      });

      await publishEvent(CHANNELS.ALERT_UPDATED, updated);
      return updated;
    },
  );
}
