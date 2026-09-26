import { spawn } from 'child_process';
import WebSocket from '../node_modules/.pnpm/ws@8.21.3/node_modules/ws/index.js';

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9222;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runBrowserAudit() {
  console.log('=== Starting Real Headless Edge CDP Audit ===');

  // 1. Launch Edge with remote debugging
  const edge = spawn(EDGE_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank'
  ]);

  await sleep(2000);

  try {
    // 2. Get WebSocket debugger URL
    const verRes = await fetch(`http://localhost:${PORT}/json/version`);
    const verData = await verRes.json();
    console.log('[Browser] Connected to:', verData.Browser);

    const listRes = await fetch(`http://localhost:${PORT}/json/list`);
    const listData = await listRes.json();
    const target = listData.find(t => t.type === 'page');
    if (!target) throw new Error('No page target found');

    const ws = new WebSocket(target.webSocketDebuggerUrl);

    let messageId = 1;
    const callbacks = new Map();

    ws.on('message', data => {
      const msg = JSON.parse(data);
      if (msg.id && callbacks.has(msg.id)) {
        callbacks.get(msg.id)(msg);
        callbacks.delete(msg.id);
      }
    });

    await new Promise(resolve => ws.on('open', resolve));

    function sendCommand(method, params = {}) {
      return new Promise(resolve => {
        const id = messageId++;
        callbacks.set(id, resolve);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await sendCommand('Page.enable');
    await sendCommand('Runtime.enable');

    const pages = [
      { path: '/overview', checkText: 'BridgeGuard', name: 'Overview' },
      { path: '/network', checkText: 'Network', name: 'Network' },
      { path: '/messages', checkText: 'Messages', name: 'Messages' },
      { path: '/lanes', checkText: 'Lanes', name: 'Lanes' },
      { path: '/incidents', checkText: 'Incidents', name: 'Incidents' },
      { path: '/alerts', checkText: 'Alerts', name: 'Alerts' },
      { path: '/responses', checkText: 'Responses', name: 'Responses' },
      { path: '/audit', checkText: 'Audit', name: 'Audit' }
    ];

    const results = {};

    for (const p of pages) {
      console.log(`[Testing] Navigating to ${p.path}...`);
      await sendCommand('Page.navigate', { url: `http://localhost:3000${p.path}` });
      await sleep(3000); // Give React Query time to fetch data and hydrate

      // Evaluate page content and errors
      const evalRes = await sendCommand('Runtime.evaluate', {
        expression: `
          (() => {
            const text = document.body.innerText;
            const hasError = text.includes('Application error') || text.includes('Unhandled Runtime Error');
            const h1 = document.querySelector('h1')?.innerText || '';
            const tables = document.querySelectorAll('table').length;
            const buttons = document.querySelectorAll('button').length;
            return {
              title: document.title,
              h1,
              hasError,
              textLength: text.length,
              tables,
              buttons,
              snippet: text.substring(0, 300).replace(/\\n+/g, ' ')
            };
          })()
        `,
        returnByValue: true
      });

      const res = evalRes?.result?.result?.value || {};
      results[p.name] = {
        path: p.path,
        renderedTitle: res.title,
        hasError: res.hasError,
        textLength: res.textLength,
        tablesCount: res.tables,
        buttonsCount: res.buttons,
        snippet: res.snippet
      };

      console.log(`  -> ${p.name}: OK (Length: ${res.textLength}, Errors: ${res.hasError})`);
    }

    console.log('\n=== Headless Browser Audit Summary ===');
    console.log(JSON.stringify(results, null, 2));

    ws.close();
  } catch (err) {
    console.error('CDP Audit Error:', err);
  } finally {
    edge.kill();
  }
}

runBrowserAudit();
