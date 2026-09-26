import { spawn } from 'child_process';

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9230;

const edge = spawn(EDGE_PATH, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  '--no-sandbox',
  '--disable-gpu',
  '--disable-extensions',
  '--user-data-dir=C:\\Users\\HP\\.gemini\\antigravity\\brain\\01ded2ec-2489-47eb-96f6-51f20f3c8a7a\\scratch\\edge-profile-inc-alt',
  'http://localhost:3000/incidents'
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

    // 1. Check /incidents
    console.log('\n=================== TESTING /incidents ===================');
    await call('Page.navigate', { url: 'http://localhost:3000/incidents' });
    await new Promise(r => setTimeout(r, 3000));

    const incEval = await call('Runtime.evaluate', {
      expression: `
        (() => {
          const body = document.body.innerText;
          const cards = Array.from(document.querySelectorAll('.group.relative.overflow-hidden')).map(el => el.innerText);
          return {
            title: document.title,
            hasHeader: body.includes('Security Incidents'),
            hasHighLatency: body.includes('HIGH LATENCY'),
            hasOpenStatus: body.includes('OPEN'),
            hasInvestigatingStatus: body.includes('INVESTIGATING'),
            hasThresholdReason: body.includes('P95 latency 1011000ms exceeds threshold 300000ms'),
            hasManualTrigger: body.includes('Manual trigger'),
            cardCount: cards.length,
            cardsSnippet: cards.map(c => c.slice(0, 150))
          };
        })()
      `,
      returnByValue: true
    });
    console.log('Incidents Evaluation:', JSON.stringify(incEval.result.value, null, 2));

    // Test filter buttons on /incidents
    console.log('Testing OPEN filter on /incidents...');
    await call('Runtime.evaluate', {
      expression: `
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'OPEN');
        if (btn) btn.click();
      `
    });
    await new Promise(r => setTimeout(r, 1500));

    const openFilterEval = await call('Runtime.evaluate', {
      expression: `
        (() => {
          const cards = Array.from(document.querySelectorAll('.group.relative.overflow-hidden')).map(el => el.innerText);
          return {
            openCardCount: cards.length,
            hasInvestigating: cards.some(c => c.includes('INVESTIGATING')),
            allOpen: cards.every(c => c.includes('OPEN'))
          };
        })()
      `,
      returnByValue: true
    });
    console.log('Open Filter Evaluation:', JSON.stringify(openFilterEval.result.value, null, 2));

    // 2. Check /alerts
    console.log('\n=================== TESTING /alerts ===================');
    await call('Page.navigate', { url: 'http://localhost:3000/alerts' });
    await new Promise(r => setTimeout(r, 3000));

    const altEval = await call('Runtime.evaluate', {
      expression: `
        (() => {
          const body = document.body.innerText;
          const rows = Array.from(document.querySelectorAll('tbody tr')).map(r => r.innerText);
          return {
            title: document.title,
            hasHeader: body.includes('Alert Feed'),
            hasHighLatency: body.includes('HIGH LATENCY'),
            hasLatencySpike: body.includes('LATENCY SPIKE'),
            hasActive: body.includes('ACTIVE'),
            hasSepoliaResource: body.includes('Ethereum Sepolia → Arbitrum Sepolia'),
            has300000: body.includes('300000'),
            has1011000: body.includes('1011000'),
            hasSpike2500: body.includes('2500'),
            rowCount: rows.length,
            rowsSnippet: rows
          };
        })()
      `,
      returnByValue: true
    });
    console.log('Alerts Evaluation:', JSON.stringify(altEval.result.value, null, 2));

    // Test client navigation between alerts and incidents via sidebar
    console.log('Testing sidebar navigation to Incidents...');
    await call('Runtime.evaluate', {
      expression: `
        const incLink = Array.from(document.querySelectorAll('a')).find(a => a.textContent.trim() === 'Incidents');
        if (incLink) incLink.click();
      `
    });
    await new Promise(r => setTimeout(r, 2000));

    const navEval = await call('Runtime.evaluate', {
      expression: `({ url: window.location.href, hasIncidents: document.body.innerText.includes('Security Incidents') })`,
      returnByValue: true
    });
    console.log('Navigation Result:', JSON.stringify(navEval.result.value, null, 2));

    console.log('\n--- API Network Requests ---');
    console.log(JSON.stringify(networkRequests, null, 2));

    console.log('\n--- Console Logs / Errors ---');
    console.log(JSON.stringify(consoleLogs, null, 2));

    ws.close();
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    edge.kill();
    process.exit(0);
  }
}

run();
