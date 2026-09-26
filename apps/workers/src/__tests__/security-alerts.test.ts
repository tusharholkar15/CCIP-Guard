import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createSuspiciousActivityIncidentAndAlert,
  evaluateMessageSecurityRisk,
} from '../alerts';
import { db, incidents, alerts, auditLogs, messages, lanes } from '@bridgeguard/database';
import { publishEvent, CHANNELS } from '@bridgeguard/redis';
import {
  type CorrelatedRiskResult,
  SecuritySignalType,
} from '@bridgeguard/shared';

vi.mock('@bridgeguard/database', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    transaction: vi.fn(),
  },
  incidents: {
    id: 'id',
    type: 'type',
    laneId: 'laneId',
    status: 'status',
  },
  alerts: {
    id: 'id',
    type: 'type',
    resource: 'resource',
    status: 'status',
  },
  auditLogs: {
    id: 'id',
  },
  messages: {
    id: 'id',
    ccipMessageId: 'ccipMessageId',
    laneId: 'laneId',
    sender: 'sender',
    createdAt: 'createdAt',
  },
  lanes: {
    id: 'id',
  },
  metricSnapshots: {},
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...args) => ({ and: args })),
  desc: vi.fn((col) => ({ desc: col })),
  gte: vi.fn((col, val) => ({ gte: col, val })),
  sql: Object.assign(vi.fn((strings, ...values) => ({ sql: strings, values })), {
    join: vi.fn(),
  }),
}));

vi.mock('@bridgeguard/redis', () => ({
  publishEvent: vi.fn().mockResolvedValue(undefined),
  subscribeToChannel: vi.fn().mockResolvedValue(undefined),
  createWorker: vi.fn(() => ({ on: vi.fn() })),
  alertsQueue: { add: vi.fn().mockResolvedValue(undefined) },
  QUEUE_NAMES: { ALERTS: 'alerts' },
  CHANNELS: {
    INCIDENT_CREATED: 'bridgeguard:incident:created',
    ALERT_CREATED: 'bridgeguard:alert:created',
    MESSAGE_UPDATED: 'bridgeguard:message:updated',
    MESSAGE_CREATED: 'bridgeguard:message:created',
    METRICS_UPDATED: 'bridgeguard:metrics:updated',
  },
}));

