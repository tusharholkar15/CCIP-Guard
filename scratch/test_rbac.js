async function testRbac() {
  const proposalId = '004495e5-dc57-4f35-9653-bf05cb05b38b'; // PENDING_APPROVAL proposal

  // Test 1: No role header (defaults to viewer)
  const resViewer = await fetch(`http://localhost:3001/api/responses/${proposalId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  });
  console.log('Test 1 (Viewer / No Header):', resViewer.status, await resViewer.json());

  // Test 2: Operator role header (insufficient for approve)
  const resOperator = await fetch(`http://localhost:3001/api/responses/${proposalId}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-operator-role': 'operator',
      'x-operator-id': 'op-123'
    },
    body: '{}'
  });
  console.log('Test 2 (Operator role):', resOperator.status, await resOperator.json());

  // Test 3: Admin role header check (without actually approving if we want to preserve state)
  // Let's test on a fake non-existent ID so it passes auth and fails on 404 (proving role passed!)
  const resAdmin = await fetch(`http://localhost:3001/api/responses/00000000-0000-0000-0000-000000000000/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-operator-role': 'admin',
      'x-operator-id': 'admin-123'
    },
    body: '{}'
  });
  console.log('Test 3 (Admin on non-existent proposal):', resAdmin.status, await resAdmin.json());
}

testRbac();
