const fs = require('fs');
let c = fs.readFileSync('scratch/indexer_validation.ts', 'utf8');
c = c.replace(
  /await processNormalizedEvent\(event, config\.chainId\);/g, 
  "await processNormalizedEvent(event, { resolveLane: async () => 'unknown', publishEvent: async () => {}, saveMessage: async (m) => { await require('@bridgeguard/database').db.insert(require('@bridgeguard/database').messages).values(m).onConflictDoUpdate({ target: require('@bridgeguard/database').messages.ccipMessageId, set: m }); }, saveEvent: async (e) => { await require('@bridgeguard/database').db.insert(require('@bridgeguard/database').ccipEvents).values(e).onConflictDoNothing(); } });"
);
fs.writeFileSync('scratch/indexer_validation.ts', c);
