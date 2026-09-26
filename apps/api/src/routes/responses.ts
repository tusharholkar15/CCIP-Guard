import type { FastifyInstance } from 'fastify';
import { db } from '@bridgeguard/database';
import { responseProposals, auditLogs } from '@bridgeguard/database';
import { eq, desc, count } from 'drizzle-orm';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@bridgeguard/shared';
import { getOperatorInfo, requireOperatorRole } from '../middleware/auth.js';
import { publishEvent, CHANNELS } from '@bridgeguard/redis';

export async function responsesRoutes(app: FastifyInstance) {
  // List response proposals
  app.get<{
    Querystring: { page?: string; pageSize?: string; status?: string };
  }>('/', async (request) => {
    const page = Math.max(1, parseInt(request.query.page || '1', 10));
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(request.query.pageSize || String(DEFAULT_PAGE_SIZE), 10)));
    const offset = (page - 1) * pageSize;

    let query = db.select().from(responseProposals);
    let countQuery = db.select({ count: count() }).from(responseProposals);

    if (request.query.status) {
      query = query.where(eq(responseProposals.status, request.query.status as any)) as any;
      countQuery = countQuery.where(eq(responseProposals.status, request.query.status as any)) as any;
    }

    const data = await (query as any).orderBy(desc(responseProposals.createdAt)).limit(pageSize).offset(offset);
    const [totalResult] = await countQuery;

    return {
      data,
      total: totalResult.count,
      page,
      pageSize,
      totalPages: Math.ceil(totalResult.count / pageSize),
    };
  });

  // Get single response proposal
  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;
    const [proposal] = await db.select().from(responseProposals).where(eq(responseProposals.id, id));
    if (!proposal) {
      return reply.code(404).send({ error: 'Not Found', message: 'Response proposal not found', statusCode: 404 });
    }
    return proposal;
  });

  // Create response proposal
  app.post<{
    Body: { type: string; target: string; reason: string; incidentId?: string };
  }>(
    '/',
    { preHandler: [requireOperatorRole(['admin', 'operator'])] },
    async (request) => {
      const { type, target, reason, incidentId } = request.body;
      const operator = getOperatorInfo(request);

      const [proposal] = await db
        .insert(responseProposals)
        .values({
          type: type as any,
          target,
          reason,
          incidentId: incidentId || null,
          createdBy: operator.operatorName,
          operatorId: operator.operatorId,
          executionMode: 'DISABLED',
        })
        .returning();

      // Audit log
      await db.insert(auditLogs).values({
        action: 'RESPONSE_CREATED',
        resource: 'response_proposal',
        resourceId: proposal.id,
        operatorId: operator.operatorId,
        operatorName: operator.operatorName,
        details: { type, target, reason },
        status: 'SUCCESS',
      });

      await publishEvent(CHANNELS.RESPONSE_CREATED, proposal);
      return proposal;
    },
  );

  // Approve response proposal
  app.post<{ Params: { id: string } }>(
    '/:id/approve',
    { preHandler: [requireOperatorRole(['admin'])] },
    async (request, reply) => {
      const { id } = request.params;
      const operator = getOperatorInfo(request);

      const [existing] = await db.select().from(responseProposals).where(eq(responseProposals.id, id));
      if (!existing) {
        return reply.code(404).send({ error: 'Not Found', message: 'Response proposal not found', statusCode: 404 });
      }
      if (existing.status !== 'PENDING_APPROVAL') {
        return reply.code(400).send({ error: 'Bad Request', message: 'Proposal is not pending approval', statusCode: 400 });
      }

      // Since execution is disabled, set status to EXECUTION_DISABLED
      const newStatus = existing.executionMode === 'LIVE' ? 'APPROVED' : 'EXECUTION_DISABLED';

      const [updated] = await db
        .update(responseProposals)
        .set({
          status: newStatus as any,
          approvedBy: operator.operatorName,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(responseProposals.id, id))
        .returning();

      // Audit log
      await db.insert(auditLogs).values({
        action: 'RESPONSE_APPROVED',
        resource: 'response_proposal',
        resourceId: id,
        operatorId: operator.operatorId,
        operatorName: operator.operatorName,
        details: { executionMode: existing.executionMode, newStatus },
        status: 'SUCCESS',
      });

      await publishEvent(CHANNELS.RESPONSE_UPDATED, updated);
      return updated;
    },
  );

  // Reject response proposal
  app.post<{ Params: { id: string }; Body: { reason?: string } }>(
    '/:id/reject',
    { preHandler: [requireOperatorRole(['admin', 'operator'])] },
    async (request, reply) => {
      const { id } = request.params;
      const operator = getOperatorInfo(request);

      const [existing] = await db.select().from(responseProposals).where(eq(responseProposals.id, id));
      if (!existing) {
        return reply.code(404).send({ error: 'Not Found', message: 'Response proposal not found', statusCode: 404 });
      }
      if (existing.status !== 'PENDING_APPROVAL') {
        return reply.code(400).send({ error: 'Bad Request', message: 'Proposal is not pending approval', statusCode: 400 });
      }

      const [updated] = await db
        .update(responseProposals)
        .set({
          status: 'REJECTED' as any,
          rejectedAt: new Date(),
          rejectionReason: request.body.reason || null,
          updatedAt: new Date(),
        })
        .where(eq(responseProposals.id, id))
        .returning();

      // Audit log
      await db.insert(auditLogs).values({
        action: 'RESPONSE_REJECTED',
        resource: 'response_proposal',
        resourceId: id,
        operatorId: operator.operatorId,
        operatorName: operator.operatorName,
        details: { reason: request.body.reason },
        status: 'SUCCESS',
      });

      await publishEvent(CHANNELS.RESPONSE_UPDATED, updated);
      return updated;
    },
  );
}
