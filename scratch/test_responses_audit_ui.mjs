import { spawn } from 'child_process';

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9241;

const edge = spawn(EDGE_PATH, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  '--no-sandbox',
  '--disable-gpu',
  '--disable-extensions',
  '--user-data-dir=C:\\Users\\HP\\.gemini\\antigravity\\brain\\01ded2ec-2489-47eb-96f6-51f20f3c8a7a\\scratch\\edge-profile-resp-aud-clean',
  'http://localhost:3000/responses'
], { stdio: 'ignore' });

async function getWsUrl() {
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 250));
    try {
      const list = await fetch(`http://localhost:${PORT}/json/list`).then(r => r.json());
      const page = list.find(t => t.type === 'page');
      if (page && page.webSocketDebuggerUrl) {
        return page.webSocketDebuggerUrl;
      }
    } catch (e) {}
  }
  throw new Error('CDP target not ready');
}

async function run() {
  try {
    const wsUrl = await getWsUrl();
    const ws = new WebSocket(wsUrl);
    let msgId = 1;

    const call = (method, params = {}) => {
      const id = msgId++;
      return new Promise((resolve) => {
        const handler = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.id === id) {
            ws.removeEventListener('message', handler);
            resolve(msg.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    };

    const networkRequests = [];
    const consoleLogs = [];

    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Network.responseReceived') {
        const url = msg.params.response.url;
        if (url.includes('/api/')) {
          networkRequests.push({ url, status: msg.params.response.status });
        }
      }
      if (msg.method === 'Runtime.consoleAPICalled') {
        consoleLogs.push({
          type: msg.params.type,
          text: msg.params.args?.map(a => a.value || a.description).join(' ')
        });
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        consoleLogs.push({
          type: 'exception',
          text: msg.params.exceptionDetails?.text + ' ' + (msg.params.exceptionDetails?.exception?.description || '')
        });
      }
    });

    await new Promise((resolve) => (ws.onopen = resolve));
    await call('Network.enable');
    await call('Page.enable');
    await call('Runtime.enable');

    // =================== 1. CHECK /responses ===================
    console.log('\n=================== 1. TESTING /responses ===================');
    await call('Page.navigate', { url: 'http://localhost:3000/responses' });
    await new Promise(r => setTimeout(r, 2500));

    const respEval = await call('Runtime.evaluate', {
      expression: `
        (() => {
          const body = document.body.innerText;
          const cards = Array.from(document.querySelectorAll('.p-6.rounded-xl.border')).map(el => el.innerText);
          return {
            title: document.title,
            hasHeader: body.includes('Response Center'),
            hasSafeModeBanner: body.toUpperCase().includes('EXECUTION DISABLED') && body.toUpperCase().includes('SAFE MODE'),
            hasPendingApproval: body.includes('PENDING APPROVAL'),
            hasExecutionDisabled: body.includes('EXECUTION DISABLED'),
            cardCount: cards.length,
            cardsSnippet: cards.map(c => c.slice(0, 150))
          };
        })()
      `,
      returnByValue: true
    });
    console.log('Responses Page Initial Render:', JSON.stringify(respEval.result.value, null, 2));

    // Test clicking EXECUTION DISABLED filter
    console.log('\nTesting EXECUTION DISABLED filter on /responses...');
    await call('Runtime.evaluate', {
      expression: `
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'EXECUTION DISABLED');
        if (btn) btn.click();
      `
    });
    await new Promise(r => setTimeout(r, 2000));

    const execDisabledFilterEval = await call('Runtime.evaluate', {
      expression: `
        (() => {
          const cards = Array.from(document.querySelectorAll('.p-6.rounded-xl.border')).map(el => el.innerText);
          return {
            filteredCount: cards.length,
            allDisabled: cards.every(c => c.includes('EXECUTION DISABLED'))
          };
        })()
      `,
      returnByValue: true
    });
    console.log('Execution Disabled Filter Result:', JSON.stringify(execDisabledFilterEval.result.value, null, 2));

    // Test clicking REJECTED filter (truthful empty state)
    console.log('\nTesting REJECTED filter on /responses (Empty State)...');
    await call('Runtime.evaluate', {
      expression: `
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'REJECTED');
        if (btn) btn.click();
      `
    });
    await new Promise(r => setTimeout(r, 2000));

    const rejectedFilterEval = await call('Runtime.evaluate', {
      expression: `
        (() => {
          const body = document.body.innerText;
          return {
            hasEmptyTitle: body.includes('No response proposals'),
            hasEmptyDesc: body.includes('Response proposals will appear here')
          };
        })()
      `,
      returnByValue: true
    });
    console.log('Rejected Empty State Result:', JSON.stringify(rejectedFilterEval.result.value, null, 2));

    // Reset back to ALL
    await call('Runtime.evaluate', {
      expression: `
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'ALL');
        if (btn) btn.click();
      `
    });
    await new Promise(r => setTimeout(r, 1000));

    // =================== 2. CHECK /audit ===================
    console.log('\n=================== 2. TESTING /audit ===================');
    await call('Page.navigate', { url: 'http://localhost:3000/audit' });
    await new Promise(r => setTimeout(r, 2500));

    const auditEval = await call('Runtime.evaluate', {
      expression: `
        (() => {
          const body = document.body.innerText;
          const rows = Array.from(document.querySelectorAll('.divide-y > div')).map(r => r.innerText);
          return {
            title: document.title,
            hasHeader: body.includes('Security Operations Audit'),
            rowCount: rows.length,
            hasIncidentDetected: body.includes('INCIDENT DETECTED'),
            hasResponseApproved: body.includes('RESPONSE APPROVED'),
            hasIncidentStatusChanged: body.includes('INCIDENT STATUS CHANGED'),
            hasAlertStatusChanged: body.includes('ALERT STATUS CHANGED'),
            hasDetailsRendered: rows.some(r => r.includes('P95 latency') || r.includes('newStatus') || r.includes('Test proposal')),
            firstRowSnippet: rows[0]?.slice(0, 180)
          };
        })()
      `,
      returnByValue: true
    });
    console.log('Audit Page Initial Render:', JSON.stringify(auditEval.result.value, null, 2));

    // Test SearchBar on /audit for "INCIDENT"
    console.log('\nTesting SearchBar for "INCIDENT" on /audit...');
    await call('Runtime.evaluate', {
      expression: `
        const input = document.querySelector('input');
        input.focus();
        document.execCommand('insertText', false, 'INCIDENT');
      `
    });
    await new Promise(r => setTimeout(r, 2000));

    const searchEval = await call('Runtime.evaluate', {
      expression: `
        (() => {
          const rows = Array.from(document.querySelectorAll('.divide-y > div')).map(r => r.innerText);
          return {
            filteredRowCount: rows.length,
            allMatchIncident: rows.every(r => r.includes('INCIDENT'))
          };
        })()
      `,
      returnByValue: true
    });
    console.log('Search "INCIDENT" Result:', JSON.stringify(searchEval.result.value, null, 2));

    // Test SearchBar empty state on /audit
    console.log('\nTesting SearchBar with non-existent query (Empty State)...');
    await call('Runtime.evaluate', {
      expression: `
        const input = document.querySelector('input');
        input.focus();
        input.select();
        document.execCommand('insertText', false, 'xyznonexistent999');
      `
    });
    await new Promise(r => setTimeout(r, 2000));

    const emptySearchEval = await call('Runtime.evaluate', {
      expression: `
        (() => {
          const body = document.body.innerText;
          return {
            hasEmptyTitle: body.includes('Audit Log Empty'),
            hasEmptyDesc: body.includes('No security actions have been performed yet')
          };
        })()
      `,
      returnByValue: true
    });
    console.log('Search Empty State Result:', JSON.stringify(emptySearchEval.result.value, null, 2));

    // =================== 3. SIDEBAR NAVIGATION ===================
    console.log('\n=================== 3. TESTING SIDEBAR NAVIGATION ===================');
    await call('Runtime.evaluate', {
      expression: `
        const respLink = Array.from(document.querySelectorAll('a')).find(a => a.textContent.trim() === 'Responses');
        if (respLink) respLink.click();
      `
    });
    await new Promise(r => setTimeout(r, 1500));

    const nav1 = await call('Runtime.evaluate', {
      expression: `({ url: window.location.href, hasResponseCenter: document.body.innerText.includes('Response Center') })`,
      returnByValue: true
    });
    console.log('Navigated to Responses via Sidebar:', JSON.stringify(nav1.result.value, null, 2));

    await call('Runtime.evaluate', {
      expression: `
        const auditLink = Array.from(document.querySelectorAll('a')).find(a => a.textContent.trim() === 'Audit');
        if (auditLink) auditLink.click();
      `
    });
    await new Promise(r => setTimeout(r, 1500));

    const nav2 = await call('Runtime.evaluate', {
      expression: `({ url: window.location.href, hasAudit: document.body.innerText.includes('Security Operations Audit') })`,
      returnByValue: true
    });
    console.log('Navigated back to Audit via Sidebar:', JSON.stringify(nav2.result.value, null, 2));

    console.log('\n--- Console Logs / Exceptions ---');
    const errorsOnly = consoleLogs.filter(l => l.type === 'error' || l.type === 'exception');
    console.log('Console errors count:', errorsOnly.length);
    if (errorsOnly.length > 0) {
      console.log('Errors:', JSON.stringify(errorsOnly, null, 2));
    } else {
      console.log('Zero console errors found!');
    }

    ws.close();
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    edge.kill();
    process.exit(0);
  }
}

run();
