import { spawn } from 'child_process';

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9231;

const edge = spawn(EDGE_PATH, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  '--no-sandbox',
  '--disable-gpu',
  '--disable-extensions',
  '--user-data-dir=C:\\Users\\HP\\.gemini\\antigravity\\brain\\01ded2ec-2489-47eb-96f6-51f20f3c8a7a\\scratch\\edge-profile-debug-inc',
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

    await new Promise((resolve) => (ws.onopen = resolve));
    await call('Page.enable');
    await call('Runtime.enable');

    console.log('Navigating to http://localhost:3000/incidents...');
    await call('Page.navigate', { url: 'http://localhost:3000/incidents' });
    await new Promise(r => setTimeout(r, 4000));

    const html = await call('Runtime.evaluate', {
      expression: `document.body.innerText`,
      returnByValue: true
    });
    console.log('BODY INNER TEXT:');
    console.log(html.result.value);

    // Let's test fetch directly from inside browser context
    const testFetch = await call('Runtime.evaluate', {
      expression: `
        fetch('http://localhost:3001/api/incidents')
          .then(r => r.json())
          .then(d => JSON.stringify(d))
          .catch(e => 'FETCH ERROR: ' + e.message)
      `,
      awaitPromise: true,
      returnByValue: true
    });
    console.log('BROWSER IN-PAGE FETCH RESULT:');
    console.log(testFetch.result.value);

    ws.close();
  } catch (err) {
    console.error(err);
  } finally {
    edge.kill();
    process.exit(0);
  }
}

run();
