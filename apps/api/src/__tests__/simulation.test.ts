import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { simulationRoutes } from '../routes/simulation';
import { db, lanes } from '@bridgeguard/database';
import * as securityService from '../services/security-incidents';

vi.mock('@bridgeguard/database', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
  lanes: {
    id: 'id',
    sourceChainId: 'sourceChainId',
  },
}));

vi.mock('../services/security-incidents', () => ({
  createSuspiciousActivityIncidentAndAlert: vi.fn(),
}));

if (typeof (BigInt.prototype as any).toJSON !== 'function') {
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };
}

process.env.ENVIRONMENT = 'test';
describe('Simulation Routes (/api/simulation)', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify();
    await app.register(simulationRoutes, { prefix: '/api/simulation' });
  });

  describe('GET /api/simulation/scenarios', () => {
    it('returns available preset simulation scenarios', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/simulation/scenarios',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toBeInstanceOf(Array);
      expect(body.data.length).toBeGreaterThanOrEqual(4);

      const multiSignal = body.data.find((s: any) => s.id === 'multi-signal-burst-attack');
      expect(multiSignal).toBeDefined();
      expect(multiSignal.expectedRiskLevel).toBe('HIGH');
      expect(multiSignal.expectedSignals).toContain('UNKNOWN_SENDER');
      expect(multiSignal.expectedSignals).toContain('UNKNOWN_CONTRACT_INTERACTION');
      expect(multiSignal.expectedSignals).toContain('MESSAGE_BURST');
    });
  });

  describe('GET /api/simulation/config', () => {
    it('returns active detector configuration and allowlists', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/simulation/config',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.knownSenders).toBeInstanceOf(Array);
      expect(body.trustedContracts).toBeInstanceOf(Array);
      expect(body.largeTransferThresholdWei).toBeDefined();
      expect(body.messageBurstThreshold).toBe(5);
      expect(body.riskThresholds).toEqual({ low: 1, medium: 2, high: 3 });
    });
  });

  describe('POST /api/simulation/detect (Dry Run / In-Memory)', () => {
    it('evaluates multi-signal attack in memory with zero blockchain transactions', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/simulation/detect',
        payload: { scenarioId: 'multi-signal-burst-attack' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.notice).toBe('SIMULATION — NOT LIVE BLOCKCHAIN ACTIVITY');
      expect(body.result.riskLevel).toBe('HIGH');
      expect(body.result.signalCount).toBe(3);
      expect(body.result.isSimulation).toBe(true);
      expect(body.result.evidence.length).toBe(3);
    });

    it('evaluates single signal as LOW risk and does not label it as malicious', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/simulation/detect',
        payload: { scenarioId: 'single-signal-unlisted-sender' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.notice).toBe('SIMULATION — NOT LIVE BLOCKCHAIN ACTIVITY');
      expect(body.result.riskLevel).toBe('LOW');
      expect(body.result.signalCount).toBe(1);
    });

    it('evaluates custom telemetry context', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/simulation/detect',
        payload: {
          customContext: {
            sender: '0xunknown1234567890123456789012345678901234',
            sourceChainId: 1,
            destinationChainId: 42161,
            sourceChainName: 'Ethereum',
            destinationChainName: 'Arbitrum',
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.notice).toBe('SIMULATION — NOT LIVE BLOCKCHAIN ACTIVITY');
      expect(body.result.signals[0].type).toBe('UNKNOWN_SENDER');
    });

    it('returns 400 when neither scenarioId nor customContext provided', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/simulation/detect',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/simulation/incident', () => {
    it('runs simulation pipeline and generates demonstration incident and active alert', async () => {
      const mockLane = {
        id: 'lane-mock-uuid',
        sourceChainId: 1,
        destinationChainId: 42161,
        sourceChainName: 'Ethereum',
        destinationChainName: 'Arbitrum',
      };

      (db.select as any).mockImplementation(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([mockLane]),
          })),
        })),
      }));

      (securityService.createSuspiciousActivityIncidentAndAlert as any).mockResolvedValue({
        incident: {
          id: 'incident-sim-001',
          type: 'SUSPICIOUS_ACTIVITY',
          title: 'High-risk cross-chain activity detected [SIMULATION]',
          severity: 'HIGH',
          status: 'OPEN',
        },
        alert: {
          id: 'alert-sim-001',
          type: 'SUSPICIOUS_ACTIVITY',
          status: 'ACTIVE',
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/simulation/incident',
        payload: { scenarioId: 'multi-signal-burst-attack' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.notice).toBe('SIMULATION — NOT LIVE BLOCKCHAIN ACTIVITY');
      expect(body.incident).toBeDefined();
      expect(body.alert).toBeDefined();
      expect(body.riskResult.riskLevel).toBe('HIGH');
      expect(securityService.createSuspiciousActivityIncidentAndAlert).toHaveBeenCalled();
    });

    it('does not create an incident if scenario does not reach HIGH risk', async () => {
      const mockLane = {
        id: 'lane-mock-uuid',
        sourceChainId: 1,
        destinationChainId: 42161,
        sourceChainName: 'Ethereum',
        destinationChainName: 'Arbitrum',
      };

      (db.select as any).mockImplementation(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([mockLane]),
          })),
        })),
      }));

      const response = await app.inject({
        method: 'POST',
        url: '/api/simulation/incident',
        payload: { scenarioId: 'single-signal-unlisted-sender' }, // LOW risk
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.notice).toBe('SIMULATION — NOT LIVE BLOCKCHAIN ACTIVITY');
      expect(body.incident).toBeUndefined();
      expect(body.message).toContain('High risk threshold not reached, no incident generated');
      expect(securityService.createSuspiciousActivityIncidentAndAlert).not.toHaveBeenCalled();
    });
  });
});
