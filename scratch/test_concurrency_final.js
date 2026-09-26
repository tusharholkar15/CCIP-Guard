/**
 * BridgeGuard — Concurrency Hardening Test (plain postgres.js, no worker import)
 *
 * Tests that pg_advisory_xact_lock correctly serializes concurrent
 * createIncidentAndAlert-equivalent calls, resulting in exactly 1 incident/alert/audit row.
 *
 * Run: node scratch/test_concurrency_final.js
 */

import postgres from '../node_modules/.pnpm/postgres@3.4.9/node_modules/postgres/src/index.js';

const DATABASE_URL = 'postgresql://bridgeguard:bridgeguard@localhost:5433/bridgeguard';

// ---------------------------------------------------------------------------
// Simulate createIncidentAndAlert logic using raw SQL (no worker import)
// ---------------------------------------------------------------------------
async function simulateCreateIncidentAndAlert(sql, type, lane, reason, observedValue, threshold) {
  const dedupeKey = `incident:${lane.id}:${type}`;
  const severity = type === 'MESSAGE_BACKLOG' ? 'MEDIUM' : 'HIGH';
  const resource = `${lane.sourceChainName} -> ${lane.destinationChainName}`;
  const title = `${type.replace(/_/g, ' ')} detected on ${lane.sourceChainName} -> ${lane.destinationChainName}`;

  // Each concurrent call runs in its own transaction with advisory lock
  const result = await sql.begin(async (tx) => {
    // Acquire transactional advisory lock — serializes concurrent calls for same (lane,type)
    await tx`SELECT pg_advisory_xact_lock(hashtext(${dedupeKey}))`;

    // Check for existing OPEN incident
    const existing = await tx`
      SELECT id FROM incidents
      WHERE type = ${type}::incident_type
        AND lane_id = ${lane.id}::uuid
        AND status = 'OPEN'::incident_status
      LIMIT 1
    `;

    if (existing.length > 0) {
      // Deduplicated — no-op
      return null;
    }

    // Insert incident
    const [incident] = await tx`
      INSERT INTO incidents (type, severity, status, title, description, lane_id, source_chain_name, destination_chain_name, detection_reason, related_message_ids)
      VALUES (
        ${type}::incident_type,
        ${severity}::incident_severity,
        'OPEN'::incident_status,
        ${title},
        ${reason},
        ${lane.id}::uuid,
        ${lane.sourceChainName},
        ${lane.destinationChainName},
        ${reason},
        '{}'
      )
      RETURNING id, type, status, lane_id, created_at
    `;

    // Check for existing ACTIVE alert
    const existingAlert = await tx`
      SELECT id FROM alerts
      WHERE type = ${type}
        AND resource = ${resource}
        AND status = 'ACTIVE'
      LIMIT 1
    `;

    let alertId;
    let isNewAlert = false;
    if (existingAlert.length > 0) {
      alertId = existingAlert[0].id;
    } else {
      const [newAlert] = await tx`
        INSERT INTO alerts (type, resource, threshold, observed_value, status, message, incident_id)
        VALUES (
          ${type},
          ${resource},
          ${threshold},
          ${observedValue},
          'ACTIVE',
          ${reason},
          ${incident.id}::uuid
        )
        RETURNING id
      `;
      alertId = newAlert.id;
      isNewAlert = true;
    }

    // Audit log (action, status are varchar — no enum cast; resource_id is varchar)
    await tx`
      INSERT INTO audit_logs (action, resource, resource_id, operator_id, operator_name, details, status)
      VALUES (
        'INCIDENT_DETECTED',
        'incident',
        ${incident.id},
        'system',
        'Alert Worker',
        ${JSON.stringify({ type, reason, threshold, observedValue, alertId })}::jsonb,
        'SUCCESS'
      )
    `;

    return { incidentId: incident.id, alertId, isNewAlert };
  });

  return result;
}

