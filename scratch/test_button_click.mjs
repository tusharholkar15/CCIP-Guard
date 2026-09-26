import { spawn } from 'child_process';

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9235;

const edge = spawn(EDGE_PATH, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  '--no-sandbox',
  '--disable-gpu',
  'http://localhost:3000/responses'
], { stdio: 'ignore' });

async function run() {
  await new Promise(r => setTimeout(r, 2000));
  const list = await fetch(`http://localhost:${PORT}/json/list`).then(r => r.json());
  const wsUrl = list.find(t => t.type === 'page').webSocketDebuggerUrl;
  const ws = new WebSocket(wsUrl);

  let msgId = 1;
  const call = (method, params = {}) => new Promise(res => {
    const id = msgId++;
    const h = (e) => {
      const m = JSON.parse(e.data);
      if (m.id === id) { ws.removeEventListener('message', h); res(m.result); }
    };
    ws.addEventListener('message', h);
    ws.send(JSON.stringify({ id, method, params }));
  });

  await new Promise(r => (ws.onopen = r));
  await new Promise(r => setTimeout(r, 2000));

  const buttons = await call('Runtime.evaluate', {
    expression: `Array.from(document.querySelectorAll('button')).map((b, i) => ({ i, text: b.textContent.trim() }))`,
    returnByValue: true
  });
  console.log('All buttons found:', buttons.result.value);

  // Click the button with text REJECTED
  console.log('Clicking REJECTED...');
  await call('Runtime.evaluate', {
    expression: `
      const b = Array.from(document.querySelectorAll('button')).find(x => x.textContent.trim() === 'REJECTED');
      console.log('Found button:', b ? b.outerHTML : 'NOT FOUND');
      if (b) b.click();
    `
  });

  await new Promise(r => setTimeout(r, 3000));

  const bodyText = await call('Runtime.evaluate', {
    expression: `document.body.innerText`,
    returnByValue: true
  });
  console.log('Body text includes "No response proposals"?', bodyText.result.value.includes('No response proposals'));

  ws.close();
  edge.kill();
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  edge.kill();
  process.exit(1);
});
