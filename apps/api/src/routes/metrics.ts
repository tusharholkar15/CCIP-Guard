import type { FastifyInstance } from 'fastify';
import { Registry, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

const register = new Registry();
collectDefaultMetrics({ register });

export const httpRequestsTotal = new Counter({
  name: 'bridgeguard_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: 'bridgeguard_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route'],
  registers: [register],
});

export const activeWebSockets = new Gauge({
  name: 'bridgeguard_active_websocket_connections',
  help: 'Number of active WebSocket connections',
  registers: [register],
});

export const messagesIndexed = new Counter({
  name: 'bridgeguard_messages_indexed_total',
  help: 'Total number of CCIP messages indexed',
  registers: [register],
});

export async function metricsRoute(app: FastifyInstance) {
  app.get('/metrics', async (request, reply) => {
    reply.header('Content-Type', register.contentType);
    return register.metrics();
  });

  // Track request metrics
  app.addHook('onResponse', (request, reply) => {
    httpRequestsTotal.inc({
      method: request.method,
      route: request.routeOptions?.url || request.url,
      status: reply.statusCode.toString(),
    });
  });
}
