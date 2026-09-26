import { db } from '@bridgeguard/database';
import { chains, lanes, messages, incidents, alerts, auditLogs } from '@bridgeguard/database';
import crypto from 'crypto';
const uuid = crypto.randomUUID;

async function seed() {
  console.log('Seeding test data...');
  const chain1 = uuid();
  const chain2 = uuid();
  const lane1 = uuid();
  
  await db.insert(chains).values([
    { id: chain1, chainId: 1, name: 'ethereum', displayName: 'Ethereum', status: 'HEALTHY' },
    { id: chain2, chainId: 42161, name: 'arbitrum', displayName: 'Arbitrum', status: 'HEALTHY' }
  ]);
  
  await db.insert(lanes).values([
    { id: lane1, sourceChainId: 1, destinationChainId: 42161, sourceChainName: 'Ethereum', destinationChainName: 'Arbitrum', status: 'ACTIVE', messageCount: 0, failureCount: 0, backlog: 0 }
  ]);
  
  const msgId = uuid();
  await db.insert(messages).values([
    { id: msgId, ccipMessageId: '0x' + Buffer.from(msgId).toString('hex').slice(0, 64), sourceChainId: 1, destinationChainId: 42161, sourceChainName: 'Ethereum', destinationChainName: 'Arbitrum', sender: '0x123', receiver: '0x456', state: 'DELIVERED', laneId: lane1, latencyMs: 2500 }
  ]);
  
  const incId = uuid();
  await db.insert(incidents).values([
    { id: incId, type: 'HIGH_LATENCY', severity: 'HIGH', status: 'INVESTIGATING', title: 'High Latency', description: 'Latency > 2s', laneId: lane1, detectedAt: new Date(), detectionReason: 'Manual trigger', relatedMessageIds: [msgId] }
  ]);

  await db.insert(alerts).values([
    { id: uuid(), type: 'LATENCY_SPIKE', resource: lane1, threshold: 2000, observedValue: 2500, status: 'ACTIVE', message: 'Spike', incidentId: incId }
  ]);
  
  await db.insert(auditLogs).values([
    { id: uuid(), action: 'INCIDENT_DETECTED', resource: 'Incident', resourceId: incId, operatorId: 'system', operatorName: 'System', status: 'SUCCESS' }
  ]);

  console.log('Done!');
  process.exit(0);
}

seed().catch(console.error);
