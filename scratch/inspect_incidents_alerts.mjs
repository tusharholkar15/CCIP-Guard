import postgres from '../packages/database/node_modules/postgres/src/index.js';

const sql = postgres('postgresql://bridgeguard:bridgeguard@localhost:5433/bridgeguard');

async function run() {
  console.log('=== INCIDENTS IN DB ===');
  const incs = await sql`SELECT * FROM incidents ORDER BY detected_at DESC`;
  console.log(`Total incidents: ${incs.length}`);
  console.table(incs.map(i => ({
    id: i.id,
    type: i.type,
    severity: i.severity,
    status: i.status,
    title: i.title,
    laneId: i.lane_id,
    detectedAt: i.detected_at,
    reason: i.detection_reason,
    relatedMsgsCount: i.related_message_ids?.length
  })));

  console.log('\n=== ALERTS IN DB ===');
  const alts = await sql`SELECT * FROM alerts ORDER BY created_at DESC`;
  console.log(`Total alerts: ${alts.length}`);
  console.table(alts.map(a => ({
    id: a.id,
    type: a.type,
    resource: a.resource,
    threshold: a.threshold,
    observedValue: a.observed_value,
    status: a.status,
    message: a.message,
    incidentId: a.incident_id,
    createdAt: a.created_at
  })));

  await sql.end();
}

run().catch(console.error);
