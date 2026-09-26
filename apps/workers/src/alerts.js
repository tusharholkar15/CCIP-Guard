import { db } from '@bridgeguard/database';
import { lanes, incidents, alerts, auditLogs, metricSnapshots, messages } from '@bridgeguard/database';
import { INCIDENT_THRESHOLDS, analyzeTelemetryRisk, getDetectorConfig, } from '@bridgeguard/shared';
import { subscribeToChannel, publishEvent, CHANNELS } from '@bridgeguard/redis';
import { createWorker, QUEUE_NAMES, alertsQueue } from '@bridgeguard/redis';
import { eq, and, desc, sql, gte } from 'drizzle-orm';
export async function checkThresholds() {
    console.log('[Alert Worker] Checking thresholds & security risks...');
    const allLanes = await db.select().from(lanes);
    for (const lane of allLanes) {
        // 1. Get latest 5m metric snapshot
        const [latestMetric] = await db
            .select()
            .from(metricSnapshots)
            .where(and(eq(metricSnapshots.laneId, lane.id), eq(metricSnapshots.window, '5m')))
            .orderBy(desc(metricSnapshots.timestamp))
            .limit(1);
        if (latestMetric) {
            // Check HIGH_LATENCY
            if (latestMetric.latencyP95 !== null && latestMetric.latencyP95 > INCIDENT_THRESHOLDS.HIGH_LATENCY_MS) {
                await createIncidentAndAlert('HIGH_LATENCY', lane, `P95 latency ${latestMetric.latencyP95}ms exceeds threshold ${INCIDENT_THRESHOLDS.HIGH_LATENCY_MS}ms`, latestMetric.latencyP95, INCIDENT_THRESHOLDS.HIGH_LATENCY_MS);
            }
            // Check DELIVERY_FAILURE_SPIKE
            if (latestMetric.messageCount > 0) {
                const failureRate = latestMetric.failureCount / latestMetric.messageCount;
                if (failureRate > INCIDENT_THRESHOLDS.FAILURE_SPIKE_RATE) {
                    await createIncidentAndAlert('DELIVERY_FAILURE_SPIKE', lane, `Failure rate ${(failureRate * 100).toFixed(1)}% exceeds threshold ${INCIDENT_THRESHOLDS.FAILURE_SPIKE_RATE * 100}%`, failureRate, INCIDENT_THRESHOLDS.FAILURE_SPIKE_RATE);
                }
            }
            // Check MESSAGE_BACKLOG
            if (latestMetric.backlog > INCIDENT_THRESHOLDS.MESSAGE_BACKLOG_COUNT) {
                await createIncidentAndAlert('MESSAGE_BACKLOG', lane, `Backlog ${latestMetric.backlog} messages exceeds threshold ${INCIDENT_THRESHOLDS.MESSAGE_BACKLOG_COUNT}`, latestMetric.backlog, INCIDENT_THRESHOLDS.MESSAGE_BACKLOG_COUNT);
            }
        }
        // 2. Check Security Risk Telemetry on recent lane activity
        await checkLaneSecurityRisks(lane);
    }
    console.log('[Alert Worker] Threshold & security checks complete.');
}
/**
 * Checks recent lane telemetry for multi-signal security risks.
 */
async function checkLaneSecurityRisks(lane) {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentMessages = await db
        .select()
        .from(messages)
        .where(and(eq(messages.laneId, lane.id), gte(messages.createdAt, oneMinuteAgo)))
        .orderBy(desc(messages.createdAt))
        .limit(25);
    if (recentMessages.length === 0)
        return;
    for (const msg of recentMessages) {
        await evaluateMessageSecurityRisk(msg.ccipMessageId, lane);
    }
}
/**
 * Evaluates a specific message against all 6 security detectors with correlation.
 */