// ---------------------------------------------------------------------------
// Main test runner
// ---------------------------------------------------------------------------
async function runConcurrencyTest() {
  const sql = postgres(DATABASE_URL);

  console.log('=== BridgeGuard Concurrency Hardening Test ===\n');

  // Use a deterministic fake UUID for the test lane (not a real lane)
  const testLaneId = 'e0000000-0000-0000-0000-000000000099';
  const testLane = {
    id: testLaneId,
    sourceChainName: 'TestChain Alpha',
    destinationChainName: 'TestChain Beta',
  };
  const testType = 'HIGH_LATENCY';
  const testReason = 'Deterministic concurrency verification';
  const testResource = `${testLane.sourceChainName} -> ${testLane.destinationChainName}`;

  let passed = false;

  try {
    // --- Clean slate for test lane ---
    console.log('[Setup] Cleaning any pre-existing test records...');

    // First get any test incident ids to clean audit_logs
    const preIncidents = await sql`
      SELECT id FROM incidents WHERE lane_id = ${testLaneId}::uuid
    `;
    for (const inc of preIncidents) {
      await sql`DELETE FROM audit_logs WHERE resource_id = ${inc.id}::uuid`;
    }
    await sql`DELETE FROM alerts WHERE resource = ${testResource}`;
    await sql`DELETE FROM incidents WHERE lane_id = ${testLaneId}::uuid`;

    console.log('[Setup] Clean slate ready.\n');

    // --- Launch 5 concurrent calls ---
    console.log('[Test] Launching 5 concurrent createIncidentAndAlert calls...');
    const CONCURRENT_CALLS = 5;
    const promises = Array.from({ length: CONCURRENT_CALLS }, (_, i) =>
      simulateCreateIncidentAndAlert(sql, testType, testLane, `${testReason} (call ${i + 1})`, 1200000, 300000)
    );

    const t0 = Date.now();
    const results = await Promise.all(promises);
    const elapsed = Date.now() - t0;

    console.log(`[Test] All ${CONCURRENT_CALLS} calls finished in ${elapsed}ms`);
    const created = results.filter(r => r !== null);
    const deduped = results.filter(r => r === null);
    console.log(`       -> Created (non-null): ${created.length}`);
    console.log(`       -> Deduped (null):     ${deduped.length}\n`);

    // --- Inspect database ---
    const openIncidents = await sql`
      SELECT id, type, status, lane_id, created_at
      FROM incidents
      WHERE lane_id = ${testLaneId}::uuid AND status = 'OPEN'
    `;
    console.log(`[DB Check] Open Incidents: ${openIncidents.length} (expected: 1)`);
    if (openIncidents.length > 0) {
      console.log('           ', JSON.stringify(openIncidents[0]));
    }

    const activeAlerts = await sql`
      SELECT id, type, resource, status, incident_id, created_at
      FROM alerts
      WHERE resource = ${testResource} AND status = 'ACTIVE'
    `;
    console.log(`[DB Check] Active Alerts:  ${activeAlerts.length} (expected: 1)`);
    if (activeAlerts.length > 0) {
      console.log('           ', JSON.stringify(activeAlerts[0]));
    }

    const incidentId = openIncidents[0]?.id;
    const auditLogs = incidentId
      ? await sql`SELECT id, action, operator_name FROM audit_logs WHERE resource_id = ${incidentId}`
      : [];
    console.log(`[DB Check] Audit Logs:     ${auditLogs.length} (expected: 1)`);
    if (auditLogs.length > 0) {
      console.log('           ', JSON.stringify(auditLogs[0]));
    }

    console.log('');

    // --- Assertions ---
    passed =
      openIncidents.length === 1 &&
      activeAlerts.length === 1 &&
      auditLogs.length === 1 &&
      activeAlerts[0]?.incident_id === openIncidents[0]?.id;

    if (passed) {
      console.log('✅ CONCURRENCY TEST PASSED');
      console.log('   Exactly 1 incident, 1 alert, 1 audit log created despite 5 concurrent calls.');
      console.log('   pg_advisory_xact_lock correctly serialized all concurrent workers.\n');
    } else {
      console.error('❌ CONCURRENCY TEST FAILED — duplicate or missing records!');
      console.error(`   incidents=${openIncidents.length}, alerts=${activeAlerts.length}, auditLogs=${auditLogs.length}`);
      process.exitCode = 1;
    }

    // --- Cleanup ---
    console.log('[Cleanup] Removing test records...');
    if (incidentId) {
      await sql`DELETE FROM audit_logs WHERE resource_id = ${incidentId}`;
    }
    await sql`DELETE FROM alerts WHERE resource = ${testResource}`;
    await sql`DELETE FROM incidents WHERE lane_id = ${testLaneId}::uuid`;
    console.log('[Cleanup] Done. Database restored to original state.\n');

  } catch (err) {
    console.error('[ERROR]', err);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }

  return passed;
}

runConcurrencyTest().catch((err) => {
  console.error(err);
  process.exit(1);
});
