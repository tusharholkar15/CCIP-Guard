import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import WebSocket from 'ws';
import { publishEvent, CHANNELS } from '@bridgeguard/redis';

async function testWebSocket() {
  console.log('Connecting to WebSocket at ws://localhost:3001/ws ...');
  const ws = new WebSocket('ws://localhost:3001/ws');

  const receivedMessages: any[] = [];

  await new Promise<void>((resolve, reject) => {
    ws.on('open', () => {
      console.log('WebSocket connection opened successfully!');
      resolve();
    });
    ws.on('error', reject);
  });

  ws.on('message', (data: Buffer) => {
    const parsed = JSON.parse(data.toString());
    console.log('RECEIVED WS MESSAGE:', JSON.stringify(parsed, null, 2));
    receivedMessages.push(parsed);
  });

  // Wait 500ms for initial connection message
  await new Promise((r) => setTimeout(r, 500));

  console.log('Emitting real CCIP event update through Redis channel for message 0x9d97b7bcdede219b24587b6d8adac5f5d92f2b2f41b75bf42099d5ecde7d93e8 ...');
  
  // Real persisted event data
  const realEventPayload = {
    messageId: '0x9d97b7bcdede219b24587b6d8adac5f5d92f2b2f41b75bf42099d5ecde7d93e8',
    sourceTxHash: '0xf23bfa9fd2eefb472341333f69eddd53f48fee8b0af5eeb9a3a428af9455e348',
    sourceBlockNumber: 508697822,
    sourceChainId: 42161,
    destinationChainId: 1,
    state: 'SENT',
    timestamp: new Date().toISOString()
  };

  await publishEvent(CHANNELS.MESSAGE_UPDATED, realEventPayload);

  // Wait 1 second to receive message over WS
  await new Promise((r) => setTimeout(r, 1000));

  ws.close();

  const foundEvent = receivedMessages.find(m => m.type === 'message:update' && m.data?.messageId === '0x9d97b7bcdede219b24587b6d8adac5f5d92f2b2f41b75bf42099d5ecde7d93e8');

  if (foundEvent) {
    console.log('SUCCESS: WebSocket successfully received live CCIP event update matching real mainnet message!');
  } else {
    console.error('FAILURE: WebSocket did not receive expected event. Received:', receivedMessages);
    process.exit(1);
  }
}

testWebSocket().catch(err => {
  console.error(err);
  process.exit(1);
});
