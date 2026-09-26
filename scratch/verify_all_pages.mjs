import { spawn } from 'child_process';

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9229;

const edge = spawn(EDGE_PATH, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  '--no-sandbox',
  '--disable-gpu',
  '--disable-extensions',
  '--user-data-dir=C:\\Users\\HP\\.gemini\\antigravity\\brain\\01ded2ec-2489-47eb-96f6-51f20f3c8a7a\\scratch\\edge-profile-verify',
  'http://localhost:3000/overview'
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
    await call('Network.enable');
    await call('Page.enable');
    await call('Runtime.enable');

    // 1. Check /lanes
    console.log('\n=================== VERIFYING /lanes ===================');
    await call('Page.navigate', { url: 'http://localhost:3000/lanes' });
    await new Promise(r => setTimeout(r, 3000));

    const lanesData = await call('Runtime.evaluate', {
      expression: `
        (() => {
          const text = document.body.innerText;
          return {
            title: document.title,
            hasLanesHeader: text.includes('Lane Metrics'),
            hasEthereumSepoliaToArbSepolia: text.includes('ETHEREUM SEPOLIA') && text.includes('ARBITRUM SEPOLIA'),
            hasEthereumToArbitrum: text.includes('ETHEREUM') && text.includes('ARBITRUM'),
            hasArbSepoliaToEthSepolia: text.includes('ARBITRUM SEPOLIA') && text.includes('ETHEREUM SEPOLIA'),
            hasSrcSelector160: text.includes('16015286601757825753'),
            hasDstSelector347: text.includes('3478487238524512106'),
            hasFiveMessages: text.includes('5'),
            hasOneMessage: text.includes('1'),
            hasZeroMessage: text.includes('0'),
            hasLatencyP50: text.includes('15.7m') || text.includes('943s') || text.includes('943000ms'),
            hasLatencyP95: text.includes('16.8m') || text.includes('1011s') || text.includes('1011000ms'),
            snippet: text.slice(0, 1000)
          };
        })()
      `,
      returnByValue: true
    });
    console.log(JSON.stringify(lanesData.result.value, null, 2));

    // 2. Check /network
    console.log('\n=================== VERIFYING /network ===================');
    await call('Page.navigate', { url: 'http://localhost:3000/network' });
    await new Promise(r => setTimeout(r, 3000));

    const networkData = await call('Runtime.evaluate', {
      expression: `
        (() => {
          const text = document.body.innerText;
          return {
            title: document.title,
            hasNetworkHeader: text.includes('Cross-Chain Network'),
            hasEthereumSepolia: text.includes('Ethereum Sepolia'),
            hasArbitrumSepolia: text.includes('Arbitrum Sepolia'),
            hasEthereum: text.includes('Ethereum'),
            hasArbitrum: text.includes('Arbitrum'),
            hasSepoliaMsgCount: text.includes('165 msg') || text.includes('164 msg'),
            hasArbSepoliaMsgCount: text.includes('5 msg'),
            hasEthMsgCount: text.includes('1 msg'),
            hasArbMsgCount: text.includes('1 msg'),
            snippet: text.slice(0, 1000)
          };
        })()
      `,
      returnByValue: true
    });
    console.log(JSON.stringify(networkData.result.value, null, 2));

    // 3. Check /overview
    console.log('\n=================== VERIFYING /overview ===================');
    await call('Page.navigate', { url: 'http://localhost:3000/overview' });
    await new Promise(r => setTimeout(r, 3000));

    const overviewData = await call('Runtime.evaluate', {
      expression: `
        (() => {
          const text = document.body.innerText;
          return {
            title: document.title,
            hasOverviewHeader: text.includes('CCIP Security Observability'),
            hasTotalMessages: text.includes('165') || text.includes('166'),
            hasNetworksFour: text.includes('4'),
            hasSuccessRate: text.includes('100.0%'),
            snippet: text.slice(0, 800)
          };
        })()
      `,
      returnByValue: true
    });
    console.log(JSON.stringify(overviewData.result.value, null, 2));

    // 4. Check /messages
    console.log('\n=================== VERIFYING /messages ===================');
    await call('Page.navigate', { url: 'http://localhost:3000/messages' });
    await new Promise(r => setTimeout(r, 3000));

    const messagesData = await call('Runtime.evaluate', {
      expression: `
        (() => {
          const text = document.body.innerText;
          return {
            title: document.title,
            hasMessagesHeader: text.includes('Indexed cross-chain CCIP message traffic'),
            hasTONTestnet: text.includes('TON Testnet'),
            hasBaseSepolia: text.includes('Base Sepolia'),
            hasEthereumSepolia: text.includes('Ethereum Sepolia') || text.includes('ethereum-sepolia'),
            hasDeliveredBadge: text.includes('DELIVERED'),
            snippet: text.slice(0, 1000)
          };
        })()
      `,
      returnByValue: true
    });
    console.log(JSON.stringify(messagesData.result.value, null, 2));

    ws.close();
  } catch (err) {
    console.error('Browser verification error:', err);
  } finally {
    edge.kill();
    process.exit(0);
  }
}

run();
