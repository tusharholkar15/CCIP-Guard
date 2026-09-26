import { type CorrelatedRiskResult } from '@bridgeguard/shared';
export declare function checkThresholds(): Promise<void>;
/**
 * Evaluates a specific message against all 6 security detectors with correlation.
 */
export declare function evaluateMessageSecurityRisk(messageId: string, preloadedLane?: any): Promise<CorrelatedRiskResult | null>;
/**
 * Creates a SUSPICIOUS_ACTIVITY incident, active alert, and audit log
 * with complete idempotency protection via pg_advisory_xact_lock.
 */
export declare function createSuspiciousActivityIncidentAndAlert(riskResult: CorrelatedRiskResult, lane: any, message?: any): Promise<{
    incident: {
        id: string;
        status: "OPEN" | "INVESTIGATING" | "MITIGATED" | "RESOLVED";
        createdAt: Date;
        updatedAt: Date;
        sourceChainName: string | null;
        destinationChainName: string | null;
        laneId: string | null;
        type: "HIGH_LATENCY" | "DELIVERY_FAILURE_SPIKE" | "MESSAGE_BACKLOG" | "SUSPICIOUS_ACTIVITY";
        severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
        title: string;
        description: string;
        detectedAt: Date;
        resolvedAt: Date | null;
        detectionReason: string;
        relatedMessageIds: string[];
        metadata: Record<string, any> | null;
    };
    alert: {
        id: string;
        status: "ACTIVE" | "RESOLVED" | "ACKNOWLEDGED";
        createdAt: Date;
        updatedAt: Date;
        type: string;
        resource: string;
        threshold: number;
        observedValue: number;
        message: string;
        incidentId: string | null;
    };
} | null>;
export declare function createIncidentAndAlert(type: string, lane: any, reason: string, observedValue: number, threshold: number): Promise<void>;
//# sourceMappingURL=alerts.d.ts.map