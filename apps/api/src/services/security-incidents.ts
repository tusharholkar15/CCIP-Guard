import { db } from '@bridgeguard/database';
import { incidents, alerts, auditLogs } from '@bridgeguard/database';
import { publishEvent, CHANNELS } from '@bridgeguard/redis';
import { eq, and, sql } from 'drizzle-orm';
import type { CorrelatedRiskResult } from '@bridgeguard/shared';

/**
 * Creates a SUSPICIOUS_ACTIVITY incident, active alert, and audit log
 * with complete idempotency protection via pg_advisory_xact_lock.
 */
export async function createSuspiciousActivityIncidentAndAlert(
  riskResult: CorrelatedRiskResult,
  lane: any,
  message?: any,
) {
  const isSim = !!riskResult.isSimulation;
  const dedupePrefix = isSim ? 'incident:sim' : 'incident:real';
  const dedupeKey = `${dedupePrefix}:${lane.id}:SUSPICIOUS_ACTIVITY`;

  const signalTitles = riskResult.signals.map((s) => s.type).join(' + ');
  const title = `High-risk cross-chain activity detected${isSim ? ' [SIMULATION]' : ''}`;
  const description = `Correlated high-risk security activity detected on ${lane.sourceChainName} → ${lane.destinationChainName}. Detected signals: ${riskResult.signals.map((s) => s.type).join(', ')}.`;
  const detectionReason = `${signalTitles}: ${riskResult.evidence.join(' | ')}`;

  const result = await db.transaction(async (tx) => {
    // 1. Transactional advisory lock to serialize concurrent execution
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${dedupeKey}))`);

    // 2. Check if there is already an open SUSPICIOUS_ACTIVITY incident for this lane
    const [existing] = await tx
      .select()
      .from(incidents)
      .where(
        and(
          eq(incidents.type, 'SUSPICIOUS_ACTIVITY'),
          eq(incidents.laneId, lane.id),
          eq(incidents.status, 'OPEN'),
        ),
      );

    if (existing) {
      // Don't create duplicate incidents
      return null;
    }

    const relatedMessageIds = message?.ccipMessageId ? [message.ccipMessageId] : [];

    // 3. Create incident atomically
    const [incident] = await tx
      .insert(incidents)
      .values({
        type: 'SUSPICIOUS_ACTIVITY',
        severity: 'HIGH',
        status: 'OPEN',
        title,
        description,
        laneId: lane.id,
        sourceChainName: lane.sourceChainName,
        destinationChainName: lane.destinationChainName,
        detectionReason,
        relatedMessageIds,
        metadata: {
          ...riskResult,
          isSimulation: isSim,
        },
      })
      .returning();

    // 4. Create corresponding ACTIVE alert
    const resource = `${lane.sourceChainName} → ${lane.destinationChainName}`;
    const [existingAlert] = await tx
      .select()
      .from(alerts)
      .where(
        and(
          eq(alerts.type, 'SUSPICIOUS_ACTIVITY'),
          eq(alerts.resource, resource),
          eq(alerts.status, 'ACTIVE'),
        ),
      );

    let alert = existingAlert;
    let isNewAlert = false;
    if (!alert) {
      const [newAlert] = await tx
        .insert(alerts)
        .values({
          type: 'SUSPICIOUS_ACTIVITY',
          resource,
          threshold: 3, // High risk requires 3 correlated signals
          observedValue: riskResult.signalCount,
          status: 'ACTIVE',
          message: detectionReason,
          incidentId: incident.id,
        })
        .returning();
      alert = newAlert;
      isNewAlert = true;
    }

    // 5. Audit log (Preserve audit immutability with complete evidence details)
    await tx.insert(auditLogs).values({
      action: 'INCIDENT_DETECTED',
      resource: 'incident',
      resourceId: incident.id,
      operatorId: 'system',
      operatorName: isSim ? 'Security Simulation Engine' : 'Security Detection Engine',
      details: {
        detectorType: 'SUSPICIOUS_ACTIVITY',
        signals: riskResult.signals.map((s) => s.type),
        evidence: riskResult.evidence,
        threshold: 3,
        observedValue: riskResult.signalCount,
        messageId: riskResult.messageId || message?.ccipMessageId || null,
        laneId: lane.id,
        source: lane.sourceChainName,
        destination: lane.destinationChainName,
        alertId: alert?.id,
        isSimulation: isSim,
      },
      status: 'SUCCESS',
    });

    return { incident, alert, isNewAlert };
  });

  if (!result) return null;

  const { incident, alert, isNewAlert } = result;
  await publishEvent(CHANNELS.INCIDENT_CREATED, incident);
  if (isNewAlert && alert) {
    await publishEvent(CHANNELS.ALERT_CREATED, alert);
  }

  console.log(`[API Security Engine] Created SUSPICIOUS_ACTIVITY incident on ${lane.sourceChainName} → ${lane.destinationChainName}`);
  return { incident, alert };
}