export async function evaluateMessageSecurityRisk(messageId, preloadedLane) {
    const [msg] = await db.select().from(messages).where(eq(messages.ccipMessageId, messageId)).limit(1);
    if (!msg)
        return null;
    let lane = preloadedLane;
    if (!lane) {
        const [foundLane] = await db.select().from(lanes).where(eq(lanes.id, msg.laneId)).limit(1);
        lane = foundLane;
    }
    if (!lane)
        return null;
    const windowSeconds = 60;
    const since = new Date(Date.now() - windowSeconds * 1000);
    // Count recent messages on this lane
    const laneRecent = await db
        .select({ id: messages.id, state: messages.state })
        .from(messages)
        .where(and(eq(messages.laneId, lane.id), gte(messages.createdAt, since)));
    const laneMessageCountWindow = laneRecent.length;
    const failureCount = laneRecent.filter((m) => m.state === 'FAILED').length;
    const failureRate = laneMessageCountWindow > 0 ? failureCount / laneMessageCountWindow : 0;
    // Count recent messages from this sender
    let senderMessageCountWindow = 1;
    if (msg.sender) {
        const senderRecent = await db
            .select({ id: messages.id })
            .from(messages)
            .where(and(eq(messages.sender, msg.sender), gte(messages.createdAt, since)));
        senderMessageCountWindow = senderRecent.length;
    }
    const context = {
        messageId: msg.ccipMessageId,
        sender: msg.sender,
        receiver: msg.receiver,
        sourceChainId: msg.sourceChainId,
        destinationChainId: msg.destinationChainId,
        sourceChainName: msg.sourceChainName,
        destinationChainName: msg.destinationChainName,
        feeToken: msg.feeToken ?? undefined,
        feeTokenAmount: msg.feeTokenAmount ?? undefined,
        latencyMs: msg.latencyMs,
        state: msg.state,
        timestamp: msg.createdAt,
        laneId: lane.id,
        laneMessageCountWindow,
        laneWindowSeconds: windowSeconds,
        laneFailureCount: failureCount,
        laneFailureRate: failureRate,
        laneLatencyBaselineMs: lane.latencyP95 ?? 180_000,
        laneLatencyP95: lane.latencyP95,
        senderMessageCountWindow,
    };
    const riskResult = analyzeTelemetryRisk(context, getDetectorConfig());
    // Only correlated HIGH risk triggers incident creation
    if (riskResult.riskLevel === 'HIGH') {
        await createSuspiciousActivityIncidentAndAlert(riskResult, lane, msg);
    }
    return riskResult;
}
/**
 * Creates a SUSPICIOUS_ACTIVITY incident, active alert, and audit log
 * with complete idempotency protection via pg_advisory_xact_lock.
 */
