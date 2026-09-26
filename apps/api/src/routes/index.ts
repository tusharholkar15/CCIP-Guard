import type { FastifyInstance } from 'fastify';
import { chainsRoutes } from './chains.js';
import { lanesRoutes } from './lanes.js';
import { messagesRoutes } from './messages.js';
import { incidentsRoutes } from './incidents.js';
import { alertsRoutes } from './alerts.js';
import { responsesRoutes } from './responses.js';
import { auditRoutes } from './audit.js';
import { dashboardRoutes } from './dashboard.js';
import { simulationRoutes } from './simulation.js';
import { apiKeyAuth } from '../middleware/auth.js';

export async function registerRoutes(app: FastifyInstance) {
  // Apply API key auth to all /api routes
  app.addHook('onRequest', apiKeyAuth);

  app.register(dashboardRoutes, { prefix: '/api/dashboard' });
  app.register(chainsRoutes, { prefix: '/api/chains' });
  app.register(lanesRoutes, { prefix: '/api/lanes' });
  app.register(messagesRoutes, { prefix: '/api/messages' });
  app.register(incidentsRoutes, { prefix: '/api/incidents' });
  app.register(alertsRoutes, { prefix: '/api/alerts' });
  app.register(responsesRoutes, { prefix: '/api/responses' });
  app.register(auditRoutes, { prefix: '/api/audit' });
  app.register(simulationRoutes, { prefix: '/api/simulation' });
}
