import * as dotenv from 'dotenv';
import path from 'path';
import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import postgres from '../node_modules/.pnpm/postgres@3.4.9/node_modules/postgres/src/index.js';

dotenv.config({ path: path.resolve('./.env') });

async function checkSender() {
  const sql = postgres('postgresql://bridgeguard:bridgeguard@localhost:5433/bridgeguard');
  const sender = '0x59bEC67e4C7F61a4BaDd7D3A9c1B1aab55AC33DA';

  const rows = await sql`
    SELECT id, ccip_message_id, source_tx_hash, source_block_number, created_at
    FROM messages 
    WHERE lower(sender) = lower(${sender})
    ORDER BY source_block_number DESC
  `;
  console.log('Messages from known sender in DB:', rows);

  // Now query Etherscan or public RPC for transactions sent by sender
  // Etherscan V2 API or publicnode block search
  const rpcUrl = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
  const client = createPublicClient({ chain: sepolia, transport: http(rpcUrl) });

  const latestBlock = await client.getBlockNumber();
  console.log('Latest block:', latestBlock.toString());

  // Check the known source tx hash from before: 0xa9dc7065c901f300299004c1bb07578aba2e378a367b52066efa25acee53dca5
  const prevTx = await client.getTransaction({ hash: '0xa9dc7065c901f300299004c1bb07578aba2e378a367b52066efa25acee53dca5' });
  console.log('Previous known TX nonce:', prevTx.nonce, 'block:', prevTx.blockNumber.toString());

  console.log(`Sender nonce is now 4. Previous tx nonce was ${prevTx.nonce}.`);
  console.log(`That means there are transactions with nonces between ${prevTx.nonce + 1} and 3!`);

  // Let's check blocks around recent blocks or scan Router contract!
  // Router is 0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59
  // The router emits CCIPSendRequested!
  console.log('\nChecking Router CCIPSendRequested events...');
  const routerAddress = '0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59';
  
  // CCIPSendRequested topic
  // CCIPSendRequested(bytes32 indexed messageId) or similar
  const routerLogs = await client.getLogs({
    address: routerAddress,
    fromBlock: latestBlock - 2000n,
    toBlock: latestBlock
  });
  console.log(`Router logs in last 2000 blocks (${latestBlock - 2000n} to ${latestBlock}): ${routerLogs.length}`);
  for (const l of routerLogs) {
    console.log({
      block: l.blockNumber.toString(),
      txHash: l.transactionHash,
      topics: l.topics
    });
  }

  // Also check OnRamp logs in the last 2000 blocks!
  const onRampAddress = '0x8dcf17f298c881A547D91ca4aA3C2AD7568C6777';
  const onRampLogs = await client.getLogs({
    address: onRampAddress,
    fromBlock: latestBlock - 2000n,
    toBlock: latestBlock
  });
  console.log(`\nOnRamp logs in last 2000 blocks: ${onRampLogs.length}`);
  for (const l of onRampLogs) {
    console.log({
      block: l.blockNumber.toString(),
      txHash: l.transactionHash,
      topics: l.topics
    });
  }

  await sql.end();
}

checkSender().catch(console.error);
