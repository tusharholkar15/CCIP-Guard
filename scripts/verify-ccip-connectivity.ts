/**
 * BridgeGuard CCIP Connectivity Verification Script
 * 
 * Performs read-only checks against live Ethereum and Arbitrum Mainnet RPCs:
 * - Chain ID validation
 * - Latest block number
 * - RPC response latency
 * - Log query capability
 * - Router contract bytecode verification
 * - Lane support verification via Router.isChainSupported()
 * 
 * Usage: npx tsx scripts/verify-ccip-connectivity.ts
 * 
 * IMPORTANT: This script is READ-ONLY. No transactions are sent.
 */
import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { createPublicClient, http } from 'viem';
import { mainnet, arbitrum } from 'viem/chains';
import { SUPPORTED_CHAINS, CCIPRouterAbi } from '../packages/shared/src/index';

interface ChainCheckResult {
  name: string;
  chainId: { expected: number; actual: number | null; ok: boolean };
  latestBlock: bigint | null;
  rpcLatencyMs: number;
  routerAddress: string;
  routerBytecodeVerified: boolean;
  laneSupported: { chain: string; supported: boolean } | null;
  logQueryOk: boolean;
  status: 'HEALTHY' | 'DEGRADED' | 'UNREACHABLE';
  error: string | null;
}

async function checkChain(
  name: string,
  chain: typeof mainnet | typeof arbitrum,
  rpcUrl: string | undefined,
  chainConfig: typeof SUPPORTED_CHAINS.ETHEREUM,
  crossChainConfig: typeof SUPPORTED_CHAINS.ARBITRUM,
): Promise<ChainCheckResult> {
  const result: ChainCheckResult = {
    name,
    chainId: { expected: chainConfig.chainId, actual: null, ok: false },
    latestBlock: null,
    rpcLatencyMs: 0,
    routerAddress: chainConfig.routerAddress,
    routerBytecodeVerified: false,
    laneSupported: null,
    logQueryOk: false,
    status: 'UNREACHABLE',
    error: null,
  };

  if (!rpcUrl) {
    result.error = `RPC URL not configured (env: ${chainConfig.rpcEnvVar})`;
    return result;
  }

  const client = createPublicClient({ chain, transport: http(rpcUrl) });

  try {
    // 1. Chain ID check
    const startTime = Date.now();
    const actualChainId = await client.getChainId();
    result.rpcLatencyMs = Date.now() - startTime;
    result.chainId.actual = actualChainId;
    result.chainId.ok = actualChainId === chainConfig.chainId;

    // 2. Latest block
    result.latestBlock = await client.getBlockNumber();

    // 3. Log query test (empty range is fine)
    try {
      await client.getLogs({
        address: chainConfig.routerAddress,
        fromBlock: result.latestBlock,
        toBlock: result.latestBlock,
      });
      result.logQueryOk = true;
    } catch {
      result.logQueryOk = false;
    }

    // 4. Router bytecode verification
    const bytecode = await client.getBytecode({ address: chainConfig.routerAddress });
    result.routerBytecodeVerified = !!(bytecode && bytecode !== '0x' && bytecode.length > 2);

    // 5. Lane support check
    try {
      const isSupported = await client.readContract({
        address: chainConfig.routerAddress,
        abi: CCIPRouterAbi,
        functionName: 'isChainSupported',
        args: [crossChainConfig.chainSelector],
      });
      result.laneSupported = {
        chain: crossChainConfig.displayName,
        supported: isSupported as boolean,
      };
    } catch (err) {
      result.laneSupported = { chain: crossChainConfig.displayName, supported: false };
    }

    // Determine overall status
    if (result.chainId.ok && result.routerBytecodeVerified && result.logQueryOk) {
      result.status = 'HEALTHY';
    } else {
      result.status = 'DEGRADED';
    }
  } catch (err) {
    result.error = (err as Error).message;
    result.status = 'UNREACHABLE';
  }

  return result;
}

function formatResult(r: ChainCheckResult): string {
  const lines: string[] = [];
  lines.push(`  ${r.name}`);
  lines.push(`  ${'─'.repeat(Math.max(r.name.length, 20))}`);
  lines.push(`  Chain ID:     ${r.chainId.actual ?? 'N/A'} ${r.chainId.ok ? '✓' : '✗ (expected ' + r.chainId.expected + ')'}`);
  lines.push(`  Latest Block: ${r.latestBlock?.toLocaleString() ?? 'N/A'}`);
  lines.push(`  RPC Latency:  ${r.rpcLatencyMs}ms`);
  lines.push(`  Log Query:    ${r.logQueryOk ? 'OK ✓' : 'FAILED ✗'}`);
  lines.push(`  Router:       ${r.routerAddress.slice(0, 6)}...${r.routerAddress.slice(-3)} ${r.routerBytecodeVerified ? '(bytecode verified) ✓' : '(NOT VERIFIED) ✗'}`);
  if (r.laneSupported) {
    lines.push(`  Lane Support: ${r.laneSupported.chain} ${r.laneSupported.supported ? '✓' : '✗'}`);
  }
  lines.push(`  Status:       ${r.status} ${r.status === 'HEALTHY' ? '✓' : '✗'}`);
  if (r.error) {
    lines.push(`  Error:        ${r.error}`);
  }
  return lines.join('\n');
}

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  BridgeGuard CCIP Connectivity Report');
  console.log('═══════════════════════════════════════════');
  console.log();

  const ethResult = await checkChain(
    'Ethereum Mainnet',
    mainnet,
    process.env.ETHEREUM_RPC_URL,
    SUPPORTED_CHAINS.ETHEREUM,
    SUPPORTED_CHAINS.ARBITRUM,
  );
  console.log(formatResult(ethResult));
  console.log();

  const arbResult = await checkChain(
    'Arbitrum Mainnet',
    arbitrum,
    process.env.ARBITRUM_RPC_URL,
    SUPPORTED_CHAINS.ARBITRUM,
    SUPPORTED_CHAINS.ETHEREUM,
  );
  console.log(formatResult(arbResult));
  console.log();

  console.log('═══════════════════════════════════════════');

  const allHealthy = ethResult.status === 'HEALTHY' && arbResult.status === 'HEALTHY';
  console.log(`  Overall: ${allHealthy ? 'ALL CHAINS HEALTHY ✓' : 'ISSUES DETECTED ✗'}`);
  console.log('═══════════════════════════════════════════');

  process.exit(allHealthy ? 0 : 1);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
