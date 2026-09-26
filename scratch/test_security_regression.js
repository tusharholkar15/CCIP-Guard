import crypto from 'crypto';
import postgres from '../node_modules/.pnpm/postgres@3.4.9/node_modules/postgres/src/index.js';

const DEFAULT_DEV_SECRET = 'bridgeguard-dev-auth-secret-do-not-use-in-production';

function createOperatorToken(payload, secret = DEFAULT_DEV_SECRET) {
  const json = JSON.stringify(payload);
  const b64Payload = Buffer.from(json, 'utf8').toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(b64Payload).digest('base64url');
  return `${b64Payload}.${signature}`;
}

async function runSecurityRegressionTests() {
  console.log('=== BridgeGuard Security Regression Test Suite ===\n');

  const BASE_URL = 'http://localhost:3001';
  const testResults = [];

  function record(testNum, title, passed, details) {
    testResults.push({ testNum, title, passed, details });
    console.log(`Test ${testNum}: ${title} -> ${passed ? '✅ PASS' : '❌ FAIL'}`);
    if (details) console.log(`   Details: ${details}`);
  }

  // 1. Spoofing x-operator-role: admin without valid authentication does NOT grant admin access
  try {
    const res = await fetch(`${BASE_URL}/api/responses/00000000-0000-0000-0000-000000000000/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-operator-role': 'admin', // Spoofed! No token provided!
        'x-operator-id': 'malicious-user'
      },
      body: '{}'
    });
    const body = await res.json();
    const passed = res.status === 403 && body.error === 'Forbidden' && body.message.includes('Requires role: admin');
    record(1, 'Spoofed x-operator-role: admin rejected with 403', passed, `Status: ${res.status}, Error: ${body.message}`);
  } catch (err) {
    record(1, 'Spoofed x-operator-role: admin rejected with 403', false, err.message);
  }

  // 2. Viewer cannot approve
  try {
    const res = await fetch(`${BASE_URL}/api/responses/00000000-0000-0000-0000-000000000000/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // No headers at all -> defaults to viewer
      },
      body: '{}'
    });
    const body = await res.json();
    const passed = res.status === 403 && body.error === 'Forbidden';
    record(2, 'Viewer cannot approve responses', passed, `Status: ${res.status}`);
  } catch (err) {
    record(2, 'Viewer cannot approve responses', false, err.message);
  }

  // 3. Operator cannot approve
  try {
    const operatorToken = createOperatorToken({
      operatorId: 'soc-op-1',
      operatorName: 'SOC Analyst',
      role: 'operator'
    });

    const res = await fetch(`${BASE_URL}/api/responses/00000000-0000-0000-0000-000000000000/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${operatorToken}`
      },
      body: '{}'
    });
    const body = await res.json();
    const passed = res.status === 403 && body.error === 'Forbidden' && body.message.includes('Requires role: admin');
    record(3, 'Operator cannot approve responses (admin-only)', passed, `Status: ${res.status}, Message: ${body.message}`);
  } catch (err) {
    record(3, 'Operator cannot approve responses (admin-only)', false, err.message);
  }

  // 4. Admin can approve after valid authentication (passes role check, reaches entity check)
  try {
    const adminToken = createOperatorToken({
      operatorId: 'admin-1',
      operatorName: 'SecOps Admin',
      role: 'admin'
    });

    const res = await fetch(`${BASE_URL}/api/responses/00000000-0000-0000-0000-000000000000/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: '{}'
    });
    const body = await res.json();
    // 404 means the role check PASSED and it proceeded to query the database for the proposal!
    const passed = res.status === 404 && body.message === 'Response proposal not found';
    record(4, 'Admin passes role check after valid authentication', passed, `Status: ${res.status} (404 confirms role check succeeded)`);
  } catch (err) {
    record(4, 'Admin passes role check after valid authentication', false, err.message);
  }

  // 5. Frontend defaults to viewer when no authenticated operator exists
  try {
    // Read api.ts source code to verify default role
    const fs = await import('fs');
    const apiCode = fs.readFileSync('apps/web/src/lib/api.ts', 'utf8');
    const hasAdminDefault = apiCode.includes("|| 'admin'");
    const hasViewerDefault = apiCode.includes("|| 'viewer'");
    const passed = !hasAdminDefault && hasViewerDefault;
    record(5, 'Frontend defaults to viewer in api.ts', passed, `Has admin default: ${hasAdminDefault}, Has viewer default: ${hasViewerDefault}`);
  } catch (err) {
    record(5, 'Frontend defaults to viewer in api.ts', false, err.message);
  }

  // 6. Response execution remains DISABLED
  try {
    const adminToken = createOperatorToken({
      operatorId: 'admin-audit',
      operatorName: 'Security Auditor',
      role: 'admin'
    });

    // Create a new proposal
    const createRes = await fetch(`${BASE_URL}/api/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        type: 'PAUSE_APPLICATION_ROUTE',
        target: 'lane-safety-check',
        reason: 'Automated security test for DISABLED execution mode'
      })
    });
    const proposal = await createRes.json();
    const isExecutionDisabled = proposal.executionMode === 'DISABLED' && proposal.status === 'PENDING_APPROVAL';

    // Now approve it
    const approveRes = await fetch(`${BASE_URL}/api/responses/${proposal.id}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: '{}'
    });
    const approvedProposal = await approveRes.json();
    const isApprovedExecutionDisabled = approvedProposal.status === 'EXECUTION_DISABLED' && approvedProposal.executionMode === 'DISABLED';

    // Clean up test proposal
    const sql = postgres('postgresql://bridgeguard:bridgeguard@localhost:5433/bridgeguard');
    await sql`DELETE FROM audit_logs WHERE resource_id = ${proposal.id}`;
    await sql`DELETE FROM response_proposals WHERE id = ${proposal.id}::uuid`;
    await sql.end();

    const passed = isExecutionDisabled && isApprovedExecutionDisabled;
    record(6, 'Response execution mode strictly DISABLED upon creation and approval', passed, `Initial mode: ${proposal.executionMode}, Approved status: ${approvedProposal.status}`);
  } catch (err) {
    record(6, 'Response execution mode strictly DISABLED upon creation and approval', false, err.message);
  }

  // 7. No private key / signing path is introduced
  try {
    const fs = await import('fs');
    const authCode = fs.readFileSync('apps/api/src/middleware/auth.ts', 'utf8');
    const respCode = fs.readFileSync('apps/api/src/routes/responses.ts', 'utf8');
    const hasPrivateKey = authCode.includes('privateKey') || respCode.includes('privateKey') || authCode.includes('ethers.Wallet') || respCode.includes('ethers.Wallet');
    const passed = !hasPrivateKey;
    record(7, 'No private key or blockchain signing path introduced', passed, `Has privateKey in auth/responses: ${hasPrivateKey}`);
  } catch (err) {
    record(7, 'No private key or blockchain signing path introduced', false, err.message);
  }

  console.log('\n=== Summary: ' + testResults.filter(t => t.passed).length + '/' + testResults.length + ' Tests Passed ===');
}

runSecurityRegressionTests().catch(console.error);