describe('Security Alerts Worker Pipeline', () => {
  const mockLane = {
    id: 'lane-uuid-123',
    sourceChainId: 11155111,
    destinationChainId: 421614,
    sourceChainName: 'Ethereum Sepolia',
    destinationChainName: 'Arbitrum Sepolia',
    latencyP95: 180_000,
  };

  const mockHighRiskResult: CorrelatedRiskResult = {
    riskLevel: 'HIGH',
    signalCount: 3,
    signals: [
      {
        type: SecuritySignalType.UNKNOWN_SENDER,
        severity: 'SUSPICIOUS',
        title: 'Unknown Sender Detected',
        description: 'Sender is not allowlisted',
        observedValue: '0xbad000000000000000000000000000000000dead',
        threshold: '6 allowlisted senders',
        evidence: 'Sender 0xbad... is not present in allowlist',
        timestamp: new Date().toISOString(),
      },
      {
        type: SecuritySignalType.UNKNOWN_CONTRACT_INTERACTION,
        severity: 'SUSPICIOUS',
        title: 'Unknown Contract Interaction',
        description: 'Contract not recognized',
        observedValue: '0xattacker0000000000000000000000000000000',
        threshold: '9 trusted contracts',
        evidence: 'Receiver 0xattacker... not recognized in trusted set',
        timestamp: new Date().toISOString(),
      },
      {
        type: SecuritySignalType.MESSAGE_BURST,
        severity: 'ANOMALOUS ACTIVITY',
        title: 'Message Burst Detected',
        description: 'High message rate observed',
        observedValue: '18 msgs / 60s',
        threshold: '5 msgs / 60s',
        evidence: '18 messages observed within 60 seconds (threshold: 5)',
        timestamp: new Date().toISOString(),
      },
    ],
    lane: 'Ethereum Sepolia → Arbitrum Sepolia',
    laneId: 'lane-uuid-123',
    messageId: '0xccip_msg_9999',
    sourceChain: 'Ethereum Sepolia',
    destinationChain: 'Arbitrum Sepolia',
    evidence: [
      'Sender 0xbad... is not present in allowlist',
      'Receiver 0xattacker... not recognized in trusted set',
      '18 messages observed within 60 seconds (threshold: 5)',
    ],
    detectedAt: new Date().toISOString(),
    isSimulation: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. should create SUSPICIOUS_ACTIVITY incident, active alert, and audit log when risk reaches HIGH', async () => {
    const insertedIncident = {
      id: 'incident-uuid-001',
      type: 'SUSPICIOUS_ACTIVITY',
      severity: 'HIGH',
      status: 'OPEN',
      title: 'High-risk cross-chain activity detected',
      laneId: mockLane.id,
    };

    const insertedAlert = {
      id: 'alert-uuid-001',
      type: 'SUSPICIOUS_ACTIVITY',
      resource: 'Ethereum Sepolia → Arbitrum Sepolia',
      status: 'ACTIVE',
      threshold: 3,
      observedValue: 3,
      incidentId: insertedIncident.id,
    };

    let executedAdvisoryLock = false;
    let checkedExistingIncident = false;
    let createdIncidentValues: any = null;
    let createdAlertValues: any = null;
    let createdAuditValues: any = null;

    (db.transaction as any).mockImplementation(async (callback: any) => {
      const mockTx = {
        execute: vi.fn().mockImplementation(async (query: any) => {
          executedAdvisoryLock = true;
          return [];
        }),
        select: vi.fn(() => ({
          from: vi.fn((table) => ({
            where: vi.fn().mockImplementation(async () => {
              if (table === incidents) {
                checkedExistingIncident = true;
                return []; // No existing open incident
              }
              if (table === alerts) {
                return []; // No existing active alert
              }
              return [];
            }),
          })),
        })),
        insert: vi.fn((table) => ({
          values: vi.fn().mockImplementation((val) => {
            if (table === incidents) {
              createdIncidentValues = val;
              return {
                returning: vi.fn().mockResolvedValue([insertedIncident]),
              };
            }
            if (table === alerts) {
              createdAlertValues = val;
              return {
                returning: vi.fn().mockResolvedValue([insertedAlert]),
              };
            }
            if (table === auditLogs) {
              createdAuditValues = val;
              return Promise.resolve();
            }
            return {
              returning: vi.fn().mockResolvedValue([{ id: 'mock-id' }]),
            };
          }),
        })),
      };

      return await callback(mockTx);
    });

    const result = await createSuspiciousActivityIncidentAndAlert(
      mockHighRiskResult,
      mockLane,
      { ccipMessageId: '0xccip_msg_9999' },
    );

    expect(executedAdvisoryLock).toBe(true);
    expect(checkedExistingIncident).toBe(true);
    expect(result).not.toBeNull();
    expect(result?.incident).toEqual(insertedIncident);
    expect(result?.alert).toEqual(insertedAlert);

    // Verify Incident fields
    expect(createdIncidentValues.type).toBe('SUSPICIOUS_ACTIVITY');
    expect(createdIncidentValues.severity).toBe('HIGH');
    expect(createdIncidentValues.status).toBe('OPEN');
    expect(createdIncidentValues.title).toContain('High-risk cross-chain activity detected');
    expect(createdIncidentValues.laneId).toBe(mockLane.id);
    expect(createdIncidentValues.relatedMessageIds).toEqual(['0xccip_msg_9999']);
    expect(createdIncidentValues.metadata.riskLevel).toBe('HIGH');
    expect(createdIncidentValues.metadata.signalCount).toBe(3);

    // Verify Alert fields
    expect(createdAlertValues.type).toBe('SUSPICIOUS_ACTIVITY');
    expect(createdAlertValues.threshold).toBe(3);
    expect(createdAlertValues.observedValue).toBe(3);
    expect(createdAlertValues.status).toBe('ACTIVE');

    // Verify Audit Log fields (Preserving audit immutability)
    expect(createdAuditValues.action).toBe('INCIDENT_DETECTED');
    expect(createdAuditValues.resource).toBe('incident');
    expect(createdAuditValues.resourceId).toBe(insertedIncident.id);
    expect(createdAuditValues.operatorId).toBe('system');
    expect(createdAuditValues.operatorName).toBe('Security Detection Engine');
    expect(createdAuditValues.details.detectorType).toBe('SUSPICIOUS_ACTIVITY');
    expect(createdAuditValues.details.signals).toEqual([
      SecuritySignalType.UNKNOWN_SENDER,
      SecuritySignalType.UNKNOWN_CONTRACT_INTERACTION,
      SecuritySignalType.MESSAGE_BURST,
    ]);
    expect(createdAuditValues.details.threshold).toBe(3);
    expect(createdAuditValues.details.observedValue).toBe(3);
    expect(createdAuditValues.details.messageId).toBe('0xccip_msg_9999');
    expect(createdAuditValues.details.laneId).toBe(mockLane.id);
    expect(createdAuditValues.status).toBe('SUCCESS');

    // Verify Event Publications
    expect(publishEvent).toHaveBeenCalledWith(CHANNELS.INCIDENT_CREATED, insertedIncident);
    expect(publishEvent).toHaveBeenCalledWith(CHANNELS.ALERT_CREATED, insertedAlert);
  });

  it('2. should prevent duplicate incidents when an open incident already exists', async () => {
    const existingOpenIncident = {
      id: 'existing-incident-999',
      type: 'SUSPICIOUS_ACTIVITY',
      status: 'OPEN',
      laneId: mockLane.id,
    };

    (db.transaction as any).mockImplementation(async (callback: any) => {
      const mockTx = {
        execute: vi.fn().mockResolvedValue([]),
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([existingOpenIncident]),
          })),
        })),
        insert: vi.fn(),
      };

      return await callback(mockTx);
    });

    const result = await createSuspiciousActivityIncidentAndAlert(
      mockHighRiskResult,
      mockLane,
    );

    // Must be null to avoid duplicate creation
    expect(result).toBeNull();
    expect(publishEvent).not.toHaveBeenCalled();
  });

  it('3. should correctly distinguish and label simulation mode', async () => {
    const simRiskResult: CorrelatedRiskResult = {
      ...mockHighRiskResult,
      isSimulation: true,
    };

    let auditDetails: any = null;
    let incidentValues: any = null;

    (db.transaction as any).mockImplementation(async (callback: any) => {
      const mockTx = {
        execute: vi.fn().mockResolvedValue([]),
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue([]),
          })),
        })),
        insert: vi.fn((table) => ({
          values: vi.fn().mockImplementation((val) => {
            if (table === incidents) {
              incidentValues = val;
              return { returning: vi.fn().mockResolvedValue([{ id: 'sim-inc-1' }]) };
            }
            if (table === alerts) {
              return { returning: vi.fn().mockResolvedValue([{ id: 'sim-alt-1' }]) };
            }
            if (table === auditLogs) {
              auditDetails = val;
              return Promise.resolve();
            }
            return { returning: vi.fn().mockResolvedValue([]) };
          }),
        })),
      };

      return await callback(mockTx);
    });

    await createSuspiciousActivityIncidentAndAlert(simRiskResult, mockLane);

    // Verified simulation label
    expect(incidentValues.title).toContain('[SIMULATION]');
    expect(incidentValues.metadata.isSimulation).toBe(true);
    expect(auditDetails.operatorName).toBe('Security Simulation Engine');
    expect(auditDetails.details.isSimulation).toBe(true);
  });
});
