import * as dotenv from 'dotenv';
import path from 'path';
import { createPublicClient, http, parseAbiItem } from 'viem';
import { sepolia } from 'viem/chains';
import postgres from '../node_modules/.pnpm/postgres@3.4.9/node_modules/postgres/src/index.js';

dotenv.config({ path: path.resolve('./.env') });

async function findLatest() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
  console.log('Connecting to Sepolia RPC:', rpcUrl);

  const client = createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl),
  });

  const latestBlock = await client.getBlockNumber();
  console.log('Current Sepolia block number:', latestBlock.toString());

  // Check highest block in database
  const sql = postgres('postgresql://bridgeguard:bridgeguard@localhost:5433/bridgeguard');
  const [dbMax] = await sql`
    SELECT max(source_block_number) as max_block, max(created_at) as latest_created
    FROM messages
    WHERE source_chain_name = 'ethereum-sepolia' OR destination_chain_name = 'Ethereum Sepolia'
  `;
  console.log('Database highest Sepolia block indexed:', dbMax.max_block, 'at', dbMax.latest_created);

  // Check OnRamp events
  const onRampAddress = '0x8dcf17f298c881A547D91ca4aA3C2AD7568C6777';
  console.log('\nScanning recent CCIPMessageSent events on OnRamp:', onRampAddress);

  const eventAbi = parseAbiItem(
    'event CCIPMessageSent(bytes32 indexed messageId, uint64 indexed destinationChainSelector, (bytes receiver, bytes data, (address token, uint256 amount)[] tokenAmounts, address feeToken, bytes extraArgs) message, uint256 feeTokenAmount, uint64 sequenceNumber)'
  );

  // Scan last 500 blocks
  const fromBlock = latestBlock - 500n;
  const logs = await client.getLogs({
    address: onRampAddress,
    event: eventAbi,
    fromBlock,
    toBlock: latestBlock,
  });

  console.log(`Found ${logs.length} CCIPMessageSent logs between block ${fromBlock} and ${latestBlock}:`);
  for (const log of logs) {
    console.log({
      blockNumber: log.blockNumber.toString(),
      transactionHash: log.transactionHash,
      messageId: log.args.messageId,
      destinationChainSelector: log.args.destinationChainSelector?.toString(),
      sequenceNumber: log.args.sequenceNumber?.toString(),
    });
  }

  // Check known sender address
  const knownSender = '0x59bEC67e4C7F61a4BaDd7D3A9c1B1aab55AC33DA';
  const txCount = await client.getTransactionCount({ address: knownSender });
  console.log(`\nKnown sender address: ${knownSender}`);
  console.log(`Transaction count (nonce): ${txCount}`);

  await sql.end();
}

findLatest().catch(console.error);
