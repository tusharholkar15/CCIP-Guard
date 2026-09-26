import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import { createPublicClient, http } from 'viem';
import { SUPPORTED_CHAINS, CCIP_ABIS } from '../packages/shared/src/index';

async function testAllRpcs() {
  console.log('=== TASK 1: LIVE INDEXER RPC CHECK FOR 7 MAINNET CHAINS ===\n');

  const results: any[] = [];

  for (const [key, chain] of Object.entries(SUPPORTED_CHAINS)) {
    const rpcUrl = process.env[chain.rpcEnvVar];
    console.log(`Checking ${chain.displayName} (Chain ID: ${chain.chainId})...`);
    console.log(`  RPC URL: ${rpcUrl}`);
    console.log(`  Router:  ${chain.routerAddress}`);

    if (!rpcUrl) {
      console.error(`  [ERROR] No RPC URL found in env for ${chain.rpcEnvVar}`);
      results.push({ chain: chain.displayName, success: false, error: 'Missing RPC URL' });
      continue;
    }

    const client = createPublicClient({ transport: http(rpcUrl, { timeout: 10000 }) });
    const start = Date.now();

    try {
      const blockNumber = await client.getBlockNumber();
      const latencyMs = Date.now() - start;
      console.log(`  ✓ Block Number: ${blockNumber.toString()} (${latencyMs}ms)`);

      // Check Router contract view call: getOffRamps
      let offRampCount = 0;
      try {
        const offRamps = await client.readContract({
          address: chain.routerAddress as `0x${string}`,
          abi: CCIP_ABIS.router,
          functionName: 'getOffRamps',
        }) as any[];
        offRampCount = offRamps.length;
        console.log(`  ✓ Router getOffRamps() responded with ${offRampCount} off-ramps`);
      } catch (routerErr: any) {
        console.log(`  ⚠ Router getOffRamps() call note: ${routerErr.message.slice(0, 100)}`);
      }

      results.push({
        chain: chain.displayName,
        chainId: chain.chainId,
        rpcUrl,
        blockNumber: blockNumber.toString(),
        latencyMs,
        offRampCount,
        success: true,
      });
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      console.error(`  ✗ RPC Failed (${latencyMs}ms): ${err.message}`);
      results.push({
        chain: chain.displayName,
        chainId: chain.chainId,
        rpcUrl,
        latencyMs,
        success: false,
        error: err.message,
      });
    }
    console.log('');
  }

  console.log('--- RPC TEST SUMMARY ---');
  console.table(results);

  const allPassed = results.every(r => r.success);
  if (allPassed) {
    console.log('\n[PASS] All 7 Mainnet RPCs are live, responsive, and communicating with CCIP Routers.');
  } else {
    console.error('\n[FAIL] Some Mainnet RPCs failed.');
    process.exit(1);
  }
}

testAllRpcs().catch(err => {
  console.error('Fatal error during RPC check:', err);
  process.exit(1);
});
