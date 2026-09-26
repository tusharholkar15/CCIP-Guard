import { createIncidentAndAlert } from '../apps/workers/dist/alerts.js';
import postgres from '../node_modules/.pnpm/postgres@3.4.9/node_modules/postgres/src/index.js';

const sql = postgres('postgresql://bridgeguard:bridgeguard@localhost:5433/bridgeguard');

async function runConcurrencyTest() {
  console.log('=== STARTING CONCURRENCY HARDENING TEST ===');

  const testLaneId = 'e0000000-0000-0000-0000-000000000001';
  const testLane = {
    id: testLaneId,
    sourceChainName: 'TestChain Alpha',
    destinationChainName: 'TestChain Beta',
  };
  const testType = 'HIGH_LATENCY';
  const testReason = 'Deterministic concurrency verification test';
  const testResource = `${testLane.sourceChainName} → ${testLane.destinationChainName}`;

  try {
    // 1. Ensure clean slate for this test lane
    await sql`DELETE FROM audit_logs WHERE details->>'type' = ${testType} AND resource_id IN (SELECT id FROM incidents WHERE lane_id = ${testLaneId})`;
    await sql`DELETE FROM alerts WHERE resource = ${testResource}`;
    await sql`DELETE FROM incidents WHERE lane_id = ${testLaneId}`;

    console.log('Clean slate ready. Launching 5 concurrent calls to createIncidentAndAlert...');

    // 2. Launch 5 simultaneous concurrent calls
    const promises = Array.from({ length: 5 }).map((_, idx) => {
      return createIncidentAndAlert(
        testType,
        testLane,
        `${testReason} (call ${idx + 1})`,
        1200000,
        300000
      );
    });

    const results = await Promise.all(promises);
    console.log('All 5 concurrent calls finished!');

    // 3. Inspect database state
    const createdIncidents = await sql`
      SELECT id, type, status, lane_id, title, created_at 
      FROM incidents 
      WHERE lane_id = ${testLaneId} AND status = 'OPEN'
    `;
    console.log(`Open Incidents Created: ${createdIncidents.length} (Expected: 1)`);
    console.log(JSON.stringify(createdIncidents, null, 2));

    const createdAlerts = await sql`
      SELECT id, type, resource, status, incident_id, created_at 
      FROM alerts 
      WHERE resource = ${testResource} AND status = 'ACTIVE'
    `;
    console.log(`Active Alerts Created: ${createdAlerts.length} (Expected: 1)`);
    console.log(JSON.stringify(createdAlerts, null, 2));

    const createdAudits = await sql`
      SELECT id, action, resource, resource_id, operator_name, details, timestamp 
      FROM audit_logs 
      WHERE resource_id = ${createdIncidents[0]?.id}
    `;
    console.log(`Audit Logs Created: ${createdAudits.length} (Expected: 1)`);
    console.log(JSON.stringify(createdAudits, null, 2));

    // 4. Assertions
    const passed = (
      createdIncidents.length === 1 &&
      createdAlerts.length === 1 &&
      createdAudits.length === 1 &&
      createdAlerts[0].incident_id === createdIncidents[0].id
    );

    console.log('\n=========================================');
    if (passed) {
      console.log('🎉 CONCURRENCY TEST PASSED: Exactly 1 incident, 1 alert, and 1 audit record created!');
    } else {
      console.error('❌ CONCURRENCY TEST FAILED: Duplicate records found!');
      process.exitCode = 1;
    }
    console.log('=========================================\n');

    // 5. Clean up the isolated test records
    console.log('Cleaning up isolated test records...');
    await sql`DELETE FROM audit_logs WHERE resource_id = ${createdIncidents[0].id}`;
    await sql`DELETE FROM alerts WHERE id = ${createdAlerts[0].id}`;
    await sql`DELETE FROM incidents WHERE id = ${createdIncidents[0].id}`;
    console.log('Clean up complete. Database restored to initial state.');

  } catch (err) {
    console.error('Test threw error:', err);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

runConcurrencyTest().catch(console.error);
