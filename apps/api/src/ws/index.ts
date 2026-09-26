import type { FastifyInstance } from 'fastify';
import { subscribeToAll } from '@bridgeguard/redis';
import { activeWebSockets } from '../routes/metrics.js';
import type { WebSocket } from 'ws';

const clients = new Set<WebSocket>();

export async function registerWebSocket(app: FastifyInstance) {
  app.get('/ws', { websocket: true }, (socket, request) => {
    clients.add(socket);
    activeWebSockets.inc();
    request.log.info(`WebSocket connected. Total: ${clients.size}`);

    socket.on('close', () => {
      clients.delete(socket);
      activeWebSockets.dec();
      request.log.info(`WebSocket disconnected. Total: ${clients.size}`);
    });

    socket.on('error', (err: Error) => {
      request.log.error(err, 'WebSocket error');
      clients.delete(socket);
      activeWebSockets.dec();
    });

    // Send initial connection message
    socket.send(JSON.stringify({
      type: 'connection',
      data: { status: 'connected', timestamp: new Date().toISOString() },
    }));
  });

  // Subscribe to all Redis channels and broadcast to WebSocket clients
  await subscribeToAll((channel, data) => {
    const message = JSON.stringify({
      type: channelToEventType(channel),
      data,
      timestamp: new Date().toISOString(),
    });

    for (const client of clients) {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
      }
    }
  });
}

function channelToEventType(channel: string): string {
  const mapping: Record<string, string> = {
    'bridgeguard:message:created': 'message:update',
    'bridgeguard:message:updated': 'message:update',
    'bridgeguard:incident:created': 'incident:update',
    'bridgeguard:incident:updated': 'incident:update',
    'bridgeguard:alert:created': 'alert:update',
    'bridgeguard:alert:updated': 'alert:update',
    'bridgeguard:response:created': 'response:update',
    'bridgeguard:response:updated': 'response:update',
    'bridgeguard:network:status': 'network:status',
    'bridgeguard:metrics:updated': 'metrics:update',
  };
  return mapping[channel] || 'unknown';
}
