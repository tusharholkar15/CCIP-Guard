import type { FastifyInstance } from 'fastify';
import { db } from '@bridgeguard/database';
import { lanes } from '@bridgeguard/database';
import { eq } from 'drizzle-orm';
import {
  PRESET_SIMULATION_SCENARIOS,
  runSimulationScenario,
  runCustomSimulation,
  getDetectorConfig,
  type SecurityTelemetryContext,
} from '@bridgeguard/shared';
import { createSuspiciousActivityIncidentAndAlert } from '../services/security-incidents.js';

if (typeof (BigInt.prototype as any).toJSON !== 'function') {
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };
}

export async function simulationRoutes(app: FastifyInstance) {
  // STRICT REQUIREMENT: Never execute simulation routes in mainnet mode
  app.addHook('onRequest', async (request, reply) => {
    if (process.env.ENVIRONMENT === 'mainnet' || !process.env.ENVIRONMENT) {
      return reply.code(403).send({ error: 'Forbidden', message: 'Simulation is disabled in MAINNET mode', statusCode: 403 });
    }
  });

  /**
   * GET /api/simulation/scenarios
   * Returns list of preset security demonstration scenarios.
   */
  app.get('/scenarios', async () => {
    return {
      data: PRESET_SIMULATION_SCENARIOS.map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        description: s.description,
        expectedRiskLevel: s.expectedRiskLevel,
        expectedSignals: s.expectedSignals,
        context: {
          ...s.context,
          feeTokenAmount: s.context.feeTokenAmount?.toString(),
        },
      })),
    };
  });

  /**
   * GET /api/simulation/config
   * Returns current detector thresholds and allowlists.
   */
  app.get('/config', async () => {
    const config = getDetectorConfig();
    return {
      ...config,
      largeTransferThresholdWei: config.largeTransferThresholdWei.toString(),
    };
  });

  /**
   * POST /api/simulation/detect
   * Pure in-memory dry-run evaluation.
   * NEVER sends blockchain transactions, NEVER modifies blockchain state, NEVER writes to database.
   */
  app.post<{
    Body: {
      scenarioId?: string;
      customContext?: SecurityTelemetryContext;
    };
  }>('/detect', async (request, reply) => {
    const { scenarioId, customContext } = request.body || {};

    try {
      if (scenarioId) {
        const { scenario, result } = runSimulationScenario(scenarioId);
        return {
          scenario,
          result,
          notice: 'SIMULATION — NOT LIVE BLOCKCHAIN ACTIVITY',
        };
      }

      if (customContext) {
        const result = runCustomSimulation(customContext);
        return {
          result,
          notice: 'SIMULATION — NOT LIVE BLOCKCHAIN ACTIVITY',
        };
      }

      return reply.code(400).send({
        error: 'Bad Request',
        message: 'Must provide either scenarioId or customContext',
        statusCode: 400,
      });
    } catch (err: any) {
      return reply.code(400).send({
        error: 'Simulation Error',
        message: err.message,
        statusCode: 400,
      });
    }
  });

  /**
   * POST /api/simulation/incident
   * Runs simulation through the real detector pipeline and creates a visibly labeled
   * [SIMULATION] incident and active alert so operators can observe the full SOC lifecycle.
   * NEVER sends blockchain transactions, NEVER modifies blockchain state.
   */
  app.post<{
    Body: {
      scenarioId: string;
    };
  }>('/incident', async (request, reply) => {
    const { scenarioId } = request.body || {};
    if (!scenarioId) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'scenarioId is required',
        statusCode: 400,
      });
    }

    try {
      const { scenario, result } = runSimulationScenario(scenarioId);

      // Resolve or retrieve lane
      let [lane] = await db
        .select()
        .from(lanes)
        .where(
          eq(lanes.sourceChainId, scenario.context.sourceChainId),
        )
        .limit(1);

      if (!lane) {
        const [anyLane] = await db.select().from(lanes).limit(1);
        lane = anyLane;
      }

      if (!lane) {
        // Create an explicit simulation lane if no lane exists in DB
        const [newLane] = await db
          .insert(lanes)
          .values({
            sourceChainId: scenario.context.sourceChainId,
            destinationChainId: scenario.context.destinationChainId,
            sourceChainName: scenario.context.sourceChainName,
            destinationChainName: scenario.context.destinationChainName,
            status: 'ACTIVE',
          })
          .returning();
        lane = newLane;
      }

      // If correlated risk is HIGH, trigger the incident & alert creation
      if (result.riskLevel === 'HIGH') {
        const created = await createSuspiciousActivityIncidentAndAlert(
          result,
          lane,
          { ccipMessageId: scenario.context.messageId },
        );

        return {
          success: true,
          notice: 'SIMULATION — NOT LIVE BLOCKCHAIN ACTIVITY',
          riskResult: result,
          incident: created?.incident || null,
          alert: created?.alert || null,
          alreadyExisted: !created,
        };
      }

      return {
        success: true,
        notice: 'SIMULATION — NOT LIVE BLOCKCHAIN ACTIVITY',
        riskResult: result,
        message: `Risk level is ${result.riskLevel} (${result.signalCount} signals). High risk threshold not reached, no incident generated.`,
      };
    } catch (err: any) {
      request.log.error(err, 'Failed to run simulation incident');
      return reply.code(500).send({
        error: 'Simulation Execution Error',
        message: err.message,
        statusCode: 500,
      });
    }
  });
}
