import { Queue, Worker, type Job } from 'bullmq';
import { createRedisConnection } from './client.js';

const connection = createRedisConnection();

export const QUEUE_NAMES = {
  METRICS: 'bridgeguard-metrics',
  ALERTS: 'bridgeguard-alerts',
  RESPONSES: 'bridgeguard-responses',
  INDEXER: 'bridgeguard-indexer',
} as const;

export function createQueue(name: string) {
  return new Queue(name, { connection: createRedisConnection() });
}

export function createWorker<T = unknown>(
  name: string,
  processor: (job: Job<T>) => Promise<void>,
) {
  return new Worker<T>(name, processor, {
    connection: createRedisConnection(),
    concurrency: 5,
  });
}

export const metricsQueue = createQueue(QUEUE_NAMES.METRICS);
export const alertsQueue = createQueue(QUEUE_NAMES.ALERTS);
export const responsesQueue = createQueue(QUEUE_NAMES.RESPONSES);
