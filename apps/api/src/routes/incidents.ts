import type { FastifyInstance } from 'fastify';
import { db } from '@bridgeguard/database';
import { incidents, auditLogs } from '@bridgeguard/database';
import { eq, desc, count } from 'drizzle-orm';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@bridgeguard/shared';
import { getOperatorInfo, requireOperatorRole } from '../middleware/auth.js';
import { publishEvent, CHANNELS } from '@bridgeguard/redis';

export async function incidentsRoutes(app: FastifyInstance) {
  app.get<{
    Querystring: { page?: string; pageSize?: string; status?: string; type?: string };
  }>('/', async (request) => {
    const page = Math.max(1, parseInt(request.query.page || '1', 10));
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(request.query.pageSize || String(DEFAULT_PAGE_SIZE), 10)));
    const offset = (page - 1) * pageSize;

    let query = db.select().from(incidents);
    let countQuery = db.select({ count: count() }).from(incidents);

    if (request.query.status) {
      query = query.where(eq(incidents.status, request.query.status as any)) as any;
      countQuery = countQuery.where(eq(incidents.status, request.query.status as any)) as any;
    }
    if (request.query.type) {
      query = query.where(eq(incidents.type, request.query.type as any)) as any;
      countQuery = countQuery.where(eq(incidents.type, request.query.type as any)) as any;
    }

    const data = await (query as any).orderBy(desc(incidents.detectedAt)).limit(pageSize).offset(offset);
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
    const [incident] = await db.select().from(incidents).where(eq(incidents.id, id));
    if (!incident) {
      return reply.code(404).send({ error: 'Not Found', message: 'Incident not found', statusCode: 404 });
    }
    return incident;
  });

  // Update incident status
  app.patch<{ Params: { id: string }; Body: { status: string } }>(
    '/:id',
    { preHandler: [requireOperatorRole(['admin', 'operator'])] },
    async (request, reply) => {
      const { id } = request.params;
      const { status } = request.body;
      const operator = getOperatorInfo(request);

      const [updated] = await db
        .update(incidents)
        .set({
          status: status as any,
          updatedAt: new Date(),
          ...(status === 'RESOLVED' ? { resolvedAt: new Date() } : {}),
        })
        .where(eq(incidents.id, id))
        .returning();

      if (!updated) {
        return reply.code(404).send({ error: 'Not Found', message: 'Incident not found', statusCode: 404 });
      }

      // Audit log
      await db.insert(auditLogs).values({
        action: 'INCIDENT_STATUS_CHANGED',
        resource: 'incident',
        resourceId: id,
        operatorId: operator.operatorId,
        operatorName: operator.operatorName,
        details: { newStatus: status, title: updated.title },
        status: 'SUCCESS',
      });

      await publishEvent(CHANNELS.INCIDENT_UPDATED, updated);
      return updated;
    },
  );
}
