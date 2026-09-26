import type { FastifyInstance } from 'fastify';
import { db } from '@bridgeguard/database';
import { messages } from '@bridgeguard/database';
import { eq, desc, asc, like, sql, count, or, inArray } from 'drizzle-orm';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, SUPPORTED_CHAINS } from '@bridgeguard/shared';

const VALID_CHAIN_IDS = Object.values(SUPPORTED_CHAINS).map(c => c.chainId);

export async function messagesRoutes(app: FastifyInstance) {
  app.get<{
    Querystring: {
      page?: string;
      pageSize?: string;
      search?: string;
      state?: string;
      sourceChainId?: string;
      destinationChainId?: string;
      sortBy?: string;
      sortOrder?: string;
    };
  }>('/', async (request) => {
    const page = Math.max(1, parseInt(request.query.page || '1', 10));
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(request.query.pageSize || String(DEFAULT_PAGE_SIZE), 10)),
    );
    const offset = (page - 1) * pageSize;

    let query = db.select().from(messages);
    let countQuery = db.select({ count: count() }).from(messages);

    const conditions = [
      inArray(messages.sourceChainId, VALID_CHAIN_IDS),
      inArray(messages.destinationChainId, VALID_CHAIN_IDS),
    ];
    if (request.query.state) {
      conditions.push(eq(messages.state, request.query.state as any));
    }
    if (request.query.sourceChainId) {
      conditions.push(eq(messages.sourceChainId, parseInt(request.query.sourceChainId, 10)));
    }
    if (request.query.destinationChainId) {
      conditions.push(eq(messages.destinationChainId, parseInt(request.query.destinationChainId, 10)));
    }
    if (request.query.search) {
      const search = `%${request.query.search}%`;
      conditions.push(
        or(
          like(messages.ccipMessageId, search),
          like(messages.sourceTxHash, search),
          like(messages.destinationTxHash, search),
          like(messages.sender, search),
          like(messages.receiver, search),
        )!,
      );
    }

    if (conditions.length > 0) {
      const where = sql.join(conditions.map(c => sql`(${c})`), sql` AND `);
      query = query.where(where) as any;
      countQuery = countQuery.where(where) as any;
    }

    // Sort
    const sortBy = request.query.sortBy || 'createdAt';
    const sortOrder = request.query.sortOrder === 'asc' ? asc : desc;
    const sortColumn = (messages as any)[sortBy] || messages.createdAt;
    query = query.orderBy(sortOrder(sortColumn)) as any;

    // Paginate
    const data = await (query as any).limit(pageSize).offset(offset);
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
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const condition = isUuid
      ? or(eq(messages.id, id), eq(messages.ccipMessageId, id))
      : eq(messages.ccipMessageId, id);
    const [message] = await db
      .select()
      .from(messages)
      .where(condition!);
    if (!message) {
      return reply.code(404).send({ error: 'Not Found', message: 'Message not found', statusCode: 404 });
    }
    return message;
  });
}
