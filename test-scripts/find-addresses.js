import fs from 'fs';
import https from 'https';

function fetchRouter(url, name) {
  https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      // Find all matches of Router and surrounding text
      const matches = data.match(/.{0,50}Router.{0,100}/gi);
      if (matches) {
         console.log(`\n--- ${name} Matches ---`);
         matches.forEach(m => console.log(m));
      } else {
         console.log(`${name} router match not found`);
      }
    });
  });
}

fetchRouter('https://docs.chain.link/ccip/directory/testnet/chain/ethereum-testnet-sepolia-arbitrum-1', 'Arbitrum Sepolia');
fetchRouter('https://docs.chain.link/ccip/directory/testnet/chain/ethereum-testnet-sepolia', 'Ethereum Sepolia');
