const fs = require('fs');
let c = fs.readFileSync('scratch/indexer_validation.ts', 'utf8');
c = c.replace(/await processNormalizedEvent\(event, config\.chainId\);/g, "await processNormalizedEvent(event, { resolveLane: async () => null, publishEvent: async () => {}, saveMessage: async () => {}, saveEvent: async () => {} });");
fs.writeFileSync('scratch/indexer_validation.ts', c);
