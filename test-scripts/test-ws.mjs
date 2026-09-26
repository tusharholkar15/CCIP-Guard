import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:3001/ws');

ws.on('open', () => {
  console.log('Connected to WebSocket server');
});

ws.on('message', (data) => {
  const msg = data.toString();
  console.log('Received:', msg);
  if (!msg.includes('connection')) {
    process.exit(0);
  }
});

ws.on('error', (err) => {
  console.error('WS Error:', err);
  process.exit(1);
});

setTimeout(() => {
  console.log('Timeout waiting for event');
  process.exit(1);
}, 30000);
