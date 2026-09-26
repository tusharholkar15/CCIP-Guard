import { spawn } from 'child_process';

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9240;

const edge = spawn(EDGE_PATH, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  '--no-sandbox',
  '--disable-gpu',
  'http://localhost:3000/audit'
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

  await call('Runtime.evaluate', {
    expression: `
      const input = document.querySelector('input');
      input.focus();
      document.execCommand('insertText', false, 'xyznonexistent999');
    `
  });
  await new Promise(r => setTimeout(r, 2500));

  const res = await call('Runtime.evaluate', {
    expression: `({ inputValue: document.querySelector('input').value, body: document.body.innerText })`,
    returnByValue: true
  });
  console.log('INPUT VALUE:', res.result.value.inputValue);
  console.log('BODY CONTAINS "Audit Log Empty"?', res.result.value.body.includes('Audit Log Empty'));
  console.log('BODY SNIPPET:\n', res.result.value.body);

  ws.close();
  edge.kill();
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  edge.kill();
  process.exit(1);
});
