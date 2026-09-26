import * as dotenv from 'dotenv';
import path from 'path';
import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';

dotenv.config({ path: path.resolve('./.env') });

async function findTxByBinarySearch() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
  const client = createPublicClient({ chain: sepolia, transport: http(rpcUrl) });
  const sender = '0x59bEC67e4C7F61a4BaDd7D3A9c1B1aab55AC33DA';

  let low = 11749366n;
  let high = await client.getBlockNumber();
  console.log(`Starting binary search for transaction from ${sender} between block ${low} and ${high}...`);

  const countLow = await client.getTransactionCount({ address: sender, blockNumber: low });
  const countHigh = await client.getTransactionCount({ address: sender, blockNumber: high });
  console.log(`Nonce at block ${low}: ${countLow}, Nonce at block ${high}: ${countHigh}`);

  if (countLow === countHigh) {
    console.log('No new transaction found in this range!');
    return;
  }

  // Find the exact block where getTransactionCount becomes 4
  while (low < high) {
    const mid = (low + high) / 2n;
    const countMid = await client.getTransactionCount({ address: sender, blockNumber: mid });
    if (countMid >= 4) {
      high = mid;
    } else {
      low = mid + 1n;
    }
  }

  console.log(`\n🎉 Found exact block for Nonce 3: Block ${low}`);

  // Fetch block with transactions
  const block = await client.getBlock({ blockNumber: low, includeTransactions: true });
  console.log(`Block ${low} has ${block.transactions.length} transactions.`);

  const targetTx = block.transactions.find(tx => typeof tx === 'object' && tx.from.toLowerCase() === sender.toLowerCase());

  if (targetTx && typeof targetTx === 'object') {
    console.log('\n=============================================');
    console.log('FOUND THE EXACT REAL TESTNET TRANSACTION:');
    console.log('=============================================');
    console.log('Transaction Hash:', targetTx.hash);
    console.log('From:', targetTx.from);
    console.log('To:', targetTx.to);
    console.log('Nonce:', targetTx.nonce);
    console.log('Value:', targetTx.value.toString());
    console.log('Block Number:', targetTx.blockNumber.toString());
    console.log('Input Data (first 100 chars):', targetTx.input.slice(0, 100));

    // Get receipt
    const receipt = await client.getTransactionReceipt({ hash: targetTx.hash });
    console.log('\nTransaction Receipt:');
    console.log('Status:', receipt.status);
    console.log('Gas Used:', receipt.gasUsed.toString());
    console.log('Logs count:', receipt.logs.length);

    console.log('\nLogs detail:');
    for (const l of receipt.logs) {
      console.log({
        address: l.address,
        topics: l.topics,
        data: l.data.slice(0, 66) + '...'
      });
    }
  } else {
    console.log('Transaction not found in block object; checking transactions array...');
    for (const t of block.transactions) {
      const h = typeof t === 'string' ? t : t.hash;
      const tx = await client.getTransaction({ hash: h });
      if (tx.from.toLowerCase() === sender.toLowerCase()) {
        console.log('Found matching transaction:', tx);
        break;
      }
    }
  }
}

findTxByBinarySearch().catch(console.error);
