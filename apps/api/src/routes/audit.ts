import type { FastifyInstance } from 'fastify';
import { db } from '@bridgeguard/database';
import { auditLogs } from '@bridgeguard/database';
import { desc, count, like, or } from 'drizzle-orm';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@bridgeguard/shared';

export async function auditRoutes(app: FastifyInstance) {
  app.get<{
    Querystring: { page?: string; pageSize?: string; search?: string };
  }>('/', async (request) => {
    const page = Math.max(1, parseInt(request.query.page || '1', 10));
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(request.query.pageSize || String(DEFAULT_PAGE_SIZE), 10)));
    const offset = (page - 1) * pageSize;

    let query = db.select().from(auditLogs);
    let countQuery = db.select({ count: count() }).from(auditLogs);

    if (request.query.search) {
      const search = `%${request.query.search}%`;
      const condition = or(
        like(auditLogs.action, search),
        like(auditLogs.resource, search),
        like(auditLogs.operatorName, search),
      )!;
      query = query.where(condition) as any;
      countQuery = countQuery.where(condition) as any;
    }

    const data = await (query as any).orderBy(desc(auditLogs.timestamp)).limit(pageSize).offset(offset);
    const [totalResult] = await countQuery;

    return {
      data,
      total: totalResult.count,
      page,
      pageSize,
      totalPages: Math.ceil(totalResult.count / pageSize),
    };
  });
}
