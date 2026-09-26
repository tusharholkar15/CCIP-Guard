import postgres from '../node_modules/.pnpm/postgres@3.4.9/node_modules/postgres/src/index.js';

async function checkIncidents() {
  const sql = postgres('postgresql://bridgeguard:bridgeguard@localhost:5433/bridgeguard');
  const incs = await sql`
    SELECT id, type, severity, status, title, description, lane_id, 
           source_chain_name, destination_chain_name, detection_reason, 
           created_at, updated_at
    FROM incidents
    ORDER BY created_at ASC
  `;
  console.log('All Incidents in DB:');
  console.log(JSON.stringify(incs, null, 2));

  const alerts = await sql`
    SELECT id, type, resource, status, incident_id, created_at, updated_at
    FROM alerts
    ORDER BY created_at ASC
  `;
  console.log('All Alerts in DB:');
  console.log(JSON.stringify(alerts, null, 2));

  const audit = await sql`
    SELECT id, action, resource, resource_id, operator_id, operator_name, details, timestamp
    FROM audit_logs
    WHERE resource_id IN (${incs[1].id}, ${incs[2].id})
  `;
  console.log('Audit logs for the two duplicate incidents:');
  console.log(JSON.stringify(audit, null, 2));

  await sql.end();
}

checkIncidents();
