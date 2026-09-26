import { createPublicClient, http, parseAbi } from 'viem';
import { sepolia, arbitrumSepolia } from 'viem/chains';

const sepoliaClient = createPublicClient({ chain: sepolia, transport: http('https://ethereum-sepolia-rpc.publicnode.com') });
const arbSepoliaClient = createPublicClient({ chain: arbitrumSepolia, transport: http('https://sepolia-rollup.arbitrum.io/rpc') });

const sepoliaRouter = '0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59';
const arbSepoliaRouter = '0x2a9C5afB0d0e4BAb2BCdaE109EC4b0c4Be15a165';

const SEP_CHAIN_SELECTOR = 16015286601757825753n;
const ARB_SEP_CHAIN_SELECTOR = 3478487238524512106n;

const abi = [
  {
    type: 'function',
    name: 'getOnRamp',
    inputs: [{ name: 'destChainSelector', type: 'uint64' }],
    outputs: [{ name: 'onRamp', type: 'address' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'getOffRamps',
    inputs: [],
    outputs: [{
      type: 'tuple[]',
      components: [
        { name: 'sourceChainSelector', type: 'uint64' },
        { name: 'offRamp', type: 'address' }
      ]
    }],
    stateMutability: 'view'
  }
];

async function main() {
  try {
    const sepOnRamp = await sepoliaClient.readContract({ address: sepoliaRouter, abi, functionName: 'getOnRamp', args: [ARB_SEP_CHAIN_SELECTOR] });
    console.log('Sepolia OnRamp (to ArbSep):', sepOnRamp);
  } catch(e) { console.error('Error sep onRamp:', e.message); }

  try {
    const sepOffRamps = await sepoliaClient.readContract({ address: sepoliaRouter, abi, functionName: 'getOffRamps' });
    const sepOffRamp = sepOffRamps.find(x => x.sourceChainSelector === ARB_SEP_CHAIN_SELECTOR)?.offRamp;
    console.log('Sepolia OffRamp (from ArbSep):', sepOffRamp);
  } catch(e) { console.error('Error sep offRamp:', e.message); }

  try {
    const arbOnRamp = await arbSepoliaClient.readContract({ address: arbSepoliaRouter, abi, functionName: 'getOnRamp', args: [SEP_CHAIN_SELECTOR] });
    console.log('ArbSep OnRamp (to Sep):', arbOnRamp);
  } catch(e) { console.error('Error arb onRamp:', e.message); }

  try {
    const arbOffRamps = await arbSepoliaClient.readContract({ address: arbSepoliaRouter, abi, functionName: 'getOffRamps' });
    const arbOffRamp = arbOffRamps.find(x => x.sourceChainSelector === SEP_CHAIN_SELECTOR)?.offRamp;
    console.log('ArbSep OffRamp (from Sep):', arbOffRamp);
  } catch(e) { console.error('Error arb offRamp:', e.message); }
}

main();
