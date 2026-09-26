import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });
import { createPublicClient, http, parseAbi } from 'viem';
import { sepolia } from 'viem/chains';

const routerAddress = '0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59';
const arbSepoliaSelector = 3478487238524512106n;

const routerAbi = parseAbi([
  'function getSupportedTokens(uint64 chainSelector) external view returns (address[])',
  'function isChainSupported(uint64 chainSelector) external view returns (bool)'
]);

async function main() {
  const client = createPublicClient({
    chain: sepolia,
    transport: http(process.env.SEPOLIA_RPC_URL),
  });

  console.log('Verifying Router code...');
  const code = await client.getBytecode({ address: routerAddress });
  if (code && code !== '0x') {
    console.log('Router code exists!');
  } else {
    console.log('Router code NOT FOUND!');
  }

  console.log(`Checking if chain ${arbSepoliaSelector} is supported...`);
  const isSupported = await client.readContract({
    address: routerAddress,
    abi: routerAbi,
    functionName: 'isChainSupported',
    args: [arbSepoliaSelector]
  });
  console.log(`Chain Supported: ${isSupported}`);

  const fee = await client.readContract({
    address: routerAddress,
    abi: parseAbi(['function getFee(uint64 destinationChainSelector, (bytes receiver, bytes data, (address token, uint256 amount)[] tokenAmounts, address feeToken, bytes extraArgs) message) external view returns (uint256)']),
    functionName: 'getFee',
    args: [arbSepoliaSelector, {
      receiver: '0x0000000000000000000000000000000000000000',
      data: '0x',
      tokenAmounts: [],
      feeToken: '0x0000000000000000000000000000000000000000',
      extraArgs: '0x97a657c90000000000000000000000000000000000000000000000000000000000030d40' // gasLimit: 200000
    }]
  });
  console.log(`Message-only Fee in wei: ${fee}`);
}

main().catch(console.error);
