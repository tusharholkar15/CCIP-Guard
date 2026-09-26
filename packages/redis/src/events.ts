import { redis, subscriber } from './client.js';

export const CHANNELS = {
  MESSAGE_CREATED: 'bridgeguard:message:created',
  MESSAGE_UPDATED: 'bridgeguard:message:updated',
  INCIDENT_CREATED: 'bridgeguard:incident:created',
  INCIDENT_UPDATED: 'bridgeguard:incident:updated',
  ALERT_CREATED: 'bridgeguard:alert:created',
  ALERT_UPDATED: 'bridgeguard:alert:updated',
  RESPONSE_CREATED: 'bridgeguard:response:created',
  RESPONSE_UPDATED: 'bridgeguard:response:updated',
  NETWORK_STATUS: 'bridgeguard:network:status',
  METRICS_UPDATED: 'bridgeguard:metrics:updated',
} as const;

export type Channel = typeof CHANNELS[keyof typeof CHANNELS];

export async function publishEvent(channel: Channel, data: unknown): Promise<void> {
  await redis.publish(channel, JSON.stringify(data));
}

export async function subscribeToChannel(
  channel: Channel,
  handler: (data: unknown) => void,
): Promise<void> {
  await subscriber.subscribe(channel);
  subscriber.on('message', (ch, message) => {
    if (ch === channel) {
      try {
        handler(JSON.parse(message));
      } catch (err) {
        console.error(`Error processing message on ${channel}:`, err);
      }
    }
  });
}

export async function subscribeToAll(
  handler: (channel: string, data: unknown) => void,
): Promise<void> {
  const channels = Object.values(CHANNELS);
  await subscriber.subscribe(...channels);
  subscriber.on('message', (ch, message) => {
    try {
      handler(ch, JSON.parse(message));
    } catch (err) {
      console.error(`Error processing message on ${ch}:`, err);
    }
  });
}
