async function resolveDuplicate() {
  const incidentId = 'd2603b3b-27ea-4996-b172-861577db28ea';
  const alertId = '2eeca5c8-72f3-4081-910f-fe5db71d149a';

  console.log('Resolving duplicate incident via API...');
  const incRes = await fetch(`http://localhost:3001/api/incidents/${incidentId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer bg-dev-admin-token',
      'x-operator-id': 'op-security-lead',
      'x-operator-name': 'Lead SOC Engineer'
    },
    body: JSON.stringify({ status: 'RESOLVED' })
  });
  console.log('Incident PATCH response status:', incRes.status);
  const incData = await incRes.json();
  console.log('Incident data:', incData);

  console.log('Resolving duplicate alert via API...');
  const alertRes = await fetch(`http://localhost:3001/api/alerts/${alertId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer bg-dev-admin-token',
      'x-operator-id': 'op-security-lead',
      'x-operator-name': 'Lead SOC Engineer'
    },
    body: JSON.stringify({ status: 'RESOLVED' })
  });
  console.log('Alert PATCH response status:', alertRes.status);
  const alertData = await alertRes.json();
  console.log('Alert data:', alertData);

  // Check stats and audit log
  console.log('Checking updated dashboard stats...');
  const statsRes = await fetch('http://localhost:3001/api/dashboard/stats');
  const stats = await statsRes.json();
  console.log('New Dashboard Stats:', stats);

  console.log('Checking new audit logs...');
  const auditRes = await fetch('http://localhost:3001/api/audit?page=1&pageSize=4');
  const audit = await auditRes.json();
  console.log('Latest Audit Logs:', audit.data.slice(0, 3));
}

resolveDuplicate().catch(console.error);
