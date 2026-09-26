async function fetchRouters() {
  const chains = ['ethereum-mainnet', 'arbitrum-mainnet', 'optimism-mainnet', 'base-mainnet', 'polygon-mainnet', 'avalanche-mainnet', 'bnb-chain-mainnet'];
  for (const c of chains) {
    console.log(`Searching CCIP Router for ${c}...`);
    const res = await fetch(`https://raw.githubusercontent.com/smartcontractkit/documentation/main/src/config/data/ccip/mainnet.json`);
    const data = await res.json();
    console.log(data);
    break; // only need one fetch
  }
}
fetchRouters();
