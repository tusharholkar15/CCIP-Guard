import { spawn } from 'child_process';

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9232;

const edge = spawn(EDGE_PATH, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  '--no-sandbox',
  '--disable-gpu',
  '--disable-extensions',
  '--user-data-dir=C:\\Users\\HP\\.gemini\\antigravity\\brain\\01ded2ec-2489-47eb-96f6-51f20f3c8a7a\\scratch\\edge-profile-debug-inc-2',
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

    const logs = [];

    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Runtime.consoleAPICalled') {
        logs.push({
          type: msg.params.type,
          text: msg.params.args?.map(a => a.value || a.description).join(' ')
        });
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        logs.push({
          type: 'exception',
          text: msg.params.exceptionDetails?.text + ' ' + (msg.params.exceptionDetails?.exception?.description || '')
        });
      }
    });

    await new Promise((resolve) => (ws.onopen = resolve));
    await call('Runtime.enable');
    await call('Page.enable');

    console.log('Navigating to http://localhost:3000/incidents...');
    await call('Page.navigate', { url: 'http://localhost:3000/incidents' });
    await new Promise(r => setTimeout(r, 4000));

    console.log('LOGS:');
    console.log(JSON.stringify(logs, null, 2));

    const state = await call('Runtime.evaluate', {
      expression: `
        (() => {
          const main = document.querySelector('main');
          return {
            mainInnerHtml: main ? main.innerHTML : 'no main',
          };
        })()
      `,
      returnByValue: true
    });
    console.log('MAIN INNER HTML:');
    console.log(state.result.value);

    ws.close();
  } catch (err) {
    console.error(err);
  } finally {
    edge.kill();
    process.exit(0);
  }
}

run();
