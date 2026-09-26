import { spawn } from 'child_process';

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9238;

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

  console.log('Testing search "INCIDENT" via execCommand...');
  await call('Runtime.evaluate', {
    expression: `
      const input = document.querySelector('input');
      input.focus();
      input.select();
      document.execCommand('insertText', false, 'INCIDENT');
    `
  });
  await new Promise(r => setTimeout(r, 2500));

  const searchRes = await call('Runtime.evaluate', {
    expression: `
      (() => {
        const rows = Array.from(document.querySelectorAll('.divide-y > div')).map(r => r.innerText);
        return {
          count: rows.length,
          allIncludeIncident: rows.every(r => r.includes('INCIDENT'))
        };
      })()
    `,
    returnByValue: true
  });
  console.log('Search "INCIDENT" result:', searchRes.result.value);

  console.log('Testing search "xyznonexistent999" via execCommand...');
  await call('Runtime.evaluate', {
    expression: `
      const input = document.querySelector('input');
      input.focus();
      input.select();
      document.execCommand('insertText', false, 'xyznonexistent999');
    `
  });
  await new Promise(r => setTimeout(r, 2500));

  const emptyRes = await call('Runtime.evaluate', {
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
  console.log('Search empty state result:', emptyRes.result.value);

  ws.close();
  edge.kill();
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  edge.kill();
  process.exit(1);
});