export async function createSuspiciousActivityIncidentAndAlert(riskResult, lane, message) {
    const isSim = !!riskResult.isSimulation;
    const dedupePrefix = isSim ? 'incident:sim' : 'incident:real';
    const dedupeKey = `${dedupePrefix}:${lane.id}:SUSPICIOUS_ACTIVITY`;
    const signalTitles = riskResult.signals.map((s) => s.type).join(' + ');
    const title = `High-risk cross-chain activity detected${isSim ? ' [SIMULATION]' : ''}`;
    const description = `Correlated high-risk security activity detected on ${lane.sourceChainName} → ${lane.destinationChainName}. Detected signals: ${riskResult.signals.map((s) => s.type).join(', ')}.`;
    const detectionReason = `${signalTitles}: ${riskResult.evidence.join(' | ')}`;
    const result = await db.transaction(async (tx) => {
        // 1. Transactional advisory lock to serialize concurrent worker execution
        await tx.execute(sql `SELECT pg_advisory_xact_lock(hashtext(${dedupeKey}))`);
        // 2. Check if there is already an open SUSPICIOUS_ACTIVITY incident for this lane
        const [existing] = await tx
            .select()
            .from(incidents)
            .where(and(eq(incidents.type, 'SUSPICIOUS_ACTIVITY'), eq(incidents.laneId, lane.id), eq(incidents.status, 'OPEN')));
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
            .where(and(eq(alerts.type, 'SUSPICIOUS_ACTIVITY'), eq(alerts.resource, resource), eq(alerts.status, 'ACTIVE')));
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
    if (!result)
        return null;
    const { incident, alert, isNewAlert } = result;
    await publishEvent(CHANNELS.INCIDENT_CREATED, incident);
    if (isNewAlert && alert) {
        await publishEvent(CHANNELS.ALERT_CREATED, alert);
    }
    console.log(`[Security Engine] Created SUSPICIOUS_ACTIVITY incident on ${lane.sourceChainName} → ${lane.destinationChainName}`);
    return { incident, alert };
}
export async function createIncidentAndAlert(type, lane, reason, observedValue, threshold) {
    const dedupeKey = `incident:${lane.id}:${type}`;
    const result = await db.transaction(async (tx) => {
        // 1. Transactional advisory lock to serialize concurrent worker execution per lane+type
        await tx.execute(sql `SELECT pg_advisory_xact_lock(hashtext(${dedupeKey}))`);
        // 2. Check if there is already an open incident for this lane and type
        const [existing] = await tx
            .select()
            .from(incidents)
            .where(and(eq(incidents.type, type), eq(incidents.laneId, lane.id), eq(incidents.status, 'OPEN')));
        if (existing) {
            // Don't create duplicate incidents
            return null;
        }
        const severity = type === 'MESSAGE_BACKLOG' ? 'MEDIUM' : 'HIGH';
        // 3. Create incident atomically
        const [incident] = await tx
            .insert(incidents)
            .values({
            type: type,
            severity: severity,
            status: 'OPEN',
            title: `${type.replace(/_/g, ' ')} detected on ${lane.sourceChainName} → ${lane.destinationChainName}`,
            description: reason,
            laneId: lane.id,
            sourceChainName: lane.sourceChainName,
            destinationChainName: lane.destinationChainName,
            detectionReason: reason,
            relatedMessageIds: [],
        })
            .returning();
        // 4. Create alert linked to incident, deduplicated by active condition
        const resource = `${lane.sourceChainName} → ${lane.destinationChainName}`;
        const [existingAlert] = await tx
            .select()
            .from(alerts)
            .where(and(eq(alerts.type, type), eq(alerts.resource, resource), eq(alerts.status, 'ACTIVE')));
        let alert = existingAlert;
        let isNewAlert = false;
        if (!alert) {
            const [newAlert] = await tx
                .insert(alerts)
                .values({
                type,
                resource,
                threshold,
                observedValue,
                status: 'ACTIVE',
                message: reason,
                incidentId: incident.id,
            })
                .returning();
            alert = newAlert;
            isNewAlert = true;
        }
        // 5. Audit log
        await tx.insert(auditLogs).values({
            action: 'INCIDENT_DETECTED',
            resource: 'incident',
            resourceId: incident.id,
            operatorId: 'system',
            operatorName: 'Alert Worker',
            details: { type, reason, threshold, observedValue, alertId: alert?.id },
            status: 'SUCCESS',
        });
        return { incident, alert, isNewAlert };
    });
    if (!result)
        return;
    const { incident, alert, isNewAlert } = result;
    await publishEvent(CHANNELS.INCIDENT_CREATED, incident);
    if (isNewAlert && alert) {
        await publishEvent(CHANNELS.ALERT_CREATED, alert);
    }
    console.log(`[Alert Worker] Created incident: ${type} on ${lane.sourceChainName} → ${lane.destinationChainName}`);
}
async function main() {
    console.log('[Alert Worker] Starting...');
    // Schedule recurring threshold checks
    await alertsQueue.add('check-thresholds', {}, {
        repeat: { every: 60000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
    });
    const worker = createWorker(QUEUE_NAMES.ALERTS, async () => {
        await checkThresholds();
    });
    worker.on('completed', (job) => {
        console.log(`[Alert Worker] Job ${job.id} completed`);
    });
    worker.on('failed', (job, err) => {
        console.error(`[Alert Worker] Job ${job?.id} failed:`, err);
    });
    // Listen for metrics updates
    await subscribeToChannel(CHANNELS.METRICS_UPDATED, async () => {
        await checkThresholds();
    });
    // Listen for real message updates to run real-time security risk evaluation
    await subscribeToChannel(CHANNELS.MESSAGE_UPDATED, async (data) => {
        if (data?.messageId) {
            try {
                await evaluateMessageSecurityRisk(data.messageId);
            }
            catch (err) {
                console.error(`[Alert Worker] Failed evaluating security risk for message ${data.messageId}:`, err);
            }
        }
    });
    console.log('[Alert Worker] Running.');
}
if (process.env.NODE_ENV !== 'test') {
    main().catch((err) => {
        console.error('[Alert Worker] Fatal error:', err);
        process.exit(1);
    });
}
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
//# sourceMappingURL=alerts.js.map